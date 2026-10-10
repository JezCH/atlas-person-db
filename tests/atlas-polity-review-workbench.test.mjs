import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const snapshot = fs.readFileSync(new URL('../docs/audits/POLITY_REVIEW_CANDIDATES_20260927_ARCHIVE.txt', import.meta.url), 'utf8');
const registrySource = fs.readFileSync(new URL('../atlas-polity-review-registry.js', import.meta.url), 'utf8');
const browser = fs.readFileSync(new URL('../atlas-polity-review-workbench.js', import.meta.url), 'utf8');
const review = fs.readFileSync(new URL('../atlas-polity-review-panel.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../atlas-polity-review-workbench.css', import.meta.url), 'utf8');
const reader = fs.readFileSync(new URL('../atlas-polity-browser-reader.js', import.meta.url), 'utf8');
const nav = fs.readFileSync(new URL('../atlas-main-authority-nav.js', import.meta.url), 'utf8');
const dossier = fs.readFileSync(new URL('../atlas-polity-dossier-view.js', import.meta.url), 'utf8');
const stage2 = JSON.parse(fs.readFileSync(new URL('../stage2/contracts/polity-identity-continuity-current.v1.json', import.meta.url), 'utf8'));

const registryContext = { window:{} };
vm.runInNewContext(registrySource, registryContext);
const registry = registryContext.window.ATLAS_POLITY_REVIEW_REGISTRY;

test('Polities main surface keeps canonical listing first and mounts current review registry below it', () => {
  assert.match(nav, /atlasPolityMount/);
  assert.match(nav, /atlasPolityReviewMount/);
  assert.match(nav, /ATLAS_POLITY_BROWSER_VIEW/);
  assert.match(nav, /ATLAS_POLITY_REVIEW_PANEL/);
  assert.match(nav, /atlas-polity-review-registry\.js/);
  assert.doesNotMatch(nav, /loadScriptOnce\("\.\/atlas-polity-review-candidates\.js/);
  assert.match(nav, /views\?\.browser\?\.mount/);
  assert.match(nav, /views\?\.review\?\.mount/);
});

test('canonical Polity listing stays live while expanded rows render a first-class dossier', () => {
  assert.match(browser, /ATLAS_POLITY_BROWSER_READER/);
  assert.match(browser, /ATLAS_POLITY_DOSSIER_VIEW/);
  assert.match(browser, /READER\.listPolities\(\)/);
  assert.match(browser, /payload\.polities/);
  assert.match(browser, /CANONICAL POLITY BROWSER/);
  assert.match(browser, /PAGE_SIZE = 12/);
  assert.match(browser, /data-polity-load-more/);
  assert.match(browser, /dossierRenderer\.dossierHtml\(polity\)/);
  assert.match(dossier, /정치체 식별 정보/);
  assert.match(dossier, /Activity에서 관측된 시대 명칭/);
  assert.match(reader, /\/api\/atlas-polity-read/);
  assert.match(reader, /cache: "no-store"/);
});

test('current registry restores every required carry-forward audit family without making it an execution queue', () => {
  assert.equal(registry.schema, 'atlas-polity-review-registry/v3');
  assert.equal(registry.generated_at, '2026-10-08');
  assert.equal(registry.authority.issue, 1895);
  assert.equal(Object.hasOwn(registry, 'execution_frontier'), false);
  assert.equal(registry.snapshot_history.path, 'docs/audits/POLITY_REVIEW_CANDIDATES_20260927_ARCHIVE.txt');
  const ireland = registry.resolved_history.find(row => row.id === 'ireland-family-correction');
  assert.equal(ireland?.terminal_status, 'FIXED');
  assert.equal(ireland?.locked, true);
  const italy = registry.resolved_history.find(row => row.id === 'kingdom-of-italy-three-way-split');
  assert.equal(italy?.terminal_status, 'FIXED');
  assert.equal(italy?.locked, true);
  const southAfrica = registry.resolved_history.find(row => row.id === 'south-africa-union-state');
  assert.equal(southAfrica?.terminal_status, 'FIXED');
  assert.equal(southAfrica?.locked, true);
  const siamThailand = registry.resolved_history.find(row => row.id === 'siam-thailand');
  assert.equal(siamThailand?.terminal_status, 'FIXED');
  assert.equal(siamThailand?.locked, true);
  const southKasai = registry.resolved_history.find(row => row.id === 'south-kasai-state-form');
  assert.equal(southKasai?.terminal_status, 'FIXED');
  assert.equal(southKasai?.locked, true);
  const bosnia = registry.resolved_history.find(row => row.id === 'bosnia-banate-kingdom');
  assert.equal(bosnia?.terminal_status, 'FIXED');
  assert.equal(bosnia?.locked, true);
  const northumbria = registry.resolved_history.find(row => row.id === 'northumbria-generic-kingdom');
  assert.equal(northumbria?.terminal_status, 'FIXED');
  assert.equal(northumbria?.locked, true);
  const savoy = registry.resolved_history.find(row => row.id === 'savoy-county-duchy');
  assert.equal(savoy?.terminal_status, 'FIXED');
  assert.equal(savoy?.locked, true);
  const bavaria = registry.resolved_history.find(row => row.id === 'bavaria-duchy-electorate');
  assert.equal(bavaria?.terminal_status, 'FIXED');
  assert.equal(bavaria?.locked, true);
  const hanover = registry.resolved_history.find(row => row.id === 'hanover-electorate-kingdom');
  assert.equal(hanover?.terminal_status, 'FIXED');
  assert.equal(hanover?.locked, true);
  const saxony = registry.resolved_history.find(row => row.id === 'saxony-electorate-kingdom');
  assert.equal(saxony?.terminal_status, 'FIXED');
  assert.equal(saxony?.locked, true);
  const lithuania = registry.resolved_history.find(row => row.id === 'lithuania-grand-duchy-kingdom');
  assert.equal(lithuania?.terminal_status, 'FIXED');
  assert.equal(lithuania?.locked, true);
  const portugal = registry.resolved_history.find(row => row.id === 'portugal-county-kingdom');
  assert.equal(portugal?.terminal_status, 'FIXED');
  assert.equal(portugal?.locked, true);
  const apulia = registry.resolved_history.find(row => row.id === 'apulia-county-duchy');
  assert.equal(apulia?.terminal_status, 'FIXED');
  assert.equal(apulia?.locked, true);
  const croatia = registry.resolved_history.find(row => row.id === 'croatia-principality-kingdom');
  assert.equal(croatia?.terminal_status, 'FIXED');
  assert.equal(croatia?.locked, true);
  const albania = registry.resolved_history.find(row => row.id === 'albania-republic-kingdom');
  assert.equal(albania?.terminal_status, 'FIXED');
  assert.equal(albania?.locked, true);
  const iran = registry.resolved_history.find(row => row.id === 'iran-imperial-state');
  assert.equal(iran?.terminal_status, 'FIXED');
  assert.equal(iran?.locked, true);
  const upperVolta = registry.resolved_history.find(row => row.id === 'upper-volta-burkina-faso');
  assert.equal(upperVolta?.terminal_status, 'FIXED');
  assert.equal(upperVolta?.locked, true);
  const congo = registry.resolved_history.find(row => row.id === 'congo-drc-zaire-family');
  assert.equal(congo?.terminal_status, 'FIXED');
  assert.equal(congo?.locked, true);
  const yugoslavia = registry.resolved_history.find(row => row.id === 'yugoslavia-continuity-family');
  assert.equal(yugoslavia?.terminal_status, 'FIXED');
  assert.equal(yugoslavia?.locked, true);
  const libya = registry.resolved_history.find(row => row.id === 'libya-republic-jamahiriya');
  assert.equal(libya?.terminal_status, 'FIXED');
  assert.equal(libya?.locked, true);
  const milan = registry.resolved_history.find(row => row.id === 'milan-lordship-duchy');
  assert.equal(milan?.terminal_status, 'FIXED');
  assert.equal(milan?.locked, true);
  const urbino = registry.resolved_history.find(row => row.id === 'urbino-lordship-duchy');
  assert.equal(urbino?.terminal_status, 'FIXED');
  assert.equal(urbino?.locked, true);
  const palmyra = registry.resolved_history.find(row => row.id === 'palmyra-empire');
  assert.equal(palmyra?.terminal_status, 'FIXED');
  assert.equal(palmyra?.locked, true);
  const austria = registry.resolved_history.find(row => row.id === 'austria-republic-federal-state');
  assert.equal(austria?.terminal_status, 'FIXED');
  assert.equal(austria?.locked, true);
  const argentina = registry.resolved_history.find(row => row.id === 'argentine-republic-argentina');
  assert.equal(argentina?.terminal_status, 'FIXED');
  assert.equal(argentina?.locked, true);
  const paraguay = registry.resolved_history.find(row => row.id === 'paraguay-republic');
  assert.equal(paraguay?.terminal_status, 'FIXED');
  assert.equal(paraguay?.locked, true);
  const negros = registry.resolved_history.find(row => row.id === 'negros-provisional-cantonal');
  assert.equal(negros?.terminal_status, 'FIXED');
  assert.equal(negros?.locked, true);
  assert.equal(registry.carry_forward_same_identity.length, 3);
  assert.equal(registry.carry_forward_same_identity.filter(row => !row.terminal_status).length, 0);
  assert.equal(registry.historical_family_reviews.length, 16);
  assert.equal(registry.designation_residuals.length, 2);
  assert.equal(registry.naming_residuals.length, 2);
  assert.equal(registry.rupture_probes.length, 16);
  assert.deepEqual(Array.from(registry.terminal_statuses), [
    'FIXED','KEEP_SEPARATE','SUPERSEDED','NOT_PRESENT','HOLD_UNRESOLVED'
  ]);
});

test('rupture registry locks Yuan / Northern Yuan as KEEP_SEPARATE while leaving other probes reviewable', () => {
  const yuan = registry.rupture_probes.find(row => row.id === 'yuan-northern-yuan-rupture');
  assert.ok(yuan);
  assert.equal(yuan.terminal_status, 'KEEP_SEPARATE');
  assert.equal(yuan.reviewed_decision, 'keep_both');
  assert.equal(yuan.locked, true);
  assert.ok(registry.rupture_probes.some(row => !row.terminal_status));
});

test('fresh Production closes the no-write seed subset without resolving still-open historical judgments', () => {
  const byId = new Map([
    ...registry.carry_forward_same_identity,
    ...registry.historical_family_reviews,
    ...registry.designation_residuals,
    ...registry.rupture_probes
  ].map(row => [row.id, row]));

  assert.equal(byId.get('irish-free-state-ireland').terminal_status, 'SUPERSEDED');
  assert.equal(byId.get('sicily-county-kingdom').terminal_status, 'KEEP_SEPARATE');
  assert.equal(byId.get('sicily-county-kingdom').reviewed_decision, 'keep_both');
  assert.equal(byId.get('sicily-county-kingdom').locked, true);
  assert.equal(byId.get('joseon-korean-empire').terminal_status, 'KEEP_SEPARATE');
  const hungary = byId.get('hungary-regime-family');
  assert.equal(hungary.terminal_status, 'FIXED');
  assert.equal(hungary.status, 'FIXED');
  assert.equal(hungary.reviewed_decision, 'keep_both');
  assert.equal(hungary.suggested_action, 'keep_both');
  assert.equal(hungary.left.polity_id, 'b07ef629-2fd6-59f9-bac8-ec685b371aac');
  assert.equal(hungary.right.polity_id, '83292f3d-caad-43bb-86e6-05259b90eac9');
  assert.equal(hungary.locked, true);
  assert.match(hungary.rationale, /1918-1920 republican\/Soviet interlude/);
  assert.match(hungary.rationale, /supersedes PR #2117/);
  assert.match(hungary.rationale, /PR #2118/);
  assert.match(hungary.rationale, /PR #2119/);
  assert.doesNotMatch(hungary.rationale, /one Kingdom of Hungary identity for the medieval, Habsburg\/dualist and Horthy/);
  assert.equal(byId.get('russian-sfsr-federation').terminal_status, 'KEEP_SEPARATE');
  assert.equal(byId.get('nicaea-byzantine').terminal_status, 'SUPERSEDED');

  for (const id of [
    'western-eastern-zhou',
    'ming-southern-ming',
    'champa-panduranga',
    'inca-neo-inca',
    'pakistan-1971-rupture',
    'yugoslavia-sfr-fr'
  ]) {
    assert.equal(byId.get(id).terminal_status, 'NOT_PRESENT', id);
    assert.equal(byId.get(id).locked, true, id);
  }

  const westEastJin = byId.get('western-eastern-jin');
  assert.equal(westEastJin.status, 'KEEP_SEPARATE');
  assert.equal(westEastJin.terminal_status, 'KEEP_SEPARATE');
  assert.equal(westEastJin.reviewed_decision, 'keep_both');
  assert.equal(westEastJin.locked, true);
  assert.equal(westEastJin.left.polity_id, '77ee4f18-ba76-4e89-a925-431d00b1d214');
  assert.equal(westEastJin.right.polity_id, '2ab00854-f6fa-458b-8482-e9d1379036ba');
  assert.ok(westEastJin.evidence.some(entry => /2026-10-05 NOT_PRESENT proof superseded/.test(entry)));
  assert.ok(westEastJin.evidence.some(entry => /publication_current=true/.test(entry)));

  const unresolved = [
    ...registry.carry_forward_same_identity,
    ...registry.historical_family_reviews,
    ...registry.designation_residuals,
    ...registry.naming_residuals,
    ...registry.rupture_probes
  ].filter(row => !row.terminal_status);
  assert.equal(unresolved.length, 17);
  const brazil = byId.get('brazil-regime-family');
  assert.equal(brazil.terminal_status, 'FIXED');
  assert.equal(brazil.status, 'FIXED');
  assert.match(brazil.rationale, /old United States of Brazil and Brazil are ONE continuously sovereign republic/);
  assert.match(brazil.rationale, /Former Polity row NOT retired or deleted/);
  const saudi = byId.get('saudi-third-state-nejd');
  assert.equal(saudi.status, 'KEEP_SEPARATE');
  assert.equal(saudi.terminal_status, 'KEEP_SEPARATE');
  assert.equal(saudi.reviewed_decision, 'keep_both');
  assert.equal(saudi.locked, true);
  assert.equal(saudi.left.polity_id, 'aa38d04d-532d-4851-8e05-27d0614fb9c0');
  assert.equal(saudi.right.polity_id, '769b9646-457c-4a45-b7af-76b0141c2c8e');
  assert.ok(saudi.evidence.some(x => /a05dce0f-1d35-4858-8d61-7a8da3a6e5ab/.test(x)));
  assert.ok(saudi.evidence.some(x => /0fbb1e5b-4661-4696-9d1f-ec77bbe2d75a/.test(x)));
  assert.ok(saudi.evidence.some(x => /qdl\.qa\/archive/.test(x)));

  const liberia = byId.get('liberia-commonwealth-republic');
  assert.equal(liberia.status, 'REVIEW_REQUIRED');
  assert.equal(liberia.terminal_status, null);
  assert.equal(liberia.suggested_action, 'repair');
  assert.equal(liberia.reviewed_decision, 'keep_separate_commonwealth_republic_and_review_republic_liberia_duplicate');
  assert.equal(liberia.left.polity_id, '5643400c-880b-45f2-8d32-7ad64bf91391');
  assert.equal(liberia.right.polity_id, '2ca2fd4c-1d68-4771-beb7-706e4f53370b');
  assert.ok(liberia.evidence.some(x => /5037f747-2d30-4479-b321-6f01b5cba162/.test(x)));
  assert.ok(liberia.evidence.some(x => /c6fbf7e8-8447-4425-b026-5f4994bea79f/.test(x)));
  assert.ok(liberia.evidence.some(x => /1847-07-26/.test(x)));
  assert.ok(liberia.evidence.some(x => /loc.gov/.test(x)));
  assert.ok(liberia.evidence.some(x => /state.gov/.test(x)));

  const gorkha = byId.get('gorkha-nepal');
  assert.equal(gorkha.status, 'KEEP_SEPARATE');
  assert.equal(gorkha.terminal_status, 'KEEP_SEPARATE');
  assert.equal(gorkha.reviewed_decision, 'keep_both');
  assert.equal(gorkha.locked, true);
  assert.equal(gorkha.left.polity_id, '0eec74a4-a2a4-43f3-b347-54370b94da14');
  assert.equal(gorkha.right.polity_id, '7518462f-9769-413f-a245-cc3825b45d17');
  assert.ok(gorkha.evidence.some(x => /b76ee400-deeb-4e5e-a961-58c773e93ad4/.test(x)));
  assert.ok(gorkha.evidence.some(x => /3c267e73-5b4e-40cd-9c86-965381d58a84/.test(x)));
  assert.ok(gorkha.evidence.some(x => /cambridge.org/.test(x)));
  assert.ok(gorkha.evidence.some(x => /academic.oup.com/.test(x)));
  assert.match(gorkha.rationale, /1768–1769/);
  assert.match(gorkha.rationale, /같은 샤 왕조/);

  const chuzan = byId.get('chuzan-ryukyu');
  assert.equal(chuzan.status, 'REVIEW_REQUIRED');
  assert.equal(chuzan.terminal_status, null);
  assert.equal(chuzan.suggested_action, 'repair');
  assert.equal(chuzan.reviewed_decision, 'provisional_keep_both_verify_1429_contemporary_evidence');
  assert.equal(chuzan.left.polity_id, '9860fc4b-feb8-491b-acdb-97d37bae6fcb');
  assert.equal(chuzan.right.polity_id, '701a8b03-5ba6-5ce6-a698-128944fec079');
  assert.ok(chuzan.evidence.some(s => /d4503fea-545e-4c72-b398-f6075c2987cf/.test(s)));
  assert.ok(chuzan.evidence.some(s => /432b442f-d2a7-42c2-9ec7-c159fe88e402/.test(s)));
  assert.ok(chuzan.evidence.some(s => /toyo-bunko.repo.nii.ac.jp/.test(s)));
  assert.ok(chuzan.evidence.some(s => /pref.okinawa.jp/.test(s)));
  const massylii = byId.get('massylii-numidia');
  assert.equal(massylii.status, 'KEEP_SEPARATE');
  assert.equal(massylii.terminal_status, 'KEEP_SEPARATE');
  assert.equal(massylii.reviewed_decision, 'keep_both');
  assert.equal(massylii.suggested_action, 'keep_both');
  assert.equal(massylii.locked, true);
  assert.equal(massylii.left.polity_id, 'ec9d77b4-e18e-4495-8232-c51e74b0d683');
  assert.equal(massylii.right.polity_id, '81ff499c-879e-452f-9893-6618ec580825');
  assert.ok(massylii.evidence.some(e => /aa666fef-cdc2-42ef-9445-74c56ce4694d/.test(e)));
  assert.ok(massylii.evidence.some(e => /ac8bcd9e-20a7-41cf-a2e9-a9797d817dba/.test(e)));
  assert.ok(massylii.evidence.some(e => /01fdc710-556e-426a-8902-ac9e06470472/.test(e)));
  assert.ok(massylii.evidence.some(e => /certainty=uncertain/.test(e)));
  assert.ok(massylii.evidence.some(e => /academic.oup.com\/bics/.test(e)));
  assert.match(massylii.rationale, /왕권 단절/);

  const buyid = byId.get('buyid-fars-family');
  assert.equal(buyid.status, 'KEEP_SEPARATE');
  assert.equal(buyid.terminal_status, 'KEEP_SEPARATE');
  assert.equal(buyid.reviewed_decision, 'keep_both');
  assert.equal(buyid.suggested_action, 'keep_both');
  assert.equal(buyid.locked, true);
  assert.equal(buyid.left.polity_id, '523a6c6a-a16a-4e40-bbdf-fc705a4f1e9d');
  assert.equal(buyid.right.polity_id, '64e303be-fcda-46e4-8779-46bcc7698946');
  assert.ok(buyid.evidence.some(e => /503f8853-f23b-4f3a-9c91-5f742c269698/.test(e)));
  assert.ok(buyid.evidence.some(e => /375b1a46-3891-41e3-909c-8dee17b11c67/.test(e)));
  assert.ok(buyid.evidence.some(e => /980/.test(e) && /iranicaonline.org\/articles\/buyids/.test(e)));
  assert.match(buyid.rationale, /977년.*980/);

  const gnat = byId.get('gnat-turkey');
  assert.equal(gnat.status, 'KEEP_SEPARATE');
  assert.equal(gnat.terminal_status, 'KEEP_SEPARATE');
  assert.equal(gnat.reviewed_decision, 'keep_both');
  assert.equal(gnat.suggested_action, 'keep_both');
  assert.equal(gnat.locked, true);
  assert.equal(gnat.left.polity_id, '55407a83-2e02-4ea1-898a-c55bc06da69e');
  assert.equal(gnat.right.polity_id, '28448862-277d-4738-9fb4-7f51a9e4c03a');
  assert.ok(gnat.evidence.some(s => /02988a5b-06de-4451-8477-101ff095800b/.test(s)));
  assert.ok(gnat.evidence.some(s => /8b0b0654-b37e-46f7-a170-b92e99ab92a9/.test(s)));
  assert.ok(gnat.evidence.some(s => /476c1d83-c5a8-427d-8b83-e6b289be588f/.test(s)));
  assert.ok(gnat.evidence.some(s => /364/.test(s) && /anayasa.gov.tr/.test(s)));
  assert.ok(gnat.evidence.some(s => /tbmm.gov.tr\/meclis-baskanlarimiz/.test(s)));
  assert.match(gnat.rationale, /1921 헌법/);
  assert.match(gnat.rationale, /동일일 1923-10-29/);
  assert.match(gnat.rationale, /주권국가/);

  const philippines = byId.get('philippine-revolutionary-governments');
  assert.equal(philippines.status, 'KEEP_SEPARATE');
  assert.equal(philippines.terminal_status, 'KEEP_SEPARATE');
  assert.equal(philippines.reviewed_decision, 'keep_both');
  assert.equal(philippines.suggested_action, 'keep_both');
  assert.equal(philippines.locked, true);
  assert.equal(philippines.left.polity_id, '8cce76aa-c73d-4521-bda0-ba576fbb2403');
  assert.equal(philippines.right.polity_id, '346628f9-ded8-4b47-9244-9bcec2fb4f45');
  for (const activityId of [
    '78d068fd-9600-4200-85df-ad2173c668ff',
    '14400d6c-e544-4e0f-9341-43513a205d46',
    'e6b7bbe8-d528-4b37-be2b-4c38fec10d06',
    '07c65354-4a2e-4cdf-808f-4ca00cc5bb18',
    'ae7b6dc4-73aa-4145-8c49-bf8486fc9121'
  ]) assert.ok(philippines.evidence.some(s => s.includes(activityId)), activityId);
  assert.ok(philippines.evidence.some(s => /philhistoricsites.nhcp.gov.ph/.test(s)));
  assert.ok(philippines.evidence.some(s => /officialgazette.gov.ph/.test(s)));
  assert.match(philippines.rationale, /홍콩 망명/);
  assert.match(philippines.rationale, /1897-11-01/);
  assert.match(philippines.rationale, /네그로스/);

  const indonesia = byId.get('indonesia-ris-family');
  assert.equal(indonesia.status, 'REVIEW_REQUIRED');
  assert.equal(indonesia.terminal_status, null);
  assert.equal(indonesia.reviewed_decision, 'retain_RI_RIS_distinction_repair_federal_constituent_RI_and_Assaat_1949_1950');
  assert.equal(indonesia.suggested_action, 'repair');
  assert.equal(indonesia.left.polity_id, '2682c74a-3404-42be-93ae-9bcc5875a3b0');
  assert.equal(indonesia.right.polity_id, 'a0e85099-3cb0-4b9d-94bb-234ae8fcb232');
  for (const id of [
    'd27b3368-00ec-442a-9639-df45d4a2898c',
    '9de8fc17-e187-46f7-8896-82e41cc8233e',
    'b8a6196b-fecc-4689-85c7-193efb2b2dfc'
  ]) assert.ok(indonesia.evidence.some(s => s.includes(id)), id);
  assert.ok(indonesia.evidence.some(s => /2145/.test(s) && /Assaat/.test(s)));
  assert.ok(indonesia.evidence.some(s => /16 constituent states/.test(s)));
  assert.ok(indonesia.evidence.some(s => /anri.go.id/.test(s)));
  assert.ok(indonesia.evidence.some(s => /jdih.kemenkeu.go.id/.test(s)));
  assert.match(indonesia.rationale, /구성국/);
  assert.match(indonesia.rationale, /직무대행/);
  assert.match(indonesia.rationale, /1950-08-17/);
  assert.match(indonesia.rationale, /no Production write/);

  const russianDesignation = byId.get('russia-temporal-designation');
  assert.equal(russianDesignation.status, 'REVIEW_REQUIRED');
  assert.equal(russianDesignation.terminal_status, null);
  assert.equal(russianDesignation.suggested_action, 'repair');
  assert.equal(russianDesignation.reviewed_decision, 'retain_russian_polity_repair_1547_1721_temporal_designations_and_1721_precision');
  assert.equal(russianDesignation.left.polity_id, 'dd07fc4c-b3ac-59ac-bdf2-9cc190893327');
  for (const activityId of [
    'd6cdaf3b-2eab-4b98-8a17-b9c42342534f',
    '57cdefa5-9a5d-533c-b229-47e398f1d07a',
    '9ec53325-3a97-58a8-a7e7-81a496a47e57'
  ]) assert.ok(russianDesignation.evidence.some(s => s.includes(activityId)), activityId);
  assert.ok(russianDesignation.evidence.some(s => /polity_designation_name_en=null/.test(s)));
  assert.ok(russianDesignation.evidence.some(s => /prlib.ru/.test(s)));
  assert.ok(russianDesignation.evidence.some(s => /kreml.ru/.test(s)));
  assert.ok(russianDesignation.evidence.some(s => /FULLY contain/.test(s)));
  assert.match(russianDesignation.rationale, /1721/);
  assert.match(russianDesignation.rationale, /REVIEW_REQUIRED 유지/);

  const oman = byId.get('oman-empire-oman');
  assert.equal(oman.left.polity_id, '68c83ef6-0023-5af9-a6e8-26ccf5b8e116');
  assert.equal(oman.right.polity_id, 'ac7279b2-da5c-42df-a217-ac60f16106ff');
  assert.equal(oman.reviewed_decision, 'merge');
  assert.equal(oman.suggested_action, 'repair');
  assert.equal(oman.status, 'REVIEW_REQUIRED');
  assert.equal(oman.terminal_status, null);
  assert.ok(oman.evidence.some(x => /f8108b3a-2f67-526f-b996-30d8b8e91f7d/.test(x)));
  assert.ok(oman.evidence.some(x => /d9b4af96-24a6-4a0a-86d4-c0092500118b/.test(x)));
  assert.match(oman.rationale, /명시 승인 전 실행 금지/);
  const macedon = byId.get('macedon-empire');
  assert.equal(macedon.terminal_status, 'KEEP_SEPARATE');
  assert.equal(macedon.reviewed_decision, 'keep_both');
  assert.equal(macedon.locked, true);
  assert.equal(byId.get('northern-southern-song').terminal_status, null);
  assert.equal(byId.get('roman-west-east').terminal_status, null);
  assert.equal(byId.get('byzantine-nicaea-rupture').terminal_status, null);
  assert.equal(byId.get('roc-mainland-taiwan').terminal_status, null);
});

test('old 2026-09-27 candidates and Stage 2 current-named contract are explicitly demoted', () => {
  assert.equal(fs.existsSync(new URL('../atlas-polity-review-candidates.js', import.meta.url)), false);
  assert.match(snapshot, /HISTORICAL_SNAPSHOT_ONLY/);
  assert.match(snapshot, /canonical_current: false/);
  assert.match(snapshot, /superseded_by: "atlas-polity-review-registry\.js"/);
  assert.equal(stage2.status, 'HISTORICAL_SUPERSEDED');
  assert.equal(stage2.canonical_current, false);
  const yuan = stage2.families.find(row => row.id === 'yuan_northern_yuan_1368');
  assert.equal(yuan.decision_status, 'SUPERSEDED');
  assert.equal(yuan.superseded_decision.terminal_status, 'KEEP_SEPARATE');
});

test('Polity review UI exposes active historical-family audit groups and history without a dead execution priority tab', () => {
  assert.match(review, /ATLAS_POLITY_REVIEW_REGISTRY/);
  assert.doesNotMatch(review, /function executionCases\(\)/);
  assert.match(review, /function currentAuditCases\(\)/);
  assert.match(review, /function currentCases\(\)/);
  assert.match(review, /function historyCases\(\)/);
  assert.match(review, /data-kind-filter="current"/);
  assert.doesNotMatch(review, /data-kind-filter="execution"/);
  assert.doesNotMatch(review, /data-kind-filter="carry_forward_same_identity"/);
  assert.match(review, /data-kind-filter="historical_family_review"/);
  assert.match(review, /data-kind-filter="designation_residual"/);
  assert.match(review, /data-kind-filter="naming_residual"/);
  assert.match(review, /data-kind-filter="rupture_probe"/);
  assert.match(review, /FIXED \/ KEEP_SEPARATE \/ SUPERSEDED \/ NOT_PRESENT \/ HOLD_UNRESOLVED/);
  assert.match(review, /미종결 \$\{current\.length\}/);
  assert.doesNotMatch(review, /atlas-mutate|ATLAS_MUTATION_TOKEN|SUPABASE_DB_URL/);
});

test('review snapshot export is based on all current unresolved registry rows, not only Ireland and Italy', () => {
  assert.match(review, /const cases = currentCases\(\)/);
  assert.match(review, /atlas-polity-review-decisions\/v2/);
  assert.match(review, /terminal_status: row\.terminal_status/);
  assert.match(review, /review_group: row\.review_group/);
});

test('Polity Atlas routes connected Persons through canonical deep links', () => {
  const dossierIndex=nav.indexOf('atlas-polity-dossier-view.js');
  const browserIndex=nav.indexOf('atlas-polity-review-workbench.js');
  assert.ok(dossierIndex >= 0 && browserIndex > dossierIndex);
  assert.match(nav, /ATLAS_POLITY_DOSSIER_VIEW/);
  assert.match(browser, /data-polity-person-id/);
  assert.match(browser, /ATLAS_MAIN_AUTHORITY_NAV\?\.showEntity\?\.\("persons","person",personId\)/);
  assert.match(css, /polity-dossier-overview/);
  assert.match(css, /polity-dossier-designations/);
  assert.match(css, /polity-dossier-person/);
});

test('Polity surface uses the canonical dark monumental token system without legacy bright SaaS colors', () => {
  assert.match(css, /ATLAS Polity surface — V10 dark monumental integration/);
  assert.match(css, /Polity owns its nested card surfaces explicitly/);
  assert.match(css, /\.polity-browser-summary,[\s\S]*\.polity-review-card \{[\s\S]*background: var\(--atlas-surface-1\)/);
  assert.match(css, /var\(--atlas-surface-1\)/);
  assert.match(css, /var\(--atlas-surface-2\)/);
  assert.match(css, /var\(--atlas-surface-3\)/);
  assert.match(css, /var\(--atlas-divider\)/);
  assert.match(css, /var\(--atlas-text\)/);
  assert.match(css, /var\(--atlas-text-strong\)/);
  assert.match(css, /var\(--atlas-honor-metal\)/);
  assert.match(css, /var\(--atlas-success\)/);
  assert.match(css, /var\(--atlas-danger\)/);
  assert.match(css, /var\(--atlas-warning\)/);
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(css, /border-radius:999px/);
  assert.match(nav, /atlas-polity-review-workbench\.css\?v=20261008-polity-lux1-inscription-v1/);
});

test('POL-C1 gives canonical Polity cards plaque material without changing card geometry', () => {
  const start = css.indexOf('UI POL-C1 — Polity plaque material');
  assert.ok(start >= 0);
  const material = css.slice(start);

  assert.match(material, /\.polity-browser-card\{/);
  assert.match(material, /\.polity-browser-card\[open\]/);
  assert.match(material, /inset 2px 0 0 var\(--atlas-material-rail\)/);
  assert.match(material, /\.polity-dossier-overview>div/);
  assert.match(material, /\.polity-dossier-person>header/);

  assert.doesNotMatch(material, /\n\s*grid-template-columns\s*:/);
  assert.doesNotMatch(material, /\n\s*padding\s*:/);
  assert.doesNotMatch(material, /\n\s*font-size\s*:/);
  assert.doesNotMatch(material, /\n\s*line-height\s*:/);
  assert.doesNotMatch(material, /\n\s*width\s*:/);
  assert.doesNotMatch(material, /\n\s*height\s*:/);
});

test('POL-C2 refines Polity review cards without changing review geometry', () => {
  const start = css.indexOf('UI POL-C2 — Review card material');
  assert.ok(start >= 0);
  const material = css.slice(start);

  assert.match(material, /\.polity-review-filter,/);
  assert.match(material, /\.polity-review-card,/);
  assert.match(material, /\.polity-review-filter\.is-active/);
  assert.match(material, /inset 2px 0 0 var\(--atlas-material-rail\)/);
  assert.match(material, /\.polity-review-evidence/);
  assert.match(material, /\.polity-review-model-note/);

  assert.doesNotMatch(material, /#[0-9a-fA-F]{3,8}\b/);
  assert.doesNotMatch(material, /\n\s*grid-template-columns\s*:/);
  assert.doesNotMatch(material, /\n\s*padding\s*:/);
  assert.doesNotMatch(material, /\n\s*font-size\s*:/);
  assert.doesNotMatch(material, /\n\s*line-height\s*:/);
  assert.doesNotMatch(material, /\n\s*width\s*:/);
  assert.doesNotMatch(material, /\n\s*height\s*:/);
});

test('combined polity browser and review layout remains responsive', () => {
  assert.match(css, /polity-browser-kpis/);
  assert.match(css, /polity-browser-card/);
  assert.match(css, /polity-review-kpis/);
  assert.match(css, /polity-review-pair/);
  assert.match(css, /polity-review-controls/);
  assert.match(css, /atlas-polity-composite-shell/);
  assert.match(css, /@media\(max-width:1100px\)/);
  assert.match(css, /@media\(max-width:900px\)/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /@media\(max-width:600px\)/);
});


test('POLITY-M1 restores the shared focus language after late Polity CSS', () => {
  const start = css.indexOf('POLITY-M1 — Late focus ownership');
  assert.ok(start >= 0);
  const focus = css.slice(start, css.indexOf('/* GLOBAL-M3 — Inscription typography.', start));

  for (const selector of [
    '.polity-browser-filters button:focus-visible',
    '.polity-browser-card>summary:focus-visible',
    '.polity-review-filter:focus-visible',
    '.polity-dossier-person>header button:focus-visible'
  ]) {
    assert.ok(focus.includes(selector), `missing focus selector: ${selector}`);
  }

  assert.match(focus, /outline:1px solid var\(--atlas-focus-ring\)/);
  assert.match(focus, /outline-offset:2px/);
  assert.match(focus, /\.polity-browser-controls input:focus,[\s\S]*?\.polity-review-controls textarea:focus\{[^}]*border-color:var\(--atlas-material-hairline-strong\)[^}]*outline:1px solid var\(--atlas-focus-ring\)[^}]*box-shadow:none/);
  assert.doesNotMatch(focus, /rgba\(/);

  assert.match(css, /\.polity-review-filter\.is-active\{[^}]*border-color:rgba\(208,188,145,\.28\)/);
  assert.match(css, /\.polity-review-filter\.is-active\{[\s\S]*?inset 2px 0 0 var\(--atlas-material-rail\)/);
});


test('POLITY-M2 keeps filter hover, pressed, and selected luminance semantically distinct', () => {
  const start = css.indexOf('POLITY-M2 — Filter interaction luminance ownership');
  assert.ok(start >= 0);
  const end = css.indexOf('/* POLITY-M1 — Late focus ownership.', start);
  const interaction = css.slice(start, end);

  assert.match(interaction, /@media\(hover:hover\)/);
  assert.match(interaction, /\.polity-browser-filters button:hover:not\(\.is-active\)\{[^}]*var\(--atlas-material-wash-hover\)/);
  assert.match(interaction, /\.polity-review-filter:hover:not\(\.is-active\)\{[^}]*var\(--atlas-material-wash-hover\)/);

  assert.match(interaction, /\.polity-browser-filters button:active:not\(\.is-active\)\{[^}]*var\(--atlas-material-wash-active\)/);
  assert.match(interaction, /\.polity-review-filter:active:not\(\.is-active\)\{[^}]*var\(--atlas-material-wash-active\)/);

  assert.match(interaction, /\.polity-browser-filters button\.is-active\{[^}]*border-color:var\(--atlas-honor-metal\)[^}]*var\(--atlas-material-wash-selected\)[^}]*color:var\(--atlas-honor-metal-strong\)/);
  assert.match(interaction, /\.polity-review-filter\.is-active\{[^}]*var\(--atlas-material-wash-selected\)/);

  assert.doesNotMatch(interaction, /background:rgba\(192,174,136,\.08\)/);
  assert.match(css, /\.polity-review-filter\.is-active\{[^}]*border-color:rgba\(208,188,145,\.28\)/);
  assert.match(css, /\.polity-review-filter\.is-active\{[\s\S]*?inset 2px 0 0 var\(--atlas-material-rail\)/);
});


test('POLITY-M3 moves top-level structural edges onto shared GLOBAL-M1 hairlines', () => {
  const start = css.indexOf('POLITY-M3 — Structural edge material ownership');
  assert.ok(start >= 0);
  const end = css.indexOf('/* POLITY-M2 — Filter interaction luminance ownership.', start);
  const material = css.slice(start, end);

  for (const selector of [
    '.polity-browser-summary',
    '.polity-browser-dataset',
    '.polity-browser-controls',
    '.polity-browser-state',
    '.polity-review-summary',
    '.polity-review-dataset',
    '.polity-review-toolbar'
  ]) {
    assert.ok(material.includes(selector), `missing structural selector: ${selector}`);
  }

  assert.match(material, /border-color:var\(--atlas-material-hairline\)/);
  assert.match(material, /\.polity-browser-kpis>div,[\s\S]*?\.polity-review-dataset-kpis>div\{[^}]*border-color:var\(--atlas-material-hairline-soft\)/);
  assert.match(material, /\.polity-browser-filters button\{[^}]*border-color:var\(--atlas-material-hairline\)/);
  assert.match(material, /\.atlas-polity-review-section::before\{[^}]*background:var\(--atlas-material-hairline\)/);

  assert.doesNotMatch(material, /atlas-divider/);
  assert.doesNotMatch(material, /\n\s*(?:padding|grid-template-columns|font-size|line-height|width|height)\s*:/);
});
