import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const audit=JSON.parse(readFileSync(new URL("../docs/audits/PERSON_NECESSITY_DELTA_AUDIT_2026-09-03_B1.json",import.meta.url),"utf8"));
const policy=readFileSync(new URL("../docs/audits/PERSON_NECESSITY_AUDIT_POLICY_2026-09-03.md",import.meta.url),"utf8");

test("Person necessity delta B1 is bounded, read-only and internally consistent",()=>{
  assert.equal(audit.schema,"atlas-person-necessity-delta-audit/v1");
  assert.equal(audit.production_person_count,1552);
  assert.equal(audit.inherited_audit.production_person_count,788);
  assert.equal(audit.delta_person_count,764);
  assert.equal(audit.batch.audited_person_count,35);
  assert.equal(audit.batch.remaining_delta_person_count_after_batch,729);
  assert.equal(audit.decisions.length,35);
  assert.equal(audit.batch.production_mutation_authorized,false);
  assert.equal(audit.batch.deletion_performed,false);

  const counts=audit.decisions.reduce((acc,row)=>{acc[row.decision]=(acc[row.decision]||0)+1;return acc;},{});
  assert.equal(counts.KEEP,34);
  assert.equal(counts.REVIEW,1);
  assert.equal(counts.DELETE_CANDIDATE_PENDING_USER_APPROVAL||0,0);
  assert.deepEqual(counts,audit.batch.counts);
});

test("local office sparsity is no longer an automatic KEEP rule",()=>{
  assert.equal(audit.policy.sparse_polity_is_signal_not_automatic_keep,true);
  assert.equal(audit.policy.local_office_alone_is_sufficient,false);
  assert.match(policy,/coverage signal/);
  assert.match(policy,/not sufficient by itself/);
});

test("Honma review is non-destructive and does not invent a replacement year",()=>{
  const honma=audit.decisions.find(row=>row.canonical_name_en==="Honma Yoshihisa");
  assert.ok(honma);
  assert.equal(honma.decision,"REVIEW");
  assert.equal(honma.chronology_review_required,true);
  assert.equal(honma.person_identity_review_required,true);
  assert.match(honma.review_scope,/do not invent a replacement year/i);
  assert.equal(honma.production_deleted,false);
});

test("all deletion paths remain user-approval gated",()=>{
  assert.ok(audit.decisions.every(row=>row.delete_requires_user_approval===true));
  assert.match(policy,/exact user approval/i);
  assert.match(policy,/re-read from current Production/i);
});
