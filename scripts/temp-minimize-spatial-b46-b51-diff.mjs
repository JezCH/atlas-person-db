import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const baseSha = 'e2e47b4d9fd8ca4769065671614743126359822e';
const path = 'atlas-polity-spatial-index.json';
const current = JSON.parse(fs.readFileSync(path, 'utf8'));
const base = JSON.parse(execFileSync('git', ['show', `${baseSha}:${path}`], { encoding: 'utf8' }));

const addedGeo = Object.keys(current.polity_geography).filter((id) => !Object.hasOwn(base.polity_geography, id));
const addedSub = Object.keys(current.polity_subregions).filter((id) => !Object.hasOwn(base.polity_subregions, id));
if (addedGeo.length !== 60 || addedSub.length !== 60) throw new Error(`B46_B51_DELTA_SIZE:${addedGeo.length}:${addedSub.length}`);
if (new Set(addedGeo).size !== 60 || addedGeo.some((id) => !addedSub.includes(id))) throw new Error('B46_B51_DELTA_ID_MISMATCH');

for (const id of addedGeo) {
  base.polity_geography[id] = current.polity_geography[id];
  base.polity_subregions[id] = current.polity_subregions[id];
}
if (Object.keys(base.polity_geography).length !== 847 || Object.keys(base.polity_subregions).length !== 821) throw new Error('B46_B51_TARGET_COUNT_MISMATCH');
fs.writeFileSync(path, `${JSON.stringify(base, null, 2)}\n`);
console.log(JSON.stringify({marker:'ATLAS_SPATIAL_B46_B51_MINIMAL_DIFF', added:60}, null, 2));
