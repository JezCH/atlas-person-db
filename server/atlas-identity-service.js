"use strict";

function normalizeExact(value) {
  return String(value ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}

function required(value, field) {
  const normalized = normalizeExact(value);
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function boolean(value) {
  return value === true;
}

function sameText(left, right) {
  return String(left ?? "") === String(right ?? "");
}

async function advisoryLocks(client, keys) {
  const ordered = [...new Set(keys.map((key) => normalizeExact(key)).filter(Boolean))].sort();
  for (const key of ordered) {
    await client.query("select pg_advisory_xact_lock(hashtext($1))", [key]);
  }
}

async function exactNameCollision(client, table, ownerColumn, name, excludeId = null) {
  const result = await client.query(
    `select ${ownerColumn} as owner_id
       from atlas_v2.${table}
      where name=$1
        and ($2::uuid is null or ${ownerColumn}<>$2::uuid)
      group by ${ownerColumn}
      order by ${ownerColumn}
      limit 1`,
    [name, excludeId]
  );
  return result.rows[0]?.owner_id || null;
}

async function createPerson(client, raw) {
  const canonicalName = required(raw?.canonical_name_en, "canonical_name_en");
  const displayName = required(raw?.display_name_ko, "display_name_ko");
  const canonicalKey = normalizeExact(raw?.canonical_key) || canonicalName;
  const personType = normalizeExact(raw?.person_type) || "historical";
  const historicity = normalizeExact(raw?.historicity) || "historical";
  const allowDisplayCollision = boolean(raw?.allow_display_name_collision);

  await advisoryLocks(client, [
    `atlas-identity:person:key:${canonicalKey}`,
    `atlas-identity:person:name:${canonicalName}`,
    `atlas-identity:person:name:${displayName}`
  ]);

  const existing = await client.query(`
    select p.id,p.person_type,p.historicity,
           en.name as canonical_name_en,ko.name as display_name_ko
      from atlas_v2.persons p
      left join atlas_v2.person_names en on en.person_id=p.id and en.locale='en' and en.is_preferred=true
      left join atlas_v2.person_names ko on ko.person_id=p.id and ko.locale='ko' and ko.is_preferred=true
     where p.canonical_key=$1
     for update of p`, [canonicalKey]);

  if (existing.rows.length === 1) {
    const row = existing.rows[0];
    if (sameText(row.person_type, personType)
      && sameText(row.historicity, historicity)
      && sameText(row.canonical_name_en, canonicalName)
      && sameText(row.display_name_ko, displayName)) {
      return { entity: "person", id: row.id, canonical_key: canonicalKey, replay: true };
    }
    throw new Error("PERSON_CANONICAL_KEY_CONFLICT");
  }

  if (await exactNameCollision(client, "person_names", "person_id", canonicalName)) {
    throw new Error("PERSON_CANONICAL_NAME_COLLISION");
  }
  if (!allowDisplayCollision && await exactNameCollision(client, "person_names", "person_id", displayName)) {
    throw new Error("PERSON_DISPLAY_NAME_COLLISION_REVIEW_REQUIRED");
  }

  const inserted = await client.query(
    `insert into atlas_v2.persons(id,canonical_key,person_type,historicity) values(gen_random_uuid(),$1,$2,$3) returning id`,
    [canonicalKey, personType, historicity]
  );
  const id = inserted.rows[0]?.id;
  if (!id) throw new Error("PERSON_CREATE_FAILED");
  await client.query(
    `insert into atlas_v2.person_names(id,person_id,locale,name,name_type,is_preferred) values
      (gen_random_uuid(),$1,'en',$2,'canonical',true),
      (gen_random_uuid(),$1,'ko',$3,'display',true)`,
    [id, canonicalName, displayName]
  );
  return { entity: "person", id, canonical_key: canonicalKey, replay: false };
}

async function createPolity(client, raw) {
  const canonicalName = required(raw?.canonical_name_en, "canonical_name_en");
  const displayName = required(raw?.display_name_ko, "display_name_ko");
  const canonicalKey = normalizeExact(raw?.canonical_key) || canonicalName;
  const polityType = normalizeExact(raw?.polity_type) || "historical_polity";
  const historicity = normalizeExact(raw?.historicity) || "historical";
  const allowDisplayCollision = boolean(raw?.allow_display_name_collision);

  await advisoryLocks(client, [
    `atlas-identity:polity:key:${canonicalKey}`,
    `atlas-identity:polity:name:${canonicalName}`,
    `atlas-identity:polity:name:${displayName}`
  ]);

  const existing = await client.query(`
    select p.id,p.polity_type,p.historicity,
           en.name as canonical_name_en,ko.name as display_name_ko
      from atlas_v2.polities p
      left join atlas_v2.polity_names en on en.polity_id=p.id and en.locale='en' and en.is_preferred=true
      left join atlas_v2.polity_names ko on ko.polity_id=p.id and ko.locale='ko' and ko.is_preferred=true
     where p.canonical_key=$1
     for update of p`, [canonicalKey]);

  if (existing.rows.length === 1) {
    const row = existing.rows[0];
    if (sameText(row.polity_type, polityType)
      && sameText(row.historicity, historicity)
      && sameText(row.canonical_name_en, canonicalName)
      && sameText(row.display_name_ko, displayName)) {
      return { entity: "polity", id: row.id, canonical_key: canonicalKey, replay: true };
    }
    throw new Error("POLITY_CANONICAL_KEY_CONFLICT");
  }

  if (await exactNameCollision(client, "polity_names", "polity_id", canonicalName)) {
    throw new Error("POLITY_CANONICAL_NAME_COLLISION");
  }
  if (!allowDisplayCollision && await exactNameCollision(client, "polity_names", "polity_id", displayName)) {
    throw new Error("POLITY_DISPLAY_NAME_COLLISION_REVIEW_REQUIRED");
  }

  const inserted = await client.query(
    `insert into atlas_v2.polities(id,canonical_key,polity_type,historicity) values(gen_random_uuid(),$1,$2,$3) returning id`,
    [canonicalKey, polityType, historicity]
  );
  const id = inserted.rows[0]?.id;
  if (!id) throw new Error("POLITY_CREATE_FAILED");
  await client.query(
    `insert into atlas_v2.polity_names(id,polity_id,locale,name,name_type,is_preferred) values
      (gen_random_uuid(),$1,'en',$2,'canonical',true),
      (gen_random_uuid(),$1,'ko',$3,'display',true)`,
    [id, canonicalName, displayName]
  );
  return { entity: "polity", id, canonical_key: canonicalKey, replay: false };
}

async function roleCollision(client, value, excludeId = null) {
  const result = await client.query(`
    select r.id
      from atlas_v2.roles r
      left join atlas_v2.role_names rn on rn.role_id=r.id
     where ($2::uuid is null or r.id<>$2::uuid)
       and (r.code=$1 or r.source_label=$1 or rn.name=$1)
     group by r.id
     order by r.id
     limit 1`, [value, excludeId]);
  return result.rows[0]?.id || null;
}

async function createRole(client, raw) {
  const code = required(raw?.code, "code");
  const sourceLabel = required(raw?.source_label, "source_label");
  const displayName = required(raw?.display_name_ko, "display_name_ko");
  const category = required(raw?.category, "category");

  await advisoryLocks(client, [
    `atlas-identity:role:token:${code}`,
    `atlas-identity:role:token:${sourceLabel}`,
    `atlas-identity:role:token:${displayName}`
  ]);

  const existing = await client.query(`
    select r.id,r.category,r.source_label,r.is_active,
           en.name as canonical_name_en,ko.name as display_name_ko
      from atlas_v2.roles r
      left join atlas_v2.role_names en on en.role_id=r.id and en.locale='en' and en.is_preferred=true
      left join atlas_v2.role_names ko on ko.role_id=r.id and ko.locale='ko' and ko.is_preferred=true
     where r.code=$1
     for update of r`, [code]);
  if (existing.rows.length === 1) {
    const row = existing.rows[0];
    if (sameText(row.category, category)
      && sameText(row.source_label, sourceLabel)
      && row.is_active === true
      && sameText(row.canonical_name_en, sourceLabel)
      && sameText(row.display_name_ko, displayName)) {
      return { entity: "role", id: row.id, code, replay: true };
    }
    throw new Error("ROLE_CODE_CONFLICT");
  }

  if (await roleCollision(client, code)) throw new Error("ROLE_CODE_COLLIDES_WITH_EXISTING_VOCABULARY");
  if (await roleCollision(client, sourceLabel)) throw new Error("ROLE_SOURCE_LABEL_COLLISION");

  // Localized display labels are presentation vocabulary, not Role identity.
  // Distinct canonical roles may legitimately share the same Korean label.
  const inserted = await client.query(
    `insert into atlas_v2.roles(id,code,category,source_label,is_active) values(gen_random_uuid(),$1,$2,$3,true) returning id`,
    [code, category, sourceLabel]
  );
  const id = inserted.rows[0]?.id;
  if (!id) throw new Error("ROLE_CREATE_FAILED");
  await client.query(
    `insert into atlas_v2.role_names(id,role_id,locale,name,is_preferred) values
      (gen_random_uuid(),$1,'en',$2,true),
      (gen_random_uuid(),$1,'ko',$3,true)`,
    [id, sourceLabel, displayName]
  );
  return { entity: "role", id, code, replay: false };
}

function createIdentityService({ client } = {}) {
  if (!client || typeof client.query !== "function") throw new Error("PostgreSQL client is required");

  async function mutate(operation, payload) {
    const op = normalizeExact(operation).toLowerCase();
    const executors = {
      create_person: createPerson,
      create_polity: createPolity,
      create_role: createRole
    };
    const execute = executors[op];
    if (!execute) throw new Error("UNSUPPORTED_IDENTITY_OPERATION");

    await client.query("begin isolation level serializable");
    try {
      const result = await execute(client, payload || {});
      await client.query("commit");
      return Object.freeze({ marker: "ATLAS_IDENTITY_AUTHORING_V1", operation: op, committed: true, ...result });
    } catch (error) {
      try { await client.query("rollback"); } catch {}
      throw error;
    }
  }

  return Object.freeze({ mutate });
}

module.exports = Object.freeze({
  createIdentityService,
  normalizeExact,
  advisoryLocks,
  createPerson,
  createPolity,
  createRole
});
