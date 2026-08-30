import fs from 'node:fs';

const file = process.argv[2] || 'non-timeline-persons.json';
const rows = JSON.parse(fs.readFileSync(file, 'utf8'));

if (!Array.isArray(rows)) throw new Error(`${file} must contain an array`);

const seen = new Set();
for (const [index, row] of rows.entries()) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error(`${file}: row ${index} must be an object`);
  }
  for (const key of ['person_name','politic_name','display_name_ko','politic_display_name_ko','historicity','historicity_display_ko','date_basis','role_ko','reason','map_policy']) {
    if (typeof row[key] !== 'string' || row[key].trim() === '') {
      throw new Error(`${file}: row ${index} missing ${key}`);
    }
  }
  if (row.timeline_status !== 'excluded') {
    throw new Error(`${file}: row ${index} must keep timeline_status=excluded`);
  }
  if (row.activity_start !== null || row.activity_end !== null) {
    throw new Error(`${file}: row ${index} must not fabricate timeline Activity years`);
  }
  for (const key of ['traditional_year','traditional_year_alternative']) {
    if (row[key] != null && (!Number.isInteger(row[key]) || row[key] === 0)) {
      throw new Error(`${file}: row ${index} has invalid ${key}`);
    }
  }
  if (row.traditional_year_alternative != null && row.traditional_year == null) {
    throw new Error(`${file}: row ${index} cannot set traditional_year_alternative without traditional_year`);
  }
  const identity = row.person_name.trim().toLowerCase();
  if (seen.has(identity)) {
    throw new Error(`${file}: duplicate non-timeline person_name: ${row.person_name}`);
  }
  seen.add(identity);
}

console.log(`Validated ${rows.length} non-timeline registration rows.`);
