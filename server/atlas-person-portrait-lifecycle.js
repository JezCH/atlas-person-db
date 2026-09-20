"use strict";

function portraitSnapshot(row) {
  if (!row) return null;
  return Object.freeze({
    person_id: String(row.person_id),
    asset_sha256: String(row.asset_sha256),
    portrait_kind: String(row.portrait_kind),
    evidence_level: String(row.evidence_level),
    source_count: Number(row.source_count || 0)
  });
}

async function lockPortraits(client, personIds) {
  const result = await client.query(`
    select
      pp.person_id::text,
      pp.asset_sha256,
      pp.portrait_kind,
      pp.evidence_level,
      (select count(*)::int
         from atlas_v2.person_portrait_sources pps
        where pps.person_id=pp.person_id) as source_count
      from atlas_v2.person_portraits pp
     where pp.person_id=any($1::uuid[])
     order by pp.person_id
     for update`, [personIds]);
  return (result.rows || []).map(portraitSnapshot);
}

async function reconcilePersonPortraits(client, sourcePersonId, survivorPersonId) {
  const portraits = await lockPortraits(client, [sourcePersonId, survivorPersonId]);
  const source = portraits.find((row) => row.person_id === String(sourcePersonId)) || null;
  const survivor = portraits.find((row) => row.person_id === String(survivorPersonId)) || null;

  if (!source) {
    return Object.freeze({ moved:0, source_links_moved:0, survivor_kept:Boolean(survivor) });
  }

  if (survivor) {
    const error = new Error("PERSON_PORTRAIT_MERGE_CONFLICT");
    error.code = "PERSON_PORTRAIT_MERGE_CONFLICT";
    error.source_portrait = source;
    error.survivor_portrait = survivor;
    throw error;
  }

  const moved = await client.query(`
    update atlas_v2.person_portraits
       set person_id=$2::uuid,updated_at=now()
     where person_id=$1::uuid
     returning person_id::text,asset_sha256,portrait_kind,evidence_level`,
    [sourcePersonId, survivorPersonId]);
  if (moved.rowCount !== 1) throw new Error("PERSON_PORTRAIT_MOVE_FAILED");

  return Object.freeze({
    moved:1,
    source_links_moved:source.source_count,
    survivor_kept:false,
    portrait:Object.freeze({
      person_id:String(moved.rows[0].person_id),
      asset_sha256:String(moved.rows[0].asset_sha256),
      portrait_kind:String(moved.rows[0].portrait_kind),
      evidence_level:String(moved.rows[0].evidence_level)
    })
  });
}

async function deletePersonPortrait(client, personId) {
  const countResult = await client.query(`
    select count(*)::int as source_count
      from atlas_v2.person_portrait_sources
     where person_id=$1::uuid`, [personId]);
  const sourceCount = Number(countResult.rows[0]?.source_count || 0);
  const deleted = await client.query(`
    delete from atlas_v2.person_portraits
     where person_id=$1::uuid
     returning person_id`, [personId]);
  return Object.freeze({ portraits:deleted.rowCount, portrait_sources:sourceCount });
}

module.exports = Object.freeze({
  portraitSnapshot,
  lockPortraits,
  reconcilePersonPortraits,
  deletePersonPortrait
});
