/* Audit immutable ATLAS normalized Source URL reuse without touching a database.
 * Input: raw/full-census JSON from the approved P2-10 read-only artifact.
 * URL equality is only a review lead, never an instruction to merge Source UUIDs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROUTES = Object.freeze([
  ['activity_sources', 'activity_id'],
  ['polity_sources', 'polity_id'],
  ['designation_sources', 'designation_id'],
  ['governance_sources', 'governance_id']
]);

export function auditSharedSourceUrls(snapshot) {
  const raw = snapshot?.raw || snapshot;
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.sources) ||
      !ROUTES.every(([name]) => Array.isArray(raw[name]))) {
    throw new Error('SOURCE_URL_AUDIT_INCOMPLETE_SNAPSHOT');
  }
  const byId = new Map(), byUrl = new Map(), references = new Map(), sourceKeys = new Set();
  for (const source of raw.sources) {
    if (!source || typeof source.id !== 'string' || !source.id ||
        typeof source.source_key !== 'string' || !source.source_key ||
        byId.has(source.id)) throw new Error('SOURCE_URL_AUDIT_INVALID_SOURCE_ID');
    if (typeof source.title !== 'string' || !source.title.trim() ||
        typeof source.source_type !== 'string' || !source.source_type.trim()) {
      throw new Error('SOURCE_URL_AUDIT_INVALID_SOURCE_BIBLIOGRAPHY');
    }
    if (sourceKeys.has(source.source_key)) throw new Error('SOURCE_URL_AUDIT_DUPLICATE_SOURCE_KEY');
    sourceKeys.add(source.source_key);
    byId.set(source.id, source);
    references.set(source.id, []);
    const url = source.canonical_url;
    if (typeof url !== 'string' || !url.trim()) continue;
    if (!byUrl.has(url)) byUrl.set(url, []);
    byUrl.get(url).push(source);
  }
  // Immutable P2-10 census Source rows do not store citation_text, but its
  // Runtime Activity provenance snapshots DO. Recover only the exact
  // (Activity UUID, Source UUID) pair; never synthesize a Source-wide claim.
  // If optional Runtime evidence is supplied, require its linkage to be
  // complete and identical to the normalized Source census.
  const runtimeProvenance = new Map();
  const hasRuntimeProvenance = raw.runtime_activities != null;
  if (hasRuntimeProvenance) {
    if (!Array.isArray(raw.runtime_activities)) throw new Error('SOURCE_URL_AUDIT_INVALID_RUNTIME_EVIDENCE');
    const seenActivities = new Set();
    for (const wrapped of raw.runtime_activities) {
      const activity = wrapped?.activity;
      const id = activity?.id;
      const citations = activity?.provenance_snapshot?.normalized_sources;
      if (typeof id !== 'string' || !id || seenActivities.has(id) || !Array.isArray(citations)) {
        throw new Error('SOURCE_URL_AUDIT_INVALID_RUNTIME_EVIDENCE');
      }
      seenActivities.add(id);
      for (const citation of citations) {
        if (typeof citation?.source_id !== 'string' || !citation.source_id) {
          throw new Error('SOURCE_URL_AUDIT_INVALID_RUNTIME_EVIDENCE');
        }
        const key = id + '\0' + citation.source_id;
        if (runtimeProvenance.has(key)) throw new Error('SOURCE_URL_AUDIT_DUPLICATE_RUNTIME_CITATION');
        runtimeProvenance.set(key, citation);
      }
    }
  }
  const activitySourceLinks = new Set();
  for (const [table, parentKey] of ROUTES) {
    for (const row of raw[table]) {
      if (!byId.has(row?.source_id)) throw new Error('SOURCE_URL_AUDIT_DANGLING_SOURCE');
      if (typeof row[parentKey] !== 'string' || !row[parentKey]) {
        throw new Error('SOURCE_URL_AUDIT_INCOMPLETE_REFERENCE');
      }
      const locator = row.source_locator_key == null ? null : String(row.source_locator_key);
      let citation = null;
      if (table === 'activity_sources') {
        const key = row[parentKey] + '\0' + row.source_id;
        if (activitySourceLinks.has(key)) throw new Error('SOURCE_URL_AUDIT_DUPLICATE_ACTIVITY_SOURCE_LINK');
        activitySourceLinks.add(key);
        if (hasRuntimeProvenance) citation = runtimeProvenance.get(key);
        const source = byId.get(row.source_id);
        if (hasRuntimeProvenance && (!citation ||
            citation.source_key !== source.source_key ||
            citation.title !== source.title ||
            citation.source_type !== source.source_type ||
            citation.canonical_url !== source.canonical_url ||
            (citation.source_locator_key == null ? null : String(citation.source_locator_key)) !== locator)) {
          throw new Error('SOURCE_URL_AUDIT_RUNTIME_LINK_PROVENANCE_MISMATCH');
        }
      }
      references.get(row.source_id).push({
        table, parent_id: row[parentKey], source_locator_key: locator,
        ...(typeof citation?.citation_text === 'string' && { citation_text: citation.citation_text })
      });
    }
  }
  if (hasRuntimeProvenance && activitySourceLinks.size !== runtimeProvenance.size) {
    throw new Error('SOURCE_URL_AUDIT_UNMATCHED_RUNTIME_CITATION');
  }
  const cases = [...byUrl].filter(([, sources]) => sources.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([canonical_url, items]) => {
      const sources = items.map(item => ({
        id: item.id,
        source_key: item.source_key,
        source_type: item.source_type,
        title: item.title,
        external_identifier: item.external_identifier == null ? null : item.external_identifier,
        ...(typeof item.citation_text === 'string' && { citation_text: item.citation_text }),
        references: references.get(item.id)
      })).sort((a, b) => a.id.localeCompare(b.id));
      const titles = [...new Set(sources.map(x => x.title))].sort();
      const types = [...new Set(sources.map(x => x.source_type))].sort();
      const byActivity = new Map();
      for (const s of sources) for (const ref of s.references) {
        if (ref.table !== 'activity_sources') continue;
        if (!byActivity.has(ref.parent_id)) byActivity.set(ref.parent_id, new Set());
        byActivity.get(ref.parent_id).add(s.id);
      }
      const same_activity_source_collisions = [...byActivity]
        .filter(([, ids]) => ids.size > 1)
        .map(([activity_id, ids]) => {
          const source_ids = [...ids].sort();
          const citations = source_ids.map(source_id => sources.find(x => x.id === source_id)
            ?.references.find(ref => ref.table === 'activity_sources' && ref.parent_id === activity_id)?.citation_text);
          const allPresent = citations.every(value => typeof value === 'string' && value.trim().length);
          return { activity_id, source_ids,
            citation_comparison: !allPresent ? 'EVIDENCE_UNAVAILABLE'
              : new Set(citations).size > 1 ? 'DISTINCT_ASSERTION_CITATIONS'
                : 'IDENTICAL_ASSERTION_CITATIONS'
          };
        })
        .sort((a, b) => a.activity_id.localeCompare(b.activity_id));
      return {
        canonical_url, source_count: sources.length,
        title_variants: titles, type_variants: types,
        review_priority: same_activity_source_collisions.length
          ? 'SAME_ACTIVITY_MULTIPLE_SOURCE_UUIDS'
          : titles.length > 1 || types.length > 1
            ? 'BIBLIOGRAPHIC_METADATA_VARIATION'
            : 'ACTIVITY_SCOPED_REUSE',
        same_activity_source_collisions,
        sources, safe_to_merge: false, mutation_authorized: false,
        review_state: 'REVIEW_REQUIRED'
      };
    });
  const all = cases.flatMap(c => c.sources);
  return {
    schema: 'atlas-source-url-semantic-audit/v1',
    scope: 'historical immutable Production read-only census; current live state not reconfirmed',
    production_mutation_authorized: false, operations: [],
    summary: {
      shared_url_groups: cases.length,
      source_uuid_rows: all.length,
      excess_over_url_uniqueness: all.length - cases.length,
      title_variant_groups: cases.filter(c => c.title_variants.length > 1).length,
      type_variant_groups: cases.filter(c => c.type_variants.length > 1).length,
      same_activity_source_groups: cases.filter(c => c.same_activity_source_collisions.length).length,
      same_activity_source_collisions: cases.reduce((n, c) => n + c.same_activity_source_collisions.length, 0),
      human_authoring_source_rows: all.filter(s => s.source_key.startsWith('human-authoring:')).length,
      activity_source_links: all.reduce((n, s) => n + s.references.filter(r => r.table === 'activity_sources').length, 0),
      activity_source_links_with_citations: all.reduce((n, s) => n + s.references.filter(r => r.table === 'activity_sources' && typeof r.citation_text === 'string' && r.citation_text.trim().length).length, 0),
      same_activity_distinct_citation_collisions: cases.reduce((n,c)=>n+c.same_activity_source_collisions.filter(x=>x.citation_comparison==='DISTINCT_ASSERTION_CITATIONS').length,0),
      designation_source_links: all.reduce((n, s) => n + s.references.filter(r => r.table === 'designation_sources').length, 0)
    },
    limitations: [
      'Source rows may omit citation_text. If immutable Runtime provenance is supplied, citations are recovered per exact Activity–Source link, not as global Source assertions.',
      'Same URL/title/type or same Activity cannot by itself establish Source identity equivalence.',
      'No canonical Source UUID can be deleted, merged or rebound by this report.'
    ],
    cases
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length !== 4 || args[0] !== '--input' || args[2] !== '--output') {
      throw new Error('usage: node scripts/atlas-source-url-semantic-audit.mjs --input full-census.json --output audit.json');
    }
    const input = JSON.parse(fs.readFileSync(args[1], 'utf8'));
    const result = auditSharedSourceUrls(input);
    fs.writeFileSync(args[3], JSON.stringify(result, null, 2) + '\n', {flag: 'wx'});
    process.stdout.write(JSON.stringify(result.summary) + '\n');
  } catch (error) {
    process.stderr.write(String(error?.message || error) + '\n');
    process.exitCode = 1;
  }
}


