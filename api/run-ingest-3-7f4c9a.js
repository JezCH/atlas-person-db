const rows = require('../pending-records-supplement-3.json');

module.exports = async function handler(req, res) {
  try {
    const url = 'https://wfrbxltvpmlprgwfysxq.supabase.co/rest/v1/person_politics';
    const key = 'sb_publishable_W2y0WbNhOVj8eWrTWTRqJw_WLregXP0';
    const headers = {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    };

    const existingResponse = await fetch(`${url}?select=id,person_name,politic_name,activity_start,activity_end`, { headers });
    if (!existingResponse.ok) throw new Error(`select failed: ${existingResponse.status} ${await existingResponse.text()}`);
    const existing = await existingResponse.json();
    const keyOf = (row) => [row.person_name, row.politic_name, Number(row.activity_start), Number(row.activity_end)].join('|');
    const existingKeys = new Set(existing.map(keyOf));

    let inserted = 0;
    let skipped = 0;
    const errors = [];
    for (const row of rows) {
      const k = keyOf(row);
      if (existingKeys.has(k)) {
        skipped += 1;
        continue;
      }
      const r = await fetch(url, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=minimal' },
        body: JSON.stringify(row)
      });
      if (!r.ok) {
        errors.push({ person_name: row.person_name, status: r.status, body: await r.text() });
        continue;
      }
      existingKeys.add(k);
      inserted += 1;
    }

    res.status(errors.length ? 500 : 200).json({ inserted, skipped, total: rows.length, errors });
  } catch (error) {
    res.status(500).json({ error: String(error && error.stack || error) });
  }
};
