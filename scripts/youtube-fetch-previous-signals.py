#!/usr/bin/env python3
"""Read the CURRENT public YouTube snapshot before publishing its successor.

Never substitutes a historical CSV for the active Production snapshot.
No credentials or database writes are needed.
"""
import argparse
import io
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


MAX_PAGE_BYTES = 512 * 1024
MAX_TOTAL_BYTES = 8 * 1024 * 1024
MAX_SIGNAL_ROWS = 20000


def get_json(endpoint, offset, page_size=1000, retries=2):
    url = endpoint + ("&" if "?" in endpoint else "?") + urllib.parse.urlencode(
        {"min_channels": 3, "limit": page_size, "offset": offset}
    )
    for attempt in range(retries):
        try:
            req = urllib.request.Request(
                url, headers={"Accept": "application/json", "User-Agent": "ATLAS-Youtube-Incremental-Audit/1.0"}
            )
            with urllib.request.urlopen(req, timeout=30) as response:
                raw = response.read(MAX_PAGE_BYTES + 1)
                if len(raw) > MAX_PAGE_BYTES:
                    raise RuntimeError("YOUTUBE_PREVIOUS_PAGE_BYTE_BUDGET_EXCEEDED")
                data = json.loads(raw)
            if data.get("ok") is not True or data.get("available") is not True:
                raise RuntimeError("ACTIVE_SNAPSHOT_NOT_AVAILABLE")
            return data
        except urllib.error.HTTPError as exc:
            if exc.code in (402, 401, 403, 429):
                raise RuntimeError(f"YOUTUBE_PREVIOUS_ENDPOINT_BLOCKED_HTTP_{exc.code}") from exc
            if attempt + 1 == retries:
                raise
            time.sleep(min(2**attempt, 6))
        except RuntimeError:
            raise
        except (urllib.error.URLError, TimeoutError, ValueError):
            if attempt + 1 == retries:
                raise
            time.sleep(min(2**attempt, 6))


def fetch_previous(endpoint):
    first = get_json(endpoint, 0)
    snapshot = first.get("snapshot") or {}
    snapshot_id = snapshot.get("snapshot_id")
    expected = first.get("stored_count")
    if not snapshot_id or not isinstance(expected, int) or expected < 1:
        raise RuntimeError("INVALID_ACTIVE_SNAPSHOT")
    if expected > MAX_SIGNAL_ROWS:
        raise RuntimeError("YOUTUBE_PREVIOUS_TOO_MANY_ROWS")
    page = 1000
    rows = []
    for offset in range(0, expected, page):
        data = first if offset == 0 else get_json(endpoint, offset, page)
        if data.get("snapshot", {}).get("snapshot_id") != snapshot_id:
            raise RuntimeError("SNAPSHOT_CHANGED_DURING_AUDIT")
        if data.get("stored_count") != expected or data.get("offset", offset) != offset:
            raise RuntimeError("INCONSISTENT_PAGINATION")
        chunk = data.get("rows")
        if not isinstance(chunk, list) or len(chunk) != min(page, expected-offset):
            raise RuntimeError("MISSING_SNAPSHOT_ROWS")
        rows.extend(chunk)
    if len(rows) != expected:
        raise RuntimeError("INCOMPLETE_SNAPSHOT")
    if any(item.get("rank") != i for i, item in enumerate(rows, 1)):
        raise RuntimeError("NONCONTIGUOUS_SNAPSHOT_RANKS")
    return {"snapshot": snapshot, "rows": rows, "stored_count": expected}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--endpoint", required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    previous = fetch_previous(args.endpoint)
    dest = Path(args.output)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(previous, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({
        "previous_snapshot": previous["snapshot"]["snapshot_id"],
        "rows": len(previous["rows"]),
        "output": str(dest),
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
