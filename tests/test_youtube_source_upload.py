import importlib.util
import tempfile
import unittest
import urllib.error
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("uploader", ROOT / "scripts/youtube-preserve-verified-corpus.py")
uploader = importlib.util.module_from_spec(spec)
spec.loader.exec_module(uploader)


class VerifiedUploadTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.file = self.root / "batch008" / "videos" / "UC1.ndjson.gz"
        self.file.parent.mkdir(parents=True)
        self.file.write_bytes(b"example durable video bytes")

    def test_existing_object_reuses_without_overwrite(self):
        calls = []
        def remote(method, base, token, key, data=None):
            calls.append(method)
            return self.file.read_bytes()
        with patch.object(uploader, "call", side_effect=remote):
            item = uploader.upload_and_verify("https://example.invalid", "token", self.file, self.root)
        self.assertEqual(calls, ["GET"])
        self.assertEqual(item["source_kind"], "channel_videos")
        self.assertEqual(item["byte_count"], len(self.file.read_bytes()))

    def test_missing_object_uploads_then_verifies(self):
        calls = []
        def remote(method, base, token, key, data=None):
            calls.append(method)
            if method == "GET" and len(calls) == 1:
                raise urllib.error.HTTPError("https://example.invalid", 404, "Not found", {}, None)
            if method == "POST":
                self.assertEqual(data, self.file.read_bytes())
                return b""
            return self.file.read_bytes()
        with patch.object(uploader, "call", side_effect=remote):
            uploader.upload_and_verify("https://example.invalid", "token", self.file, self.root)
        self.assertEqual(calls, ["GET", "POST", "GET"])

    def test_remote_byte_corruption_fails_closed(self):
        with patch.object(uploader, "call", return_value=b"mismatched"):
            with self.assertRaisesRegex(RuntimeError, "SOURCE_ROUNDTRIP_CHECKSUM_MISMATCH"):
                uploader.upload_and_verify("https://example.invalid", "token", self.file, self.root)

    def test_unexpected_remote_failure_never_posts(self):
        with patch.object(uploader, "call", side_effect=urllib.error.HTTPError(
            "https://example.invalid", 403, "Denied", {}, None)) as mocked:
            with self.assertRaises(urllib.error.HTTPError):
                uploader.upload_and_verify("https://example.invalid", "token", self.file, self.root)
        self.assertEqual(mocked.call_count, 1)


if __name__ == "__main__":
    unittest.main()
