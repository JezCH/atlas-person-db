import fs from "node:fs";
import { pathToFileURL } from "node:url";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NAMUWIKI_URL_RE = /^https:\/\/namu\.wiki\/w\/\S+$/;
const DEFAULT_MAX_BATCH_SIZE = 25;

function invalid(message) {
  const error = new Error(message);
  error.code = "NAMUWIKI_COMMAND_INVALID";
  return error;
}

function parseItem(line) {
  const linked = line.match(/^link\s+(\S+)\s+(\S+)$/);
  if (linked) {
    const personId = linked[1].toLowerCase();
    const url = linked[2];
    if (!UUID_RE.test(personId)) throw invalid(`Invalid person UUID: ${linked[1]}`);
    if (!NAMUWIKI_URL_RE.test(url)) throw invalid(`Invalid canonical NamuWiki URL for ${personId}`);
    return Object.freeze({ person_id:personId, status:"linked", url });
  }

  const missing = line.match(/^not_found\s+(\S+)$/);
  if (missing) {
    const personId = missing[1].toLowerCase();
    if (!UUID_RE.test(personId)) throw invalid(`Invalid person UUID: ${missing[1]}`);
    return Object.freeze({ person_id:personId, status:"not_found", url:null });
  }

  throw invalid(`Invalid batch item: ${line}`);
}

export function parseNamuWikiCommand(body, { maxBatchSize=DEFAULT_MAX_BATCH_SIZE }={}) {
  const text = String(body ?? "").replace(/\r\n?/g, "\n").trim();

  const singleLink = text.match(/^\/namuwiki-link\s+(\S+)\s+(\S+)$/);
  if (singleLink) return [parseItem(`link ${singleLink[1]} ${singleLink[2]}`)];

  const singleMissing = text.match(/^\/namuwiki-not-found\s+(\S+)$/);
  if (singleMissing) return [parseItem(`not_found ${singleMissing[1]}`)];

  const lines = text.split("\n");
  if (lines[0]?.trim() !== "/namuwiki-batch") {
    throw invalid("Expected /namuwiki-link, /namuwiki-not-found, or /namuwiki-batch");
  }

  const itemLines = lines.slice(1).map((line) => line.trim()).filter(Boolean);
  if (itemLines.length === 0) throw invalid("NamuWiki batch is empty");
  if (!Number.isInteger(maxBatchSize) || maxBatchSize < 1 || itemLines.length > maxBatchSize) {
    throw invalid(`NamuWiki batch exceeds maximum size ${maxBatchSize}`);
  }

  const items = itemLines.map(parseItem);
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.person_id)) throw invalid(`Duplicate person UUID in batch: ${item.person_id}`);
    seen.add(item.person_id);
  }
  return items;
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (invokedPath === import.meta.url) {
  const outputPath = process.argv[2];
  if (!outputPath) throw invalid("Output path is required");
  const items = parseNamuWikiCommand(process.env.COMMENT_BODY);
  fs.writeFileSync(outputPath, `${JSON.stringify(items)}\n`, "utf8");
}
