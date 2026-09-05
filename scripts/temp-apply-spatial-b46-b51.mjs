import fs from 'node:fs';

const indexPath = 'atlas-polity-spatial-index.json';
const coveragePath = 'tests/person-spacetime-spatial-index-coverage.test.mjs';
const taxonomyPath = 'tests/spacetime-taxonomy-migration.test.mjs';

const mappings = [
  ['5c4c759d-8d16-40bd-8da3-9b8841e66faf','africa','maghreb-north-africa'],
  ['79fa797b-a418-43c7-8947-ddf920c93216','africa','maghreb-north-africa'],
  ['79e75465-8903-495a-aa45-eed64364b96c','africa','nile-valley'],
  ['5426f80a-e10c-4a4f-8adb-9c96e41a3f0e','south-asia','northwest-south-asia'],
  ['64e303be-fcda-46e4-8779-46bcc7698946','west-asia','iranian-plateau'],
  ['736a1115-5f59-49d3-95e5-cd16a2634bcd','west-asia','iranian-plateau'],
  ['6bc0346c-854f-4cf3-844c-8e2352b9037c','south-asia','northwest-south-asia'],
  ['e88b8ef5-e902-44b1-bd2a-471065914b84','central-asia','western-central-asia'],
  ['32780dd8-6fa5-419b-80d6-5b620f9fc483','west-asia','arabia'],
  ['0fbb1e5b-4661-4696-9d1f-ec77bbe2d75a','west-asia','arabia'],

  ['2dc72079-950c-49b7-bf95-1107f0990c66','europe','central-europe'],
  ['03251aab-6b3b-4889-af00-7733e96926eb','europe','western-europe'],
  ['45a8c3f3-cf7e-415a-a51c-b651b2761828','europe','western-europe'],
  ['f48c1835-d324-4b02-9e41-efb4a70d9e26','europe','western-europe'],
  ['2689211c-9a3e-469e-baf5-f53a6ad7251a','europe','balkans'],
  ['c243f89f-387f-4f0b-88bd-407eea581608','west-asia','levant'],
  ['c341f63e-9edc-44e4-8ca2-f1b35ed19aff','europe','italy'],
  ['a865deba-4232-4345-8b11-24ee69bd1571','europe','western-europe'],
  ['4a92bbb3-6532-4dab-b515-837ad344ec6c','europe','balkans'],
  ['a7049680-e80e-40a0-9aec-4efeaeb0f301','europe','balkans'],

  ['3a04b31b-c924-4f94-9437-7f4e44443551','americas','mesoamerica'],
  ['0c00c5d5-18ca-41cd-a5a6-64302f510a5e','east-asia','japan'],
  ['488eb50f-a337-424c-84df-267cd6466274','east-asia','japan'],
  ['edb0fd82-bdfb-43cc-9cc1-1f2b0988a65e','americas','north-america'],
  ['06a5269b-a50e-43e6-b7b9-cbc6326b543e','americas','north-america'],
  ['e3c0d085-7920-4f04-a73c-bbe53c599ddb','africa','southern-africa'],
  ['0ae92b43-72df-4717-badb-1e791da70446','africa','west-africa'],
  ['6416407c-a273-4b28-953b-63926e395aa0','southeast-asia','mainland-southeast-asia'],
  ['a54b71d7-407b-478c-bf81-4a0c10c5b400','south-asia','north-india-ganges'],
  ['b5999a20-dc94-4cae-b686-62ccbc4bae79','africa','central-africa'],

  ['9ae22c82-4c08-4390-b1e6-9068b8a55517','south-asia','northwest-south-asia'],
  ['7a70c17b-7c67-485b-9e39-3d7b3b97b98e','south-asia','northwest-south-asia'],
  ['b2b1c5ff-699c-450d-8905-b66b9158402f','central-asia','western-central-asia'],
  ['7ab7da46-b310-4e76-a327-ed12c131041a','central-asia','western-central-asia'],
  ['593ad49d-fa94-42cf-a885-cfb39b683690','central-asia','western-central-asia'],
  ['c959dbae-fdb6-4265-910c-99115a7ceae3','central-asia','western-central-asia'],
  ['1a40ac8a-22f0-46b0-937f-50e058b1ed44','central-asia','western-central-asia'],
  ['f8922bfd-ca59-41fa-a90e-c95b644ba92f','south-asia','deccan-south-india'],
  ['72c5aca6-0ef1-42a7-8b1a-925b3fe8d489','southeast-asia','maritime-southeast-asia'],
  ['cc73ada3-d573-4200-911e-0aec4e71e927','southeast-asia','maritime-southeast-asia'],

  ['b1bf3f84-bc3a-44cb-996b-98f006edba10','africa','east-africa-horn'],
  ['4f2dc07e-84ff-4704-bcc6-ac43114615bb','africa','east-africa-horn'],
  ['df263cd1-e567-4764-8df5-e2bc6a5e1d39','africa','southern-africa'],
  ['0e03fa5d-c55c-4b78-a9ad-45e91ec1c228','africa','southern-africa'],
  ['9b44bca9-5696-4a2e-98eb-9f888e805634','africa','east-africa-horn'],
  ['cf32afb7-e889-4ced-a3ee-a85554b0da0a','africa','east-africa-horn'],
  ['3afe7694-2276-4a49-9991-d30ad84d3f1e','africa','southern-africa'],
  ['c6a2181d-3263-4e46-9349-214b85eead32','africa','central-africa'],
  ['ee06472a-832c-4d2a-8dcb-d720df21d2e8','africa','central-africa'],
  ['28294ea4-bf1d-4d9f-9518-4cf7194e24e2','africa','west-africa'],

  ['461a96d9-7e35-4bf9-a415-c0e38b95c0ac','southeast-asia','mainland-southeast-asia'],
  ['90d03d94-41bc-42b6-b910-f6c0c498bd20','southeast-asia','mainland-southeast-asia'],
  ['7db22a38-3fa8-456e-9def-4a94d3acb78c','southeast-asia','maritime-southeast-asia'],
  ['757c29dc-5fd7-49a0-9c30-3e09f0bd3a73','west-asia','arabia'],
  ['e69eb534-9e2a-485c-9430-8df2ec2212a1','west-asia','arabia'],
  ['4015e9b7-cfe1-4d00-899d-83c3f8c5c780','europe','italy'],
  ['1fa34f00-ab5b-4e46-971b-1fd7cb2aba71','europe','italy'],
  ['03824379-85aa-41f3-a2ef-82502832c26c','europe','balkans'],
  ['09ff1776-171f-435a-a444-4b0463e48137','europe','central-europe'],
  ['cfd14999-006b-4af1-800e-fd61eecec63e','americas','north-america']
];

if (mappings.length !== 60 || new Set(mappings.map(([id]) => id)).size !== 60) throw new Error('B46_B51_MAPPING_SET_INVALID');
const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
const pfIds = new Set((index.place_function_records || []).map((record) => String(record.polity_id)));
if (Object.keys(index.polity_geography).length !== 787) throw new Error(`B46_B51_GEOGRAPHY_BASELINE_DRIFT:${Object.keys(index.polity_geography).length}`);
if (Object.keys(index.polity_subregions).length !== 761) throw new Error(`B46_B51_SUBREGION_BASELINE_DRIFT:${Object.keys(index.polity_subregions).length}`);

for (const [id, macro, subregion] of mappings) {
  if (Object.hasOwn(index.polity_geography, id)) throw new Error(`B46_B51_ALREADY_GEOGRAPHY:${id}`);
  if (Object.hasOwn(index.polity_subregions, id)) throw new Error(`B46_B51_ALREADY_SUBREGION:${id}`);
  if (pfIds.has(id)) throw new Error(`B46_B51_TEMPORAL_PF_CONFLICT:${id}`);
  index.polity_geography[id] = macro;
  index.polity_subregions[id] = subregion;
}
index.polity_geography = Object.fromEntries(Object.entries(index.polity_geography).sort(([a],[b]) => a.localeCompare(b)));
index.polity_subregions = Object.fromEntries(Object.entries(index.polity_subregions).sort(([a],[b]) => a.localeCompare(b)));
if (Object.keys(index.polity_geography).length !== 847) throw new Error('B46_B51_GEOGRAPHY_TARGET_MISMATCH');
if (Object.keys(index.polity_subregions).length !== 821) throw new Error('B46_B51_SUBREGION_TARGET_MISMATCH');
fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

function replaceExact(path, from, to) {
  const before = fs.readFileSync(path, 'utf8');
  const count = before.split(from).length - 1;
  if (count !== 1) throw new Error(`B46_B51_REPLACE_COUNT:${path}:${from}:${count}`);
  fs.writeFileSync(path, before.replace(from, to));
}
replaceExact(coveragePath, 'assert.equal(Object.keys(index.polity_geography).length, 787);', 'assert.equal(Object.keys(index.polity_geography).length, 847);');
replaceExact(coveragePath, 'assert.equal(Object.keys(index.polity_subregions).length, 761);', 'assert.equal(Object.keys(index.polity_subregions).length, 821);');
replaceExact(taxonomyPath, '  mesoamerica: 21,', '  mesoamerica: 22,');
replaceExact(taxonomyPath, '  "maghreb-north-africa": 19,', '  "maghreb-north-africa": 21,');
replaceExact(taxonomyPath, '  "nile-valley": 12,', '  "nile-valley": 13,');
replaceExact(taxonomyPath, '  levant: 18,', '  levant: 19,');
replaceExact(taxonomyPath, 'assert.equal(Object.keys(index.polity_subregions).length, 761);', 'assert.equal(Object.keys(index.polity_subregions).length, 821);');

console.log(JSON.stringify({marker:'ATLAS_SPATIAL_B46_B51_APPLIED', mappings:mappings.length, geography:847, subregions:821}, null, 2));
