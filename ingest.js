(() => {
  "use strict";

  const legacyMigrations = [
    {
      old_name: "이순신",
      person_name: "Yi Sun-sin",
      politic_name: "Joseon",
      activity_start: 1576,
      activity_end: 1598,
      role: "Military officer and naval commander",
      period_basis: "military_activity",
      notes: "Passed the military examination and entered government service in 1576; served as Joseon's leading naval commander and was killed at the Battle of Noryang in 1598."
    },
    {
      old_name: "율리우스 카이사르",
      person_name: "Julius Caesar",
      politic_name: "Roman Republic",
      activity_start: -49,
      activity_end: -44,
      role: "Dictator, consul and general",
      period_basis: "de_facto_rule",
      notes: "Seized effective control during the civil war beginning in 49 BCE, held repeated dictatorships, became dictator perpetuo in 44 BCE, and was assassinated on 15 March of that year."
    },
    {
      old_name: "프리드리히 대왕",
      person_name: "Frederick the Great",
      politic_name: "Kingdom of Prussia",
      activity_start: 1740,
      activity_end: 1786,
      role: "King and military commander",
      period_basis: "reign",
      notes: "Reigned as king of Prussia from 1740 until his death in 1786 and transformed Prussia into a major European power through war, territorial expansion and state reform."
    },
    {
      old_name: "함무라비",
      person_name: "Hammurabi",
      politic_name: "Old Babylonian Empire",
      activity_start: -1792,
      activity_end: -1750,
      role: "King, conqueror and lawgiver",
      period_basis: "reign",
      notes: "Reigned as the sixth king of Babylon's First Dynasty from 1792 to 1750 BCE under the Middle Chronology. He extended Babylonian rule across much of Mesopotamia and is best known for the Code of Hammurabi. Ancient Near Eastern absolute chronology remains disputed; ATLAS uses the Middle Chronology for this record."
    },
    {
      old_name: "람세스 2세",
      person_name: "Ramses II",
      politic_name: "New Kingdom of Egypt",
      activity_start: -1279,
      activity_end: -1213,
      role: "Pharaoh and military commander",
      period_basis: "reign",
      notes: "Reigned as a pharaoh of Egypt's Nineteenth Dynasty from 1279 to 1213 BCE. He is associated with the Battle of Kadesh, extensive building programs and a reign of about sixty-six years."
    },
    {
      old_name: "콘스탄티누스 1세",
      person_name: "Constantine I",
      politic_name: "Roman Empire",
      activity_start: 306,
      activity_end: 337,
      role: "Emperor",
      period_basis: "reign"
    },
    {
      old_name: "유스티니아누스 1세",
      person_name: "Justinian I",
      politic_name: "Byzantine Empire",
      activity_start: 527,
      activity_end: 565,
      role: "Emperor",
      period_basis: "reign"
    },
    {
      old_name: "벨리사리우스",
      person_name: "Belisarius",
      politic_name: "Byzantine Empire",
      activity_start: 527,
      activity_end: 565,
      role: "General",
      period_basis: "military_activity"
    }
  ];

  async function migrateLegacyRecords(db) {
    let changed = 0;

    for (const migration of legacyMigrations) {
      const { data: legacyRows, error: legacyError } = await db
        .from("person_politics")
        .select("id")
        .eq("person_name", migration.old_name);

      if (legacyError) {
        console.error("ATLAS legacy lookup failed", legacyError);
        continue;
      }
      if (!legacyRows?.length) continue;

      const { data: canonicalRows, error: canonicalError } = await db
        .from("person_politics")
        .select("id")
        .eq("person_name", migration.person_name)
        .eq("politic_name", migration.politic_name)
        .eq("activity_start", migration.activity_start)
        .eq("activity_end", migration.activity_end)
        .limit(1);

      if (canonicalError) {
        console.error("ATLAS canonical lookup failed", canonicalError);
        continue;
      }

      for (const legacyRow of legacyRows) {
        if (canonicalRows?.length) {
          const { error: deleteError } = await db.from("person_politics").delete().eq("id", legacyRow.id);
          if (deleteError) console.error("ATLAS duplicate cleanup failed", deleteError);
          else changed += 1;
          continue;
        }

        const payload = {
          person_name: migration.person_name,
          politic_name: migration.politic_name,
          activity_start: migration.activity_start,
          activity_end: migration.activity_end,
          role: migration.role,
          period_basis: migration.period_basis
        };
        if (migration.notes) payload.notes = migration.notes;

        const { error: updateError } = await db.from("person_politics").update(payload).eq("id", legacyRow.id);
        if (updateError) console.error("ATLAS legacy migration failed", updateError);
        else changed += 1;
      }
    }

    return changed;
  }

  async function runIngest() {
    const config = window.ATLAS_CONFIG || {};
    if (!config.SUPABASE_URL || !config.SUPABASE_ANON_KEY || !window.supabase) return;

    try {
      const db = window.supabase.createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
      let changed = await migrateLegacyRecords(db);

      const response = await fetch(`./pending-records.json?v=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const pending = await response.json();
      if (!Array.isArray(pending)) return;

      for (const record of pending) {
        const { data, error } = await db
          .from("person_politics")
          .select("id")
          .eq("person_name", record.person_name)
          .eq("politic_name", record.politic_name)
          .eq("activity_start", record.activity_start)
          .eq("activity_end", record.activity_end)
          .limit(1);

        if (error) {
          console.error("ATLAS ingest lookup failed", error);
          continue;
        }
        if (data?.length) {
          const { error: updateError } = await db
            .from("person_politics")
            .update(record)
            .eq("id", data[0].id);
          if (updateError) console.error("ATLAS ingest refresh failed", updateError);
          else changed += 1;
          continue;
        }

        const { error: insertError } = await db.from("person_politics").insert(record);
        if (insertError) {
          console.error("ATLAS ingest insert failed", insertError);
          continue;
        }
        changed += 1;
      }

      if (changed > 0 && !sessionStorage.getItem("atlas-ingest-reloaded")) {
        sessionStorage.setItem("atlas-ingest-reloaded", "1");
        location.reload();
      }
    } catch (error) {
      console.error("ATLAS ingest failed", error);
    }
  }

  runIngest();
})();
