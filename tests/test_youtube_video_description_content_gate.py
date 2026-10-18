import copy
import gzip
import hashlib
import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]

def import_script(path,name):
    spec=importlib.util.spec_from_file_location(name,ROOT/"scripts"/path)
    mod=importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

enrich=import_script("youtube-source-video-description-enrich.py","youtube_description_enrich")
gate=import_script("youtube-source-video-content-evidence-gate.py","youtube_content_gate")
VID1="AbCdEfGhI12"
VID2="MnOpQrStU34"
UC1="UC"+"A"*22
UC2="UC"+"B"*22


class MetadataEvidenceTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.source=Path(self.tmp.name)/"original.zip"
        originals=[
            (UC1,VID1,"The Life of Emmett Till"),
            (UC2,VID2,"The Story of Emmett Till")
        ]
        with zipfile.ZipFile(self.source,"w") as archive:
            for ch,vid,title in originals:
                raw=json.dumps({"video_id":vid,"channel_id":ch,"title":title})+"\n"
                archive.writestr(f"batch024/videos/{ch}.ndjson.gz",gzip.compress(raw.encode()))
        rows=[{"raw_name":f"Unreviewed Other Name {i}","title_evidence_buckets":{}}
              for i in range(244)]
        rows.insert(0,{"raw_name":"Emmett Till","title_evidence_buckets":{
            "BIOGRAPHICAL_TITLE_CUE_REVIEW":{
                "video_ids":[VID1,VID2],"channel_ids":[UC1,UC2],
                "samples":[{"video_id":VID1,"channel_id":UC1,"title":"The Life of Emmett Till"}]
            }
        }})
        self.original_source={"schema":enrich.SOURCE_SCHEMA,
            "source_sha256":enrich.SOURCE_ZIP_SHA,"source_snapshot_id":"test-source",
            "source_channels":2,"source_videos":2,
            "unreviewed_labels_examined":245,"rows":rows}
        self.req=enrich.prepare(self.original_source,source_digest="digest-from-source-review",
                                source_zip=self.source,verify_source_sha=False)
        self.assertEqual(self.req["unique_original_video_ids"],2)
        self.assertTrue(self.req["original_per_video_channel_id_verified"])
        self.manual_dir=Path(self.tmp.name)/"manual"
        self.manual_dir.mkdir()
        self.manual_receipt={
            "schema":gate.MANUAL_PLAYBACK_SCHEMA,
            "video_id":VID1,"original_channel_id":UC1,
            "original_title":"The Life of Emmett Till",
            "source_snapshot_id":"test-source",
            "source_zip_sha256":enrich.SOURCE_ZIP_SHA,
            "source_url":"https://www.youtube.com/watch?v="+VID1,
            "capture_method":"MANUAL_VIDEO_PLAYBACK",
            "person_identity_for_review":"Emmett Till",
            "captured_by":"human reviewer",
            "captured_at":"2026-10-09T12:00:00Z",
            "observations":[{"start_seconds":30,"end_seconds":60,
              "observed_evidence":"Synthetic test observation of an individual-centered historical biography."}]
        }
        self.manual_sha=self.store_manual_receipt(self.manual_receipt)

    def api(self,ids):
        lookup={r["video_id"]:r for r in self.req["videos"]}
        return {"items":[{"id":vid,"snippet":{
            "channelId":lookup[vid]["original_channel_id"],
            "title":lookup[vid]["original_title"],
            "description":"Biographical source notes about the individual.",
            "publishedAt":"2021-01-01T00:00:00Z"
        }} for vid in ids]}

    def test_original_individual_channel_binding_no_positional_zip(self):
        req=self.req
        self.assertEqual({r["original_channel_id"] for r in req["videos"]},{UC1,UC2})
        self.assertEqual({r["video_id"] for r in req["videos"]},{VID1,VID2})
        wrong=copy.deepcopy(self.original_source)
        wrong["rows"][0]["title_evidence_buckets"]["BIOGRAPHICAL_TITLE_CUE_REVIEW"]["channel_ids"]=[UC1]
        with self.assertRaisesRegex(ValueError,"ORIGINAL_VIDEO_CHANNEL_ID_MISMATCH"):
            enrich.prepare(wrong,source_digest="a",source_zip=self.source,verify_source_sha=False)

    def test_mock_official_snippet_no_auto_credit_and_resume(self):
        m=enrich.fetch_descriptions(self.req,api_call=self.api,max_batches=1)
        self.assertEqual(m["fetched_metadata_rows"],2)
        self.assertEqual(m["not_yet_fetched"],0)
        self.assertFalse(m["automatic_person_subject_approval"])
        self.assertTrue(all(r["person_video_content_verified"] is False for r in m["records"]))
        resumed=enrich.fetch_descriptions(self.req,api_call=self.api,prior=m)
        self.assertEqual(resumed["fetched_metadata_rows"],2)
        self.assertEqual(enrich.fetch_descriptions(self.req,api_call=lambda ids:{"items":[]})["records"][0]["status"],
                         "NOT_FOUND_OR_UNAVAILABLE")
        with self.assertRaisesRegex(ValueError,"API_UNKNOWN_OR_DUPLICATE_VIDEO_ID"):
            enrich.fetch_descriptions(self.req,api_call=lambda ids:{"items":[{"id":ids[0]},{"id":ids[0]}]})
        with self.assertRaisesRegex(ValueError,"YOUTUBE_DATA_API_KEY_MISSING"):
            enrich.youtube_batch_api(None)


    def store_manual_receipt(self,receipt):
        raw=(json.dumps(receipt,ensure_ascii=False,sort_keys=True)+"\n").encode("utf-8")
        (self.manual_dir/(VID1+".json")).write_bytes(raw)
        return hashlib.sha256(raw).hexdigest()

    def adjudicate(self,*args,**kwargs):
        kwargs.setdefault("playback_evidence_dir",self.manual_dir)
        return gate.adjudicate(*args,**kwargs)

    def decisions(self):
        return {"schema":"atlas-youtube-person-content-review-decisions/v1",
                "source_snapshot_id":"test-source",
                "decisions":[{
                    "video_id":VID1,"raw_name":"Emmett Till",
                    "identity_for_review":"Emmett Till",
                    "verdict":"PERSON_PRIMARY_CONTENT_CONFIRMED",
                    "evidence_method":"VIDEO_PLAYBACK_MANUAL",
                    "manual_playback_sha256":self.manual_sha,
                    "source_url":"https://www.youtube.com/watch?v="+VID1,
                    "reviewer":"human reviewer",
                    "reviewed_at":"2026-10-10T00:00:00Z",
                    "reason":"Observed video segment principally explaining this historical person's life.",
                    "content_segment":{"start_seconds":30,"end_seconds":60}
                }]}
    def identities(self):
        return {"schema":"youtube-b024-source-first-last-registry-screen-36/v1",
                "source_sha256":enrich.SOURCE_ZIP_SHA,
                "source_snapshot_id":"test-source",
                "source_historical_unmatched_identity_groups":{"Emmett Till":["Emmett Till"]}}

    def test_content_focus_credit_requires_playback_or_transcript_not_description(self):
        metadata=enrich.fetch_descriptions(self.req,api_call=self.api)
        decisions=self.decisions()
        result=self.adjudicate(self.req,metadata,self.identities(),decisions)
        self.assertEqual(result["person_centered_video_ids_verified"],1)
        self.assertEqual(result["people"][0]["distinct_content_verified_channels"],1)
        self.assertFalse(result["registered_person_exclusion_completed"])
        self.assertFalse(result["production_ranking_publishable"])
        title_only=copy.deepcopy(decisions)
        title_only["decisions"][0]["evidence_method"]="DESCRIPTION_ONLY"
        with self.assertRaisesRegex(ValueError,"TITLE_OR_DESCRIPTION_CANNOT_PROVE_CONTENT_SUBJECT"):
            self.adjudicate(self.req,metadata,self.identities(),title_only)
        bad=copy.deepcopy(decisions)
        bad["decisions"][0]["content_segment"]={"start_seconds":2,"end_seconds":6}
        with self.assertRaisesRegex(ValueError,"TIMESTAMPED_VIDEO_CONTENT_EVIDENCE_REQUIRED"):
            self.adjudicate(self.req,metadata,self.identities(),bad)
        bad=copy.deepcopy(decisions)
        bad["decisions"].append(copy.deepcopy(bad["decisions"][0]))
        with self.assertRaisesRegex(ValueError,"DUPLICATE_OR_UNSOURCED"):
            self.adjudicate(self.req,metadata,self.identities(),bad)
        mismatched=copy.deepcopy(metadata)
        mismatched["records"][0]["status"]="CHANNEL_MISMATCH"
        with self.assertRaisesRegex(ValueError,"COLLECTED_METADATA_STATUS_INCONSISTENT"):
            self.adjudicate(self.req,mismatched,self.identities(),decisions)
        empty_reviews={"schema":"atlas-youtube-person-content-review-decisions/v1",
                       "source_snapshot_id":"test-source","decisions":[]}
        result=self.adjudicate(self.req,metadata,self.identities(),empty_reviews)
        self.assertEqual(result["person_centered_video_ids_verified"],0)

    def test_content_gate_revalidates_collected_metadata_before_any_person_credit(self):
        metadata=enrich.fetch_descriptions(self.req,api_call=self.api)
        self.assertEqual(gate.validate_collected_metadata(self.req,metadata)[1][VID1]["status"],
                         "DESCRIPTION_PRESENT")
        self.assertEqual(self.adjudicate(self.req,metadata,self.identities(),
                        self.decisions())["person_centered_video_ids_verified"],1)
        # Each case used to cross the original final gate if the reviewed
        # video's status and Channel ID were left unchanged.
        for field,value,error in [
            ("original_title","Substituted unrelated title","COLLECTED_METADATA_ORIGINAL_BINDING_OR_HASH_MISMATCH"),
            ("original_channel_id",UC2,"COLLECTED_METADATA_ORIGINAL_BINDING_OR_HASH_MISMATCH"),
            ("description","Tampered without recomputing hash","COLLECTED_METADATA_ORIGINAL_BINDING_OR_HASH_MISMATCH"),
            ("description_sha256","0"*64,"COLLECTED_METADATA_ORIGINAL_BINDING_OR_HASH_MISMATCH"),
            ("person_video_content_verified",True,"COLLECTED_METADATA_ORIGINAL_BINDING_OR_HASH_MISMATCH"),
            ("status","CHANNEL_MISMATCH","COLLECTED_METADATA_STATUS_INCONSISTENT"),
            ("live_channel_id",UC2,"COLLECTED_METADATA_STATUS_INCONSISTENT"),
        ]:
            modified=copy.deepcopy(metadata)
            modified["records"][0][field]=value
            with self.subTest(record_field=field):
                with self.assertRaisesRegex(ValueError,error):
                    self.adjudicate(self.req,modified,self.identities(),self.decisions())
        for field,value,error in [
            ("requested_original_video_ids",999,"METADATA_COMPLETENESS_COUNT_MISMATCH"),
            ("fetched_metadata_rows",1,"METADATA_COMPLETENESS_COUNT_MISMATCH"),
            ("not_yet_fetched",1,"METADATA_COMPLETENESS_COUNT_MISMATCH"),
            ("automatic_person_subject_approval",True,"COLLECTED_METADATA_CANNOT_AUTO_APPROVE_PERSON"),
            ("request_source_json_sha256","other","SOURCE_PROVENANCE_INCONSISTENCY"),
        ]:
            modified=copy.deepcopy(metadata)
            modified[field]=value
            with self.subTest(metadata_field=field):
                with self.assertRaisesRegex(ValueError,error):
                    self.adjudicate(self.req,modified,self.identities(),self.decisions())
        duplicate=copy.deepcopy(metadata)
        duplicate["records"].append(copy.deepcopy(duplicate["records"][0]))
        with self.assertRaisesRegex(ValueError,"ORIGINAL_VIDEO_ID_EVIDENCE_POPULATION_MISMATCH"):
            self.adjudicate(self.req,duplicate,self.identities(),self.decisions())
        modified_source=copy.deepcopy(self.req)
        modified_source["videos"].append(copy.deepcopy(modified_source["videos"][0]))
        modified_source["unique_original_video_ids"]=3
        with self.assertRaisesRegex(ValueError,"ORIGINAL_VIDEO_ID_EVIDENCE_POPULATION_MISMATCH"):
            self.adjudicate(modified_source,metadata,self.identities(),self.decisions())
        injected=copy.deepcopy(metadata)
        injected["records"][0]["live_channel_id"]=None
        injected["records"][0]["status"]="NOT_FOUND_OR_UNAVAILABLE"
        with self.assertRaisesRegex(ValueError,"COLLECTED_METADATA_UNAVAILABLE_ROW_HAS_PUBLISHER_DATA"):
            self.adjudicate(self.req,injected,self.identities(),self.decisions())
        # A genuinely incomplete official batch may provide one video only;
        # it cannot credit an unavailable/unfetched second ID.
        partially_fetched=copy.deepcopy(metadata)
        partially_fetched["records"]=partially_fetched["records"][:1]
        partially_fetched["fetched_metadata_rows"]=1
        partially_fetched["not_yet_fetched"]=1
        self.assertEqual(gate.validate_collected_metadata(self.req,partially_fetched)[1][VID1]["status"],
                         "DESCRIPTION_PRESENT")
        self.assertEqual(self.adjudicate(self.req,partially_fetched,self.identities(),
                         self.decisions())["person_centered_video_ids_verified"],1)
        second=copy.deepcopy(self.decisions())
        second["decisions"][0]["video_id"]=VID2
        second["decisions"][0]["source_url"]="https://www.youtube.com/watch?v="+VID2
        with self.assertRaisesRegex(ValueError,"CANNOT_CREDIT_MISSING_OR_CHANNEL_MISMATCH_VIDEO"):
            self.adjudicate(self.req,partially_fetched,self.identities(),second)

    def transcript_artifact(self):
        return {
            "schema":gate.TRANSCRIPT_SCHEMA,
            "video_id":VID1,
            "original_channel_id":UC1,
            "original_title":"The Life of Emmett Till",
            "source_snapshot_id":"test-source",
            "source_zip_sha256":enrich.SOURCE_ZIP_SHA,
            "source_url":"https://www.youtube.com/watch?v="+VID1,
            "capture_method":"YOUTUBE_CAPTION_TRACK",
            "captured_by":"synthetic test caption capturer",
            "captured_at":"2026-10-09T12:00:00Z",
            "caption_language":"en",
            "segments":[
                {"start_seconds":30,"end_seconds":42,
                 "text":"The detailed historical biography explains"},
                {"start_seconds":42,"end_seconds":60,
                 "text":"the primary individual's life and enduring significance."}
            ]
        }

    def store_transcript_artifact(self,artifact,decision):
        raw=(json.dumps(artifact,ensure_ascii=False,sort_keys=True)+"\n").encode("utf-8")
        evidence=Path(self.tmp.name)/(VID1+".json")
        evidence.write_bytes(raw)
        decision["decisions"][0]["transcript_sha256"]=hashlib.sha256(raw).hexdigest()
        decision["decisions"][0]["transcript_excerpt"]=(
            "The detailed historical biography explains the primary individual's life")
        return evidence

    def test_transcript_evidence_requires_actual_bytes_and_original_source_binding(self):
        metadata=enrich.fetch_descriptions(self.req,api_call=self.api)
        decision=self.decisions()
        decision["decisions"][0]["evidence_method"]="TIMESTAMPED_TRANSCRIPT"
        with self.assertRaisesRegex(ValueError,"TRANSCRIPT_SOURCE_DIGEST_AND_EXCERPT_REQUIRED"):
            self.adjudicate(self.req,metadata,self.identities(),decision)
        decision["decisions"][0]["transcript_sha256"]="a"*64
        decision["decisions"][0]["transcript_excerpt"]="The detailed historical biography explains the primary individual's life."
        # A superficially valid SHA string and excerpt cannot claim a watched
        # video. The literal original Video ID transcript bytes are mandatory.
        with self.assertRaisesRegex(ValueError,"ORIGINAL_VIDEO_TRANSCRIPT_ARTIFACT_REQUIRED"):
            self.adjudicate(self.req,metadata,self.identities(),decision)
        self.store_transcript_artifact(self.transcript_artifact(),decision)
        with self.assertRaisesRegex(ValueError,"ORIGINAL_VIDEO_TRANSCRIPT_ARTIFACT_REQUIRED"):
            self.adjudicate(self.req,metadata,self.identities(),decision)
        output=self.adjudicate(self.req,metadata,self.identities(),decision,
                              transcript_evidence_dir=self.tmp.name)
        self.assertEqual(output["person_centered_video_ids_verified"],1)
        evidence=output["people"][0]["content_review_provenance"][0]
        self.assertEqual(evidence["transcript_evidence_sha256"],
                         decision["decisions"][0]["transcript_sha256"])
        self.assertEqual(evidence["transcript_capture_method"],"YOUTUBE_CAPTION_TRACK")
        self.assertFalse(output["registered_person_exclusion_completed"])
        self.assertFalse(output["production_ranking_publishable"])

    def test_transcript_file_tampering_wrong_video_and_fake_timecodes_fail_closed(self):
        metadata=enrich.fetch_descriptions(self.req,api_call=self.api)
        decision=self.decisions()
        decision["decisions"][0]["evidence_method"]="TIMESTAMPED_TRANSCRIPT"
        original=self.transcript_artifact()
        self.store_transcript_artifact(original,decision)
        # Same claimed digest, DIFFERENT bytes: reject even if the text is
        # plausible and the decision supplies a 10+ second review segment.
        (Path(self.tmp.name)/(VID1+".json")).write_bytes(b'{"forged":"transcript"}')
        with self.assertRaisesRegex(ValueError,"TRANSCRIPT_ACTUAL_BYTES_SHA256_MISMATCH"):
            self.adjudicate(self.req,metadata,self.identities(),decision,
                            transcript_evidence_dir=self.tmp.name)
        changes=[
            ("video",lambda x:x.update(video_id=VID2),
             "TRANSCRIPT_ORIGINAL_SOURCE_PROVENANCE_MISMATCH"),
            ("channel",lambda x:x.update(original_channel_id=UC2),
             "TRANSCRIPT_ORIGINAL_SOURCE_PROVENANCE_MISMATCH"),
            ("title",lambda x:x.update(original_title="Unrelated presentation"),
             "TRANSCRIPT_ORIGINAL_SOURCE_PROVENANCE_MISMATCH"),
            ("snapshot",lambda x:x.update(source_snapshot_id="unrelated-archive"),
             "TRANSCRIPT_ORIGINAL_SOURCE_PROVENANCE_MISMATCH"),
            ("zip",lambda x:x.update(source_zip_sha256="f"*64),
             "TRANSCRIPT_ORIGINAL_SOURCE_PROVENANCE_MISMATCH"),
            ("URL",lambda x:x.update(source_url="https://www.youtube.com/watch?v="+VID2),
             "TRANSCRIPT_ORIGINAL_SOURCE_PROVENANCE_MISMATCH"),
            ("method",lambda x:x.update(capture_method="VIDEO_TITLE_ONLY"),
             "TRANSCRIPT_ORIGINAL_SOURCE_PROVENANCE_MISMATCH"),
            ("chronology",lambda x:x.update(captured_at="2026-10-11T00:00:00Z"),
             "TRANSCRIPT_CAPTURE_AFTER_REVIEW_FORBIDDEN"),
            ("missing excerpt",lambda x:x["segments"][0].update(text="Not the actual reviewed text"),
             "TRANSCRIPT_EXCERPT_NOT_IN_REVIEWED_VIDEO_SEGMENT"),
            ("overlapping cue",lambda x:x["segments"][0].update(
                start_seconds=30,end_seconds=43),
             "TRANSCRIPT_SEGMENT_INVALID_OR_OVERLAPPING"),
            ("under 10 seconds of actual timed caption coverage",lambda x:x.update(segments=[
                {"start_seconds":30,"end_seconds":34,"text":"The detailed historical biography explains"},
                {"start_seconds":35,"end_seconds":39,
                 "text":"the primary individual's life and enduring significance."}]),
             "TRANSCRIPT_TIMECODE_COVERAGE_BELOW_10_SECONDS"),
            ("outside segment",lambda x:x.update(segments=[
                {"start_seconds":95,"end_seconds":120,"text":"The detailed historical biography explains the primary individual's life."}]),
             "TRANSCRIPT_TIMECODE_COVERAGE_BELOW_10_SECONDS")
        ]
        for reason,change,error in changes:
            altered=copy.deepcopy(original)
            change(altered)
            self.store_transcript_artifact(altered,decision)
            with self.subTest(reason=reason):
                with self.assertRaisesRegex(ValueError,error):
                    self.adjudicate(self.req,metadata,self.identities(),decision,
                                    transcript_evidence_dir=self.tmp.name)


    def test_manual_video_playback_claim_requires_original_source_bound_bytes(self):
        metadata=enrich.fetch_descriptions(self.req,api_call=self.api)
        decision=self.decisions()
        # This is a synthetic human report; without an inspectable receipt,
        # even matching public metadata and a plausible 30s claim are untrusted.
        with self.assertRaisesRegex(ValueError,"MANUAL_PLAYBACK_SOURCE_ARTIFACT_REQUIRED"):
            gate.adjudicate(self.req,metadata,self.identities(),decision)
        valid=self.adjudicate(self.req,metadata,self.identities(),decision)
        proof=valid["people"][0]["content_review_provenance"][0]
        self.assertEqual(proof["manual_playback_evidence_sha256"],self.manual_sha)
        self.assertEqual(proof["manual_playback_capture_method"],"MANUAL_VIDEO_PLAYBACK")
        altered=copy.deepcopy(decision)
        altered["decisions"][0]["manual_playback_sha256"]="a"*64
        with self.assertRaisesRegex(ValueError,"MANUAL_PLAYBACK_ACTUAL_BYTES_SHA256_MISMATCH"):
            self.adjudicate(self.req,metadata,self.identities(),altered)
        cases=[
          ("wrong video",lambda x:x.update(video_id=VID2),
           "MANUAL_PLAYBACK_ORIGINAL_SOURCE_PROVENANCE_MISMATCH"),
          ("wrong channel",lambda x:x.update(original_channel_id=UC2),
           "MANUAL_PLAYBACK_ORIGINAL_SOURCE_PROVENANCE_MISMATCH"),
          ("wrong source",lambda x:x.update(source_zip_sha256="0"*64),
           "MANUAL_PLAYBACK_ORIGINAL_SOURCE_PROVENANCE_MISMATCH"),
          ("wrong human",lambda x:x.update(captured_by="unrelated party"),
           "MANUAL_PLAYBACK_ORIGINAL_SOURCE_PROVENANCE_MISMATCH"),
          ("wrong topic",lambda x:x.update(person_identity_for_review="Not Emmett Till"),
           "MANUAL_PLAYBACK_ORIGINAL_SOURCE_PROVENANCE_MISMATCH"),
          ("not video playback",lambda x:x.update(capture_method="TITLE_ONLY"),
           "MANUAL_PLAYBACK_ORIGINAL_SOURCE_PROVENANCE_MISMATCH"),
          ("capture after review",lambda x:x.update(captured_at="2026-10-11T12:00:00Z"),
           "MANUAL_PLAYBACK_CAPTURE_AFTER_REVIEW_FORBIDDEN"),
          ("too little video observed",lambda x:x["observations"][0].update(end_seconds=33),
           "MANUAL_PLAYBACK_OBSERVED_COVERAGE_BELOW_10_SECONDS"),
          ("invented clock values",lambda x:x["observations"][0].update(end_seconds=True),
           "MANUAL_PLAYBACK_OBSERVATION_INVALID")
        ]
        for label,mutation,error in cases:
            modified=copy.deepcopy(self.manual_receipt)
            mutation(modified)
            changed_sha=self.store_manual_receipt(modified)
            updated=self.decisions()
            updated["decisions"][0]["manual_playback_sha256"]=changed_sha
            with self.subTest(case=label):
                with self.assertRaisesRegex(ValueError,error):
                    self.adjudicate(self.req,metadata,self.identities(),updated)
        # Restore for any re-entrant test/reviewer use.
        self.manual_sha=self.store_manual_receipt(self.manual_receipt)


if __name__=="__main__":
    unittest.main()
