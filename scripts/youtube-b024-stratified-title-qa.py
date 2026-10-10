#!/usr/bin/env python3
"""Reproduce a title-only semantic QA sample from original YouTube Channel/Video IDs.

This is a *title interpretation* audit, not independent review of video content,
not a certified person-focused population count, and not a published ranking.
"""
import argparse
import collections
import gzip
import hashlib
import json
import re
import unicodedata
import zipfile
from pathlib import Path


def syntax_bucket(title, labels):
    """Keep the exact parser rules used when the original 107 IDs were sampled."""
    for label in labels:
        pat = re.compile(r'(?<!\w)' + r'\s+'.join(re.escape(w) for w in label.split()) + r'(?!\w)', re.I)
        matched = pat.search(title)
        if not matched:
            continue
        prefix = title[:matched.start()].strip().casefold()
        suffix = title[matched.end():].strip().casefold()
        if not prefix or re.fullmatch(r'(?:the|a)\s*', prefix):
            return 'NAME_HEADING_REVIEW'
        latin = ''.join(c for c in unicodedata.normalize('NFKD', prefix) if not unicodedata.combining(c))
        if re.search(r'(?:(?:the|a|full|complete|short|brief|untold|tragic|true)\s+){0,3}(?:life|biography|documentary|story|death|assassination|legacy|rise|fall|reign|life and times)\s+(?:of|about)\s*$', latin):
            return 'BIOGRAPHICAL_SYNTAX_REVIEW'
        if re.search(r'(?:biografia|biographie|biography|biografie|histoire|historia|history|la vie|la vida|a vida|das leben|vita)\s+(?:of|de|di|du|del|von|about)\s*$', latin):
            return 'MULTILINGUAL_BIOGRAPHY_CUE_REVIEW'
        if re.search(r'(?:extra history|historical profile|person biography|biografia|biographie)\s*:\s*$', latin):
            return 'SERIES_PERSON_SUBJECT_REVIEW'
        if re.search(r'\b(?:who\s+(?:was|is)|why\s+(?:did|was|is)|how\s+(?:did|was|is)|what\s+happened\s+to)\s*$', prefix):
            return 'PERSON_QUESTION_SYNTAX_REVIEW'
        if suffix.startswith(('biography','documentary','life story','the story','explained')):
            return 'POST_NAME_TOPIC_SYNTAX_REVIEW'
    return 'TITLE_MENTION_ONLY_REVIEW'


def source_historical_groups(alias):
    if alias['schema'] == 'youtube-source-wide-normalization-collision-original-id-audit/v1':
        return {
            r['normalization_key']: {
                'labels': r['labels'], 'channels': r['channel_ids'], 'videos': r['video_ids']
            }
            for r in alias['rows'] if r['triage_disposition'] == 'SAME_PERSON_HISTORICAL_NAME_FORM'
        }
    if alias['schema'] == 'youtube-b024-normalized-original-id-review/v1':
        return {
            r['normalization_key']: {
                'labels': r['labels'], 'channels': r['union_original_channel_ids'],
                'videos': r['union_original_video_ids']
            }
            for r in alias['rows'] if r['review_disposition'] == 'SAME_PERSON_HISTORICAL_NAME_FORM'
        }
    raise ValueError('unsupported original-ID alias evidence schema')


def analyze(original_zip, alias, key, *, verify_sha=True):
    if verify_sha:
        with Path(original_zip).open('rb') as reader:
            digest = hashlib.file_digest(reader, 'sha256').hexdigest()
        if digest != key['source_zip_sha256']:
            raise ValueError('original-source SHA256 mismatch')
    groups = source_historical_groups(alias)
    if len(groups) != key['source_name_group_count']:
        raise ValueError('historical name-group count changed')
    index = collections.defaultdict(set)
    membership = {}
    for name, row in groups.items():
        membership[name] = set(row['channels'])
        for video_id in row['videos']:
            index[video_id].add(name)
    strata = {name: {'HEADING': [], 'MENTION': [], 'OTHER': []} for name in groups}
    population = collections.Counter()
    channels = set()
    source_video_rows = 0
    with zipfile.ZipFile(original_zip) as archive:
        for path in sorted(n for n in archive.namelist() if n.endswith('.ndjson.gz')):
            channel = Path(path).name.removesuffix('.ndjson.gz')
            if not channel or channel in channels:
                raise ValueError('duplicate or empty original channel ID')
            channels.add(channel)
            with gzip.open(archive.open(path), 'rt', encoding='utf-8') as f:
                for line in f:
                    source_video_rows += 1
                    row = json.loads(line)
                    video_id = str(row.get('video_id') or '')
                    matched_names = [name for name in index.get(video_id, ())
                                     if channel in membership[name]]
                    if not matched_names:
                        continue
                    title = str(row.get('title') or '')
                    for name in matched_names:
                        category = syntax_bucket(title, groups[name]['labels'])
                        stratum = ('HEADING' if category == 'NAME_HEADING_REVIEW'
                                   else 'MENTION' if category == 'TITLE_MENTION_ONLY_REVIEW'
                                   else 'OTHER')
                        h = hashlib.sha256(
                            f"{key['seed']}|{name}|{stratum}|{video_id}".encode()
                        ).hexdigest()
                        strata[name][stratum].append({
                            '_hash': h, 'normalized_key': name, 'stratum': stratum,
                            'parser_bucket': category, 'channel_id': channel,
                            'video_id': video_id, 'title': title,
                        })
                        population[(name, stratum)] += 1
    if (len(channels), source_video_rows) != (
        key['source_channel_count'], key['source_video_count']
    ):
        raise ValueError('original-source channel/video population mismatch')
    sample = []
    for name, by_stratum in strata.items():
        for stratum, evidence in by_stratum.items():
            evidence.sort(key=lambda r: r['_hash'])
            sample.extend({k: v for k, v in row.items() if k != '_hash'}
                          for row in evidence[:2])
    sample.sort(key=lambda r: (r['normalized_key'], r['stratum'], r['video_id']))
    identity = '\n'.join(
        f"{r['normalized_key']}|{r['stratum']}|{r['video_id']}" for r in sample
    )
    if (len(sample) != key['expected_sample_rows'] or
        hashlib.sha256(identity.encode()).hexdigest() != key['expected_sample_identity_sha256']):
        raise ValueError('reviewed sample fingerprint mismatch; stale labels cannot be reused')

    review = key['explicit_overrides']
    if set(review) - {r['video_id'] for r in sample}:
        raise ValueError('review overlay contains video IDs outside locked sample')
    decisions = collections.Counter()
    by_stratum = collections.defaultdict(collections.Counter)
    for row in sample:
        original = review.get(row['video_id'])
        label = original['label'] if original else key['default_review_label']
        row['title_only_semantic_review'] = label
        row['review_note'] = original['note'] if original else (
            'Analyst reading: title implies individual life, ideas or historical deeds'
        )
        decisions[label] += 1
        by_stratum[row['stratum']][label] += 1
    if dict(decisions) != key['expected_review_counts']:
        raise ValueError('semantic review outcome changed without review revision')
    return {
        'schema': 'youtube-b024-stratified-title-only-qa/v1',
        'source_sha256': key['source_zip_sha256'],
        'original_channels': len(channels), 'original_videos': source_video_rows,
        'source_historical_name_groups': len(groups),
        'selection_seed': key['seed'], 'sample_size': len(sample),
        'category_population': [
            {'name_key': name, 'stratum': s, 'title_mention_video_rows': population[(name, s)]}
            for name in sorted(groups) for s in ('HEADING', 'MENTION', 'OTHER')
        ],
        'review_counts': dict(decisions),
        'review_by_stratum': {s: dict(c) for s, c in by_stratum.items()},
        'publication_eligible': False,
        'reviewer_scope': 'AI analyst title-only judgment, not watched video ground truth',
        'sampling_scope': '18 source-selected historical name-form groups, equal stratum quotas; not representative of all 2.23m video titles',
        'sample': sample
    }


def main():
    p = argparse.ArgumentParser(description=__doc__)
    for field in ('source-zip', 'alias-json', 'review-key', 'output'):
        p.add_argument('--' + field, required=True)
    a = p.parse_args()
    aliases = json.loads(Path(a.alias_json).read_text(encoding='utf-8'))
    key = json.loads(Path(a.review_key).read_text(encoding='utf-8'))
    result = analyze(a.source_zip, aliases, key)
    Path(a.output).write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({k: v for k, v in result.items() if k not in ('sample', 'category_population')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
