import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts/youtube-b024-first3-public-player-probe.py"
spec=importlib.util.spec_from_file_location("youtube_public_source_probe",SCRIPT)
probe=importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class FirstThreePublicPlayerProbeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.request=probe.verified_request()

    def test_exact_source_bindings_offline_zero_calls_or_certifications(self):
        r=probe.assess(self.request)
        self.assertEqual(r["public_player_queries_attempted"],0)
        self.assertEqual(r["source_original_video_count"],3)
        self.assertEqual([x["video_id"] for x in r["records"]],list(probe.EXPECTED_IDS))
        self.assertEqual(r["person_primary_content_certifications"],0)
        self.assertEqual(r["original_video_watched_or_transcript_bytes_verified"],0)
        self.assertFalse(r["publication_authorized"])
        self.assertEqual(r["production_writes"],0)
        self.assertTrue(all(x["public_player_status"]=="NOT_PROBED" for x in r["records"]))

    def test_matches_mismatches_and_public_site_failures_cannot_approve_person(self):
        channels={x["video_id"]:x["original_channel_id"] for x in self.request["videos"]}
        def simulated(video):
            if video==probe.EXPECTED_IDS[2]:
                raise RuntimeError("YouTube site unavailable, not deletion proof")
            channel=channels[video] if video==probe.EXPECTED_IDS[0] else "UC"+"X"*22
            return {"id":video,"extractor_key":"Youtube",
                    "webpage_url":f"https://www.youtube.com/watch?v={video}",
                    "channel_id":channel,"title":"Synthetic public player title",
                    "subtitles":{"en":[{"url":"https://signed.example.com/secret","ext":"vtt"}]},
                    "automatic_captions":{"es":[{"url":"https://signed.example.com/auto"}]}}
        r=probe.assess(self.request,simulated,captured_at="2026-10-18T12:00:00Z")
        self.assertEqual(r["public_player_queries_attempted"],3)
        self.assertEqual(r["public_player_channel_matches_not_official"],1)
        self.assertEqual(r["public_player_hold_count"],2)
        self.assertEqual([x["public_player_status"] for x in r["records"]],[
            "PUBLIC_PLAYER_CHANNEL_MATCH_NOT_OFFICIAL",
            "PUBLIC_PLAYER_CHANNEL_MISMATCH_OR_UNKNOWN_HOLD",
            "PUBLIC_PLAYER_REQUEST_FAILED_HOLD"])
        self.assertEqual(r["records"][0]["player_subtitle_tracks"]["languages"],["en"])
        self.assertEqual(r["records"][0]["player_automatic_caption_tracks"]["languages"],["es"])
        self.assertNotIn("signed.example.com",json.dumps(r))
        self.assertEqual(r["person_primary_content_certifications"],0)
        self.assertFalse(r["last_registered_person_exclusion_completed"])
        self.assertFalse(r["publication_authorized"])

    def test_forged_alternate_video_or_non_youtube_extractor_never_passes(self):
        originals={x["video_id"]:x["original_channel_id"] for x in self.request["videos"]}
        def replay(video):
            return {"id":video,"extractor_key":"Youtube",
                    "webpage_url":f"https://www.youtube.com/watch?v={video}",
                    "channel_id":originals[video]}
        for key,forge,status in [
            ("id","Unrelated99","PUBLIC_PLAYER_VIDEO_ID_MISMATCH_HOLD"),
            ("extractor_key","Generic","PUBLIC_PLAYER_ORIGIN_UNVERIFIED_HOLD"),
            ("webpage_url","https://www.youtube.com/watch?v=Unrelated99","PUBLIC_PLAYER_ORIGIN_UNVERIFIED_HOLD"),
            ("channel_id","UC"+"Z"*22,"PUBLIC_PLAYER_CHANNEL_MISMATCH_OR_UNKNOWN_HOLD"),
        ]:
            def fake(video):
                value=replay(video)
                if video==probe.EXPECTED_IDS[0]:
                    value[key]=forge
                return value
            with self.subTest(field=key):
                r=probe.assess(self.request,fake)
                self.assertEqual(r["records"][0]["public_player_status"],status)
                self.assertEqual(r["person_primary_content_certifications"],0)

    def test_source_population_and_archived_channel_tampering_fail_closed(self):
        for change in [
            lambda x:x.update(publication_allowed=True),
            lambda x:x["videos"].pop(),
            lambda x:x["videos"][0].update(video_id="Unrelated99"),
            lambda x:x["videos"][0].update(original_channel_id="UC"+"X"*22),
        ]:
            bad=copy.deepcopy(self.request)
            change(bad)
            with self.assertRaisesRegex(ValueError,"PUBLIC_PLAYER_SOURCE_THREE_ORIGINAL_BINDINGS_INVALID"):
                probe.assess(bad)
        with self.assertRaisesRegex(ValueError,"PUBLIC_PLAYER_CAPTURE_TIME_NOT_TIMEZONE_AWARE"):
            probe.assess(self.request,lambda video:{},captured_at="2026-10-18T12:00:00")

    def test_tracks_are_metadata_only_and_signed_urls_never_persist(self):
        self.assertEqual(probe.tracks({"subtitles":{}}, "subtitles"),{"count":0,"languages":[]})
        self.assertEqual(probe.tracks({"subtitles":{"bad$language":[{"url":"secret"}],
                "fr":[{"url":"secret"}],"en":[]}}, "subtitles"),{"count":1,"languages":["fr"]})


if __name__=="__main__":
    unittest.main()
