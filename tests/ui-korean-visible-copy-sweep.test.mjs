import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = file => fs.readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("main Dashboard and detail screens display Korean operator headings", () => {
  const dashboard = read("atlas-dashboard.js");
  for (const heading of ["ATLAS 운영 현황", "검토 필요", "작업 진행 현황", "데이터 품질", "데이터 완성도", "시대·권역별 분포", "원본 갱신 시각"]) {
    assert.ok(dashboard.includes(heading), "missing Korean heading: " + heading);
  }
  for (const obsolete of [">NEEDS ATTENTION<", ">DATA QUALITY<", ">COMPLETENESS MATRIX<", ">SOURCE FRESHNESS<"]) {
    assert.ok(!dashboard.includes(obsolete), "obsolete English heading: " + obsolete);
  }
  const person = read("atlas-person-main.js");
  for (const heading of ["<small>이름 정보</small>", "<small>인물 설명</small>", "<small>활동 내역</small>", "<small>출처 정보</small>", "<span>등록·수정</span>"]) {
    assert.ok(person.includes(heading), "missing detail heading: " + heading);
  }
});

test("read-only and authoring admin labels are Korean while values remain immutable", () => {
  const admin = read("admin.html");
  const human = read("atlas-admin-identity.js");
  assert.match(admin, /<title>ATLAS 관리자<\/title>/);
  assert.match(admin, /<label>객체 유형/);
  assert.match(human, /<label>기간 기준/);
  for (const [machine,visible] of [
    ["gregorian", "그레고리력"], ["julian", "율리우스력"],
    ["exact", "정확"], ["approximate", "근사"],
    ["uncertain", "불확실"], ["well_established", "근거 확립"],
    ["likely", "가능성 높음"], ["deceased", "사망 확인됨"]
  ]) {
    assert.ok(human.includes('value="' + machine + '">' + visible + '</option>'), machine + " contract");
  }
  const registration = read("atlas-registration-review.js");
  assert.match(registration, /person\?\.historicity === "historical"/);
  assert.match(registration, /"역사적 실존"/);
});

test("regional inspection labels and data-object codes remain separate", () => {
  const spacetime = read("atlas-person-spacetime-view.js");
  for (const label of ["동시대 탐색", "인물 정보", "활동 내역", "장소·권역:", "공간 배치 검토"]) {
    assert.ok(spacetime.includes(label), label);
  }
  const dossier = read("atlas-polity-dossier-view.js");
  assert.match(dossier, /<small>시대별 명칭<\/small>/);
  const ui = read("atlas-ui-authority-catalog.ko.js");
  assert.match(ui, /검토 후보 목록은 판단 대기열/);
  assert.match(ui, /장소 기능의 변화는 기준 활동을 수정하지 않고/);
});

test("authority catalog avoids residual English fragments and malformed Korean copy", () => {
  const catalog = read("atlas-ui-authority-catalog.ko.js");
  for (const phrase of ["장소·사건·출처", "정규화 전 인물명", "기원전 수천 년", "식별정보 중복", "실시간 관련 정보"]) {
    assert.ok(catalog.includes(phrase), "missing Korean copy: " + phrase);
  }
  for (const leak of ["Place·Event·Source", "raw 인물명", "BC 수천 년", "identity 중복", "live context", "원본가 담당", "사실를", "분리은"]) {
    assert.ok(!catalog.includes(leak), "residual visible English or grammar error: " + leak);
  }
  for (const machine of ['status_code: "backend-needed"', 'status_code: "parked"', 'status_code: "ready"']) {
    assert.ok(catalog.includes(machine), "machine status changed: " + machine);
  }
});
