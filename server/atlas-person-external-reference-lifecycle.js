"use strict";

function semanticReference(row) {
  return Object.freeze({
    status: row?.status == null ? null : String(row.status),
    document_title: row?.document_title == null ? null : String(row.document_title),
    url: row?.url == null ? null : String(row.url)
  });
}

function sameSemanticReference(left, right) {
  const a = semanticReference(left);
  const b = semanticReference(right);
  return a.status === b.status
    && a.document_title === b.document_title
    && a.url === b.url;
}

async function reconcilePersonExternalReferences(client, sourcePersonId, survivorPersonId) {
  const locked = await client.query(`
    select person_id::text,provider,status,checked_at::text,document_title,url
      from atlas_v2.person_external_references
     where person_id=any($1::uuid[])
     order by person_id,provider
     for update`, [[sourcePersonId, survivorPersonId]]);

  const survivorByProvider = new Map();
  const sourceRows = [];
  for (const row of locked.rows || []) {
    if (String(row.person_id) === String(survivorPersonId)) survivorByProvider.set(String(row.provider), row);
    else if (String(row.person_id) === String(sourcePersonId)) sourceRows.push(row);
  }

  const outcome = { moved: 0, collapsed: 0, providers: [] };
  for (const source of sourceRows) {
    const provider = String(source.provider);
    const survivor = survivorByProvider.get(provider);
    if (!survivor) {
      const moved = await client.query(`
        update atlas_v2.person_external_references
           set person_id=$2::uuid,updated_at=now()
         where person_id=$1::uuid and provider=$3
         returning provider`, [sourcePersonId, survivorPersonId, provider]);
      if (moved.rowCount !== 1) throw new Error(`PERSON_EXTERNAL_REFERENCE_MOVE_FAILED:${provider}`);
      outcome.moved += 1;
      outcome.providers.push({ provider, action: "moved" });
      survivorByProvider.set(provider, { ...source, person_id: survivorPersonId });
      continue;
    }

    if (!sameSemanticReference(source, survivor)) {
      const error = new Error(`PERSON_EXTERNAL_REFERENCE_MERGE_CONFLICT:${provider}`);
      error.code = "PERSON_EXTERNAL_REFERENCE_MERGE_CONFLICT";
      error.provider = provider;
      throw error;
    }

    await client.query(`
      update atlas_v2.person_external_references
         set checked_at=greatest(checked_at,$3::date),updated_at=now()
       where person_id=$1::uuid and provider=$2`, [survivorPersonId, provider, source.checked_at]);
    const removed = await client.query(`
      delete from atlas_v2.person_external_references
       where person_id=$1::uuid and provider=$2
       returning provider`, [sourcePersonId, provider]);
    if (removed.rowCount !== 1) throw new Error(`PERSON_EXTERNAL_REFERENCE_COLLAPSE_FAILED:${provider}`);
    outcome.collapsed += 1;
    outcome.providers.push({ provider, action: "collapsed" });
  }

  return Object.freeze({
    moved: outcome.moved,
    collapsed: outcome.collapsed,
    providers: Object.freeze(outcome.providers)
  });
}

async function deletePersonExternalReferences(client, personId) {
  const deleted = await client.query(`
    delete from atlas_v2.person_external_references
     where person_id=$1::uuid
     returning provider`, [personId]);
  return deleted.rowCount;
}

module.exports = Object.freeze({
  semanticReference,
  sameSemanticReference,
  reconcilePersonExternalReferences,
  deletePersonExternalReferences
});
