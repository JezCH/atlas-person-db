import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const src=fs.readFileSync(new URL("../atlas-person-main.js",import.meta.url),"utf8");

function messageFunction() {
  const section=src.match(/  const USER_FACING_PERSON_ERRORS = new Set\(\[[\s\S]*?  function userFacingPersonError\(error, fallback\) \{[\s\S]*?\n  \}/);
  assert.ok(section,"Korean Person error boundary must exist");
  return vm.runInNewContext(section[0]+"\nuserFacingPersonError",{});
}

test("raw backend codes and English failures never become Person user messages",()=>{
  const translate=messageFunction();
  const fallback="인물 정보를 불러오지 못했습니다. 다시 시도해 주세요.";
  for(const raw of [
    Object.assign(new Error("DATABASE_UNAVAILABLE"),{code:"DATABASE_UNAVAILABLE"}),
    new Error("invalid input syntax for type uuid"),
    new Error("Person Runtime store unavailable"),
    Object.assign(new Error("Backend failed (HTTP 403)"),{code:"FORBIDDEN"}),
    new Error("Cannot read properties of undefined")
  ]) assert.equal(translate(raw,fallback),fallback);
  assert.equal(translate(null,fallback),fallback);
});

test("explicitly reviewed Korean errors remain precise",()=>{
  const translate=messageFunction();
  const fallback="인물 정보 저장에 실패했습니다.";
  assert.equal(translate(new Error("인물 편집 대상이 올바르지 않습니다."),fallback),"인물 편집 대상이 올바르지 않습니다.");
  assert.equal(translate(new Error("초상화 저장 서비스를 사용할 수 없습니다."),fallback),"초상화 저장 서비스를 사용할 수 없습니다.");
  assert.equal(translate(new Error("Korean 검사 실패: invalid UUID"),fallback),fallback);
});

test("all critical Person errors pass through the Korean boundary",()=>{
  const expected=[
    /상세정보 조회 실패: \$\{escapeHtml\(userFacingPersonError\(error,/,
    /인물 목록 조회 실패: \$\{escapeHtml\(userFacingPersonError\(error,/,
    /const message = userFacingPersonError\(result\?\.error,/,
    /showOperationalMessage\(userFacingPersonError\(error, "초상화 저장에 실패/,
    /showOperationalMessage\(userFacingPersonError\(error, "초상화 삭제에 실패/,
    /showOperationalMessage\(userFacingPersonError\(error, "인물 정보 저장에 실패/,
    /showOperationalMessage\(userFacingPersonError\(new Error\(outcomeError\(outcome,/,
    /showOperationalMessage\(userFacingPersonError\(error, "활동 기록 삭제에 실패/
  ];
  for(const pattern of expected)assert.match(src,pattern);
  for(const leak of [
    "showOperationalMessage(error?.message",
    "escapeHtml(error?.code || error?.message",
    "const message = String(result?.error?.message",
    'aria-label="Person 정렬"',
    "showOperationalMessage(outcomeError("
  ])assert.ok(!src.includes(leak),"raw UI error exposure: "+leak);
});

test("Person viewer keeps original reader and authoring state contracts",()=>{
  for(const contract of [
    "reader.readPerson(personId)", "dataStore.loadPersons({ force })",
    "portraitController.setPortrait(", "portraitController.deletePortrait(",
    "profileEditor.dispatchWrite(", "profileWriter.deleteActivity(activityId)",
    'state: "error", message',
    "selectedPersonId === personId"
  ])assert.ok(src.includes(contract),"lost contract "+contract);
  assert.match(src,/aria-label="인물 정렬"/);
  assert.match(src,/이 활동 기록을 삭제할까요/);
});
