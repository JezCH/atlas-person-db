"use strict";

function portraitSnapshot(row) {
  if (!row) return null;
  return Object.freeze({ person_id:String(row.person_id), asset_sha256:String(row.asset_sha256) });
}

async function lockPortraits(client, personIds) {
  const result = await client.query(`
    select person_id::text,asset_sha256
      from atlas_v2.person_portraits
     where person_id=any($1::uuid[])
     order by person_id
     for update`, [personIds]);
  return (result.rows || []).map(portraitSnapshot);
}

async function reconcilePersonPortraits(client, sourcePersonId, survivorPersonId) {
  const portraits = await lockPortraits(client, [sourcePersonId, survivorPersonId]);
  const source = portraits.find((row) => row.person_id === String(sourcePersonId)) || null;
  const survivor = portraits.find((row) => row.person_id === String(survivorPersonId)) || null;
  if (source && survivor) {
    const error = new Error("PERSON_PORTRAIT_MERGE_CONFLICT");
    error.code = "PERSON_PORTRAIT_MERGE_CONFLICT";
    error.source_portrait = source;
    error.survivor_portrait = survivor;
    throw error;
  }
  if (!source) return Object.freeze({ moved:0, survivor_kept:Boolean(survivor) });
  const moved = await client.query(`
    update atlas_v2.person_portraits
       set person_id=$2::uuid,updated_at=now()
     where person_id=$1::uuid
     returning person_id::text,asset_sha256`, [sourcePersonId, survivorPersonId]);
  if (moved.rowCount !== 1) throw new Error("PERSON_PORTRAIT_MOVE_FAILED");
  return Object.freeze({ moved:1, survivor_kept:false, portrait:portraitSnapshot(moved.rows[0]) });
}

async function deletePersonPortrait(client, personId) {
  const deleted = await client.query("delete from atlas_v2.person_portraits where person_id=$1::uuid returning person_id", [personId]);
  return Object.freeze({ portraits:deleted.rowCount });
}

module.exports = Object.freeze({ portraitSnapshot, lockPortraits, reconcilePersonPortraits, deletePersonPortrait });
