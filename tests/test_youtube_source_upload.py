import gzip
import importlib.util
import tempfile
import unittest
import urllib.error
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

    def test_missing_bucket_is_created_private_and_read_back(self):
        calls = []

        def bucket(method, base, token, data=None):
            calls.append((method, data))
            if method == "GET" and len(calls) == 1:
                raise urllib.error.HTTPError("https://example.invalid", 404, "Not found", {}, None)
            if method == "POST":
                return {}
            return {"id": uploader.BUCKET, "name": uploader.BUCKET, "public": False}

        with patch.object(uploader, "bucket_call", side_effect=bucket):
            result = uploader.ensure_private_bucket("https://example.invalid", "token")
        self.assertEqual(result["id"], uploader.BUCKET)
        self.assertEqual([item[0] for item in calls], ["GET", "POST", "GET"])
        self.assertEqual(calls[1][1]["public"], False)

    def test_public_bucket_is_rejected(self):
        with patch.object(
            uploader, "bucket_call",
            return_value={"id": uploader.BUCKET, "name": uploader.BUCKET, "public": True},
        ):
            with self.assertRaisesRegex(RuntimeError, "SOURCE_BUCKET_NOT_PRIVATE"):
                uploader.ensure_private_bucket("https://example.invalid", "token")

    def test_existing_object_reuses_without_overwrite(self):
        record = uploader.record_for(self.file, self.root)
        contents = record.pop("_contents")
        calls = []

        def remote(method, base, token, key, data=None):
            calls.append(method)
            return contents

        with patch.object(uploader, "storage_call", side_effect=remote):
            item = uploader.upload_and_verify("https://example.invalid", "token", self.file, self.root)
        self.assertEqual(calls, ["GET"])
        self.assertEqual(item["source_kind"], "channel_videos")
        self.assertEqual(item["video_rows"], 2)
        self.assertFalse(item["new_object"])

    def test_missing_object_uploads_then_verifies(self):
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

        with patch.object(uploader, "storage_call", side_effect=remote):
            item = uploader.upload_and_verify("https://example.invalid", "token", self.file, self.root)
        self.assertEqual(calls, ["GET", "POST", "GET"])
        self.assertTrue(item["new_object"])

    def test_remote_byte_corruption_fails_closed(self):
        with patch.object(uploader, "storage_call", return_value=b"mismatched"):
            with self.assertRaisesRegex(RuntimeError, "SOURCE_ROUNDTRIP_CHECKSUM_MISMATCH"):
                uploader.upload_and_verify("https://example.invalid", "token", self.file, self.root)

    def test_unexpected_remote_failure_never_posts(self):
        with patch.object(
            uploader,
            "storage_call",
            side_effect=urllib.error.HTTPError("https://example.invalid", 403, "Denied", {}, None),
        ) as mocked:
            with self.assertRaises(urllib.error.HTTPError):
                uploader.upload_and_verify("https://example.invalid", "token", self.file, self.root)
        self.assertEqual(mocked.call_count, 1)

    def test_non_source_metadata_is_preserved_as_immutable_object(self):
        metadata = self.root / "recollection-summary.json"
        metadata.write_text("{}", encoding="utf-8")
        with patch.object(uploader, "storage_call", return_value=metadata.read_bytes()):
            item = uploader.upload_and_verify("https://example.invalid", "token", metadata, self.root)
        self.assertEqual(item["source_kind"], "metadata")
        self.assertFalse(item["new_object"])

    def test_catalog_restore_rehydrates_exact_paths_and_hashes_without_source_tree(self):
        record = uploader.record_for(self.file, self.root)
        contents = record.pop("_contents")
        source_path = record.pop("source_path")
        target = self.root / "restore"
        self.file.unlink()
        with patch.object(uploader, "storage_call", return_value=contents):
            result = uploader.restore_from_catalog("https://example.invalid", "token", [record], target)
        self.assertEqual(result["files"], 1)
        self.assertEqual(result["bytes"], len(contents))
        self.assertEqual((target / source_path).read_bytes(), contents)

    def test_catalog_object_key_must_bind_digest_and_safe_relative_path(self):
        record = uploader.record_for(self.file, self.root)
        record.pop("_contents")
        record["object_key"] = record["object_key"].replace(record["sha256"], "f" * 64, 1)
        with self.assertRaisesRegex(RuntimeError, "CATALOG_OBJECT_KEY_DIGEST_MISMATCH"):
            uploader.relative_from_object_key(record)


    def test_restore_catalog_rejects_colliding_paths_before_any_remote_read(self):
        record = uploader.record_for(self.file, self.root)
        record.pop("_contents")
        second = dict(record)
        second["sha256"] = "e" * 64
        second["object_key"] = (
            uploader.KEY_PREFIX + "ee/" + "e" * 64 + "/"
            + record["source_path"]
        )
        target = self.root / "duplicate-path-target"
        with patch.object(uploader, "storage_call") as remote:
            with self.assertRaisesRegex(RuntimeError, "REMOTE_CATALOG_DUPLICATE_RESTORE_PATH"):
                uploader.restore_from_catalog(
                    "https://example.invalid", "token", [record, second], target
                )
        remote.assert_not_called()
        self.assertFalse(target.exists())

    def test_catalog_rejects_normalized_or_ambiguous_paths(self):
        record = uploader.record_for(self.file, self.root)
        record.pop("_contents")
        original = record["object_key"]
        for replacement in ("out//batch008", "out/./batch008", "out/../batch008", "out\\\\batch008"):
            tampered = dict(record)
            tampered["object_key"] = original.replace("out/batch008", replacement)
            with self.subTest(replacement=replacement):
                with self.assertRaisesRegex(RuntimeError, "UNSAFE_RESTORE_PATH"):
                    uploader.relative_from_object_key(tampered)

    def test_restore_rejects_nonempty_target_before_remote_access(self):
        record = uploader.record_for(self.file, self.root)
        record.pop("_contents")
        target = self.root / "nonempty-restore"
        target.mkdir()
        (target / "unrelated.txt").write_text("preserve", encoding="utf-8")
        with patch.object(uploader, "storage_call") as remote:
            with self.assertRaisesRegex(RuntimeError, "REMOTE_RESTORE_TARGET_NOT_EMPTY"):
                uploader.restore_from_catalog("https://example.invalid", "token", [record], target)
        remote.assert_not_called()
        self.assertEqual((target / "unrelated.txt").read_text(encoding="utf-8"), "preserve")

    def source_index_fixture(self):
        """Two-file exact corpus simulates each full pinned archive identity."""
        manifest = self.root / "out" / "batch008" / "manifest.json"
        manifest.parent.mkdir(parents=True, exist_ok=True)
        manifest.write_text("[]", encoding="utf-8")
        files = [self.file, manifest]
        records, remote = [], {}
        for file in files:
            data = uploader.record_for(file, self.root)
            contents = data.pop("_contents")
            remote[data["object_key"]] = contents
            records.append(data)
        receipt = {
            "schema": "atlas-youtube-source-storage-verification/v2",
            "source_artifact_id": uploader.SOURCE_ARTIFACT_ID,
            "uploaded": True, "new_objects": 0, "existing_objects": len(records),
            "total_files_discovered": len(records),
            "total_bytes_discovered": sum(record["byte_count"] for record in records),
            "files_verified": len(records),
            "bytes_verified": sum(record["byte_count"] for record in records),
            "records": records,
        }
        census = dict(uploader.ARCHIVE_CENSUS[uploader.SOURCE_ARTIFACT_ID],
                      members=2, bytes=receipt["bytes_verified"],
                      channel_files=1, source_files=2, metadata_files=0, video_rows=2)
        return receipt, census, remote

    def test_remote_pinned_index_persists_idempotently_then_restores_without_local_archive(self):
        source, census, remote = self.source_index_fixture()
        calls = []

        def storage(method, base, token, key, data=None):
            calls.append((method, key))
            if method == "GET" and key not in remote:
                raise urllib.error.HTTPError("https://example.invalid", 404, "missing", {}, None)
            if method == "POST":
                if key in remote:
                    raise RuntimeError("UNEXPECTED_UPSERT")
                remote[key] = data
                return b""
            return remote[key]

        with patch.dict(uploader.ARCHIVE_CENSUS, {uploader.SOURCE_ARTIFACT_ID: census}):
            with patch.object(uploader, "storage_call", side_effect=storage):
                first = uploader.persist_private_recovery_index("https://example.invalid", "t", source)
                self.assertTrue(first["new_index_object"])
                second = uploader.persist_private_recovery_index("https://example.invalid", "t", source)
                self.assertFalse(second["new_index_object"])
                self.assertEqual(first["index_sha256"], second["index_sha256"])
                index_key, records = uploader.load_remote_recovery_index(
                    "https://example.invalid", "t",
                    expected_sha256=first["index_sha256"])
                self.assertEqual(index_key, first["index_object_key"])
                self.assertEqual(len(records), 2)
                self.file.unlink()
                (self.root / "out" / "batch008" / "manifest.json").unlink()
                restored = uploader.restore_from_catalog(
                    "https://example.invalid", "t", records, self.root / "isolated-from-private")
                self.assertEqual(restored, {"files": 2, "bytes": first["member_bytes"]})
                self.assertEqual((self.root / "isolated-from-private" /
                                  "out/batch008/videos/UC1.ndjson.gz").read_bytes(),
                                 remote[source["records"][0]["object_key"]])
        index_posts = [key for method, key in calls if method == "POST"]
        self.assertEqual(index_posts, [first["index_object_key"]])
        self.assertFalse(first["canonical_db_catalog_written"])

    def test_private_index_rejects_partial_source_or_tampered_remote_bytes(self):
        source, census, remote = self.source_index_fixture()
        with patch.dict(uploader.ARCHIVE_CENSUS, {uploader.SOURCE_ARTIFACT_ID: census}):
            incomplete = dict(source, files_verified=1)
            with patch.object(uploader, "storage_call") as storage:
                with self.assertRaisesRegex(RuntimeError, "SOURCE_RECOVERY_UNVERIFIED_STORAGE_PASS"):
                    uploader.persist_private_recovery_index("https://example.invalid", "t", incomplete)
                storage.assert_not_called()
            with patch.object(uploader, "storage_call") as storage:
                with self.assertRaisesRegex(RuntimeError, "SOURCE_RECOVERY_PINNED_INDEX_SHA_REQUIRED"):
                    uploader.load_remote_recovery_index("https://example.invalid", "t",
                                                       expected_sha256="")
                storage.assert_not_called()
            damaged = dict(source["records"][1])
            damaged["source_path"] = source["records"][0]["source_path"]
            with self.assertRaisesRegex(RuntimeError, "SOURCE_RECOVERY_DUPLICATE_OR_INCONSISTENT_PATH"):
                uploader.canonical_recovery_index([source["records"][0], damaged])
            original = uploader.canonical_recovery_index(source["records"])
            index_key = uploader.private_recovery_index_key()
            remote[index_key] = original + b"untrusted"
            with patch.object(uploader, "storage_call", side_effect=lambda method, base, token, key, data=None: remote[key]):
                with self.assertRaisesRegex(RuntimeError, "SOURCE_RECOVERY_PRIVATE_INDEX_SHA_MISMATCH"):
                    uploader.load_remote_recovery_index("https://example.invalid", "t",
                                                       expected_sha256=uploader.sha256(original))
                with self.assertRaisesRegex(RuntimeError, "SOURCE_RECOVERY_PRIVATE_INDEX_ROUNDTRIP_MISMATCH"):
                    uploader.persist_private_recovery_index("https://example.invalid", "t", source)


if __name__ == "__main__":
    unittest.main()
