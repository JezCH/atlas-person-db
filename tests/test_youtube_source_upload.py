import gzip
import importlib.util
import tempfile
import unittest
import urllib.error
import urllib.parse
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/youtube-preserve-verified-corpus.py"
spec = importlib.util.spec_from_file_location("uploader", SCRIPT)
uploader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(uploader)


class VerifiedUploadTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.file = self.root / "out" / "batch008" / "videos" / "UC1.ndjson.gz"
        self.file.parent.mkdir(parents=True)
        self.file.write_bytes(gzip.compress(b'{"video_id":"v1"}\n{"video_id":"v2"}\n'))
        self.catalog_rows = {}

    def catalog(self, method, base, token, query="", data=None):
        if method == "GET":
            parsed = urllib.parse.parse_qs(query)
            key = parsed["object_key"][0].removeprefix("eq.")
            return [self.catalog_rows[key]] if key in self.catalog_rows else []
        if method == "POST":
            self.catalog_rows[data["object_key"]] = dict(data)
            return [dict(data)]
        raise AssertionError(method)

    def test_existing_object_reuses_without_overwrite_and_catalog_reuses(self):
        record = uploader.record_for(self.file, self.root)
        contents = record.pop("_contents")
        self.catalog_rows[record["object_key"]] = uploader.public_record(record)
        calls = []

        def remote(method, base, token, key, data=None):
            calls.append(method)
            return contents

        with patch.object(uploader, "storage_call", side_effect=remote), patch.object(
            uploader, "catalog_call", side_effect=self.catalog
        ):
            item = uploader.upload_and_verify("https://example.invalid", "token", self.file, self.root)
        self.assertEqual(calls, ["GET"])
        self.assertEqual(item["source_kind"], "channel_videos")
        self.assertEqual(item["video_rows"], 2)
        self.assertEqual(item["catalog_state"], "existing")
        self.assertFalse(item["new_object"])

    def test_missing_object_uploads_then_verifies_and_catalogs(self):
        stored = {}
        calls = []

        def remote(method, base, token, key, data=None):
            calls.append(method)
            if method == "GET" and key not in stored:
                raise urllib.error.HTTPError("https://example.invalid", 404, "Not found", {}, None)
            if method == "POST":
                stored[key] = data
                return b""
            return stored[key]

        with patch.object(uploader, "storage_call", side_effect=remote), patch.object(
            uploader, "catalog_call", side_effect=self.catalog
        ):
            item = uploader.upload_and_verify("https://example.invalid", "token", self.file, self.root)
        self.assertEqual(calls, ["GET", "POST", "GET"])
        self.assertTrue(item["new_object"])
        self.assertEqual(item["catalog_state"], "inserted")
        self.assertEqual(len(self.catalog_rows), 1)

    def test_remote_byte_corruption_fails_closed_before_catalog(self):
        with patch.object(uploader, "storage_call", return_value=b"mismatched"), patch.object(
            uploader, "catalog_call"
        ) as catalog:
            with self.assertRaisesRegex(RuntimeError, "SOURCE_ROUNDTRIP_CHECKSUM_MISMATCH"):
                uploader.upload_and_verify("https://example.invalid", "token", self.file, self.root)
        catalog.assert_not_called()

    def test_unexpected_remote_failure_never_posts(self):
        with patch.object(
            uploader,
            "storage_call",
            side_effect=urllib.error.HTTPError("https://example.invalid", 403, "Denied", {}, None),
        ) as mocked, patch.object(uploader, "catalog_call") as catalog:
            with self.assertRaises(urllib.error.HTTPError):
                uploader.upload_and_verify("https://example.invalid", "token", self.file, self.root)
        self.assertEqual(mocked.call_count, 1)
        catalog.assert_not_called()

    def test_catalog_mismatch_fails_closed(self):
        record = uploader.record_for(self.file, self.root)
        contents = record.pop("_contents")
        row = uploader.public_record(record)
        row["byte_count"] += 1
        self.catalog_rows[record["object_key"]] = row
        with patch.object(uploader, "storage_call", return_value=contents), patch.object(
            uploader, "catalog_call", side_effect=self.catalog
        ):
            with self.assertRaisesRegex(RuntimeError, "SOURCE_CATALOG_MISMATCH"):
                uploader.upload_and_verify("https://example.invalid", "token", self.file, self.root)

    def test_non_source_metadata_is_preserved_but_not_cataloged(self):
        metadata = self.root / "recollection-summary.json"
        metadata.write_text("{}", encoding="utf-8")
        with patch.object(uploader, "storage_call", return_value=metadata.read_bytes()), patch.object(
            uploader, "catalog_call"
        ) as catalog:
            item = uploader.upload_and_verify("https://example.invalid", "token", metadata, self.root)
        self.assertEqual(item["source_kind"], "metadata")
        self.assertEqual(item["catalog_state"], "not_applicable")
        catalog.assert_not_called()

    def test_restore_rehydrates_exact_paths_and_hashes(self):
        record = uploader.record_for(self.file, self.root)
        contents = record.pop("_contents")
        target = self.root / "restore"
        with patch.object(uploader, "storage_call", return_value=contents):
            result = uploader.restore_remote("https://example.invalid", "token", [record], target)
        self.assertEqual(result["files"], 1)
        self.assertEqual(result["bytes"], len(contents))
        self.assertEqual((target / record["source_path"]).read_bytes(), contents)


if __name__ == "__main__":
    unittest.main()
