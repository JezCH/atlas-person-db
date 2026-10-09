#!/usr/bin/env python3
"""Safeguard Production YouTube reads against quota failure and oversized pages."""
import importlib.util
import io
import json
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("fetch_previous", Path(__file__).resolve().parents[1] / "scripts/youtube-fetch-previous-signals.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

class Response:
    def __init__(self, payload):
        self.content = io.BytesIO(payload)
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self, count): return self.content.read(count)

class QuotaReadBudgetTests(unittest.TestCase):
    def test_402_is_terminal_no_retry(self):
        error = urllib.error.HTTPError("https://example.test", 402, "Payment Required", {}, None)
        with patch.object(module.urllib.request, "urlopen", side_effect=error) as fetch:
            with self.assertRaisesRegex(RuntimeError, "BLOCKED_HTTP_402"):
                module.get_json("https://example.test", 0)
            self.assertEqual(fetch.call_count, 1)

    def test_oversized_page_fails_closed(self):
        with patch.object(module.urllib.request, "urlopen", return_value=Response(b"x" * (module.MAX_PAGE_BYTES + 1))):
            with self.assertRaisesRegex(RuntimeError, "PAGE_BYTE_BUDGET"):
                module.get_json("https://example.test", 0)

    def test_normal_page_parses(self):
        with patch.object(module.urllib.request, "urlopen", return_value=Response(json.dumps({"ok":True,"available":True,"rows":[]}).encode())):
            self.assertTrue(module.get_json("https://example.test", 0)["ok"])

if __name__ == "__main__":
    unittest.main()
