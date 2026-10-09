#!/usr/bin/env python3
"""Fast, conservative, reviewed-Person title-mention matcher.

The matcher is intentionally separate from the legacy raw-name title parser.
It accepts exact registered multi-token names and carefully curated aliases,
and returns matches that remain traceable to one registered Person UUID.
"""
import collections
import re
import unicodedata

DISTINCTIVE_VERIFIED = frozenset({
    "beethoven", "mozart", "shakespeare", "van gogh",
    "confucius", "genghis khan", "yi sun-sin",
})
KOREAN_FOLLOW = (
    "장군", "대왕", "선생", "선생님", "황제", "왕", "님",
    "에게", "에서", "으로", "부터", "보다", "까지",
    "은", "는", "이", "가", "을", "를", "의", "에",
    "도", "와", "과", "만", "랑", "로",
)


def normalized(value):
    return unicodedata.normalize("NFKC", str(value or "")).casefold()


def is_hangul(char):
    return "\uac00" <= char <= "\ud7a3"


def admissible_boundary(title, start, end, alias):
    """Require token boundaries, or a narrowly enumerated Korean particle."""
    if start and (title[start - 1].isalnum() or title[start - 1] == "_"):
        return False
    if end == len(title):
        return True
    following = title[end]
    if not (following.isalnum() or following == "_"):
        return True
    if not alias or not is_hangul(alias[-1]):
        return False
    tail = title[end:]
    for suffix in KOREAN_FOLLOW:
        if tail.startswith(suffix):
            nxt = end + len(suffix)
            if nxt == len(title) or not is_hangul(title[nxt]):
                return True
    return False


class ReviewedMentionMatcher:
    """Aho-Corasick matcher: linear in normalized title length + hits."""

    def __init__(self, label_to_uuid):
        self.nodes = [{"next": {}, "fail": 0, "out": []}]
        for label, uuid in sorted(label_to_uuid.items()):
            if not label or not uuid:
                raise ValueError("INVALID_MENTION_ALIAS")
            index = 0
            for char in label:
                edges = self.nodes[index]["next"]
                if char not in edges:
                    edges[char] = len(self.nodes)
                    self.nodes.append({"next": {}, "fail": 0, "out": []})
                index = edges[char]
            self.nodes[index]["out"].append((label, uuid))
        queue = collections.deque()
        for child in self.nodes[0]["next"].values():
            queue.append(child)
        while queue:
            current = queue.popleft()
            parent_fail = self.nodes[current]["fail"]
            for char, child in self.nodes[current]["next"].items():
                fail = parent_fail
                while fail and char not in self.nodes[fail]["next"]:
                    fail = self.nodes[fail]["fail"]
                self.nodes[child]["fail"] = self.nodes[fail]["next"].get(char, 0)
                self.nodes[child]["out"].extend(self.nodes[self.nodes[child]["fail"]]["out"])
                queue.append(child)
        self.alias_count = len(label_to_uuid)

    def find(self, title):
        title = normalized(title)
        state = 0
        hits = set()
        for i, char in enumerate(title):
            while state and char not in self.nodes[state]["next"]:
                state = self.nodes[state]["fail"]
            state = self.nodes[state]["next"].get(char, 0)
            for alias, uuid in self.nodes[state]["out"]:
                if admissible_boundary(title, i + 1 - len(alias), i + 1, alias):
                    hits.add((alias, uuid))
        return hits


def build_matcher(resolved, verified, reviewed_aliases):
    """Do not infer an identity from an unregistered alias or a partial surname.

    - Reviewed multilingual aliases are exact UUID-anchored entries.
    - Verified long two-token names are included without fuzzy matching.
    - The short/surname exception is deliberately small and reviewed.
    - All ambiguous aliases were removed from 'resolved' upstream.
    """
    labels = {}
    for name in verified:
        label = normalized(name).strip()
        if (label in resolved and len(label) >= 9 and
                len(label.split()) >= 2 and
                sum(char.isalpha() for char in label) >= 7):
            labels[label] = resolved[label]
    for row in reviewed_aliases["aliases"]:
        label = normalized(row["alias"]).strip()
        if label in resolved and len(label) >= 2:
            labels[label] = resolved[label]
    for label in DISTINCTIVE_VERIFIED:
        if label in resolved and label in verified:
            labels[label] = resolved[label]
    if not labels:
        raise ValueError("NO_REVIEWED_MENTION_ALIASES")
    return ReviewedMentionMatcher(labels), labels
