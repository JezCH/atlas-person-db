import crypto from 'node:crypto';
import fs from 'node:fs';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { computeSpatialStats, validateCanonicalBaseline } from './compile-spatial-bindings.mjs';

function fail(code, message) {
  const error = new Error(`${code}: ${message}`);
  error.code = code;
  throw error;
}

function parseArgs(argv) {
  const options = {
    sourcePath: 'atlas-polity-spatial-index.json',
    outPath: 'spatial/reviewed-bindings/0000-migrated-baseline.index.json',
    force: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[index + 1];
    switch (arg) {
      case '--source': options.sourcePath = value; index += 1; break;
      case '--out': options.outPath = value; index += 1; break;
      case '--force': options.force = true; break;
      default: fail('INVALID_SPATIAL_BASELINE_MIGRATION_ARGUMENT', `unknown argument ${arg}`);
    }
  }
  return options;
}

export function migrateSpatialBaseline({ sourcePath, outPath, force = false }) {
  const raw = fs.readFileSync(sourcePath, 'utf8');
  const parsed = JSON.parse(raw);
  validateCanonicalBaseline(parsed);
  if (fs.existsSync(outPath) && !force) {
    fail('SPATIAL_BASELINE_ALREADY_EXISTS', `${outPath} already exists; baseline migration is a cutover operation, use --force only before cutover`);
  }
  fs.mkdirSync(new URL('.', pathToFileURL(outPath)), { recursive: true });
  const normalizedRaw = raw.endsWith('\n') ? raw : `${raw}\n`;
  fs.writeFileSync(outPath, normalizedRaw, 'utf8');
  return Object.freeze({
    source: sourcePath,
    output: outPath,
    sha256: crypto.createHash('sha256').update(normalizedRaw).digest('hex'),
    ...computeSpatialStats(parsed)
  });
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const result = migrateSpatialBaseline(options);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath && import.meta.url === invokedPath) main();
