"use strict";

const { createPostgresClient } = require("../server/atlas-postgres-client.js");

const POLITY_IDS = Object.freeze([
  "4c8e994a-e8a4-4df6-bb96-515710137659",
  "4d56270a-2cb8-5fd1-ae04-1e672a18bda9",
  "6c370c77-c277-4d54-9049-74f91cafe3e1",
  "8868855c-8bcb-4516-b08e-18bb8ac9bf57",
  "8f289916-7b94-41c2-86c2-1a86a8c35ad1",
  "db21224f-07d8-52a4-8998-8c22cf02a29d",
  "f2dcb9c7-7644-5085-970c-98179270c382",
  "aab8735a-db0d-48c5-aa3c-3c771c2225a3",
  "96709e03-8f1c-5617-98ac-934f3c23773c",
  "4e27f818-e340-523b-ae8b-5234411e2f6f",
  "445877dd-9042-5c10-9817-e7cffefb1ff5",
  "02799a44-7993-4823-8cd8-24ed24859225",
  "4f2dc586-a591-4752-8ae6-231bd79c5aae",
  "9b44cc47-4fa5-5d4e-b20a-996e2406ae34",
  "b1bf276a-697f-46c4-b671-b7b91117cfe3",
  "cf32a358-bf8e-483c-942a-dd3f75f3f8fc",
  "ea57ae38-fc00-4d17-a18a-ff32698b3a55",
  "54ddce01-7ba5-4f7f-b04a-525cc11dcba7",
  "4b532151-7e16-4bb3-8b55-cb1bf009ca36",
  "0efc6547-1624-4d89-9965-a6b62851fc24",
  "31062b53-00a7-4f96-8ae2-430e25096841",
  "b5c822ac-54b1-4adb-b70d-9282bdf635eb",
  "2e52de5b-34f9-43db-9d07-66fb9103951a"
]);

module.exports = async function handler(req, res) {
  if (String(req.method || "GET").toUpperCase() !== "GET") {
    res.status(405).json({ ok: false, error: "method not allowed" });
    return;
  }
  const databaseUrl = String(process.env.SUPABASE_DB_URL || "");
  if (!databaseUrl) {
    res.status(503).json({ ok: false, error: "db unavailable" });
    return;
  }
  const client = await createPostgresClient(databaseUrl);
  try {
    const result = await client.query(`
      select p.id::text,
             p.canonical_key,
             p.polity_type,
             en.name as canonical_name_en,
             ko.name as display_name_ko
        from atlas_v2.polities p
        left join atlas_v2.polity_names en
          on en.polity_id=p.id and en.locale='en' and en.is_preferred=true
        left join atlas_v2.polity_names ko
          on ko.polity_id=p.id and ko.locale='ko' and ko.is_preferred=true
       where p.id = any($1::uuid[])
       order by p.id::text
    `, [POLITY_IDS]);
    res.status(200).json({ ok: true, expected: POLITY_IDS.length, count: result.rows.length, rows: result.rows });
  } finally {
    await client.end();
  }
};
