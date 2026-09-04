import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptFile = fileURLToPath(import.meta.url);
const defaultRoot = path.resolve(path.dirname(scriptFile), "..");

export const ROOT_FRONTEND_EXTENSIONS = Object.freeze(new Set([".html", ".css", ".js"]));
export const ROOT_PUBLIC_JSON = Object.freeze(new Set([
  "atlas-place-spatial-registry.json",
  "atlas-polity-spatial-index.json",
  "non-timeline-persons.json"
]));

export function isPublicUiRootFile(name) {
  const file = String(name || "").trim();
  if (!file || file.includes("/") || file.includes("\\")) return false;
  if (ROOT_PUBLIC_JSON.has(file)) return true;
  return ROOT_FRONTEND_EXTENSIONS.has(path.extname(file).toLowerCase());
}

export function collectPublicUiRootFiles(rootDir = defaultRoot) {
  return fs.readdirSync(rootDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && isPublicUiRootFile(entry.name))
    .map((entry) => entry.name)
    .sort();
}

export function syncPublicUi({ rootDir = defaultRoot, publicDir = path.join(rootDir, "public") } = {}) {
  fs.mkdirSync(publicDir, { recursive: true });
  const files = collectPublicUiRootFiles(rootDir);
  for (const file of files) {
    fs.copyFileSync(path.join(rootDir, file), path.join(publicDir, file));
  }
  return files;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptFile) {
  const files = syncPublicUi();
  console.log(`[atlas-vercel-public-ui] synced ${files.length} root frontend asset${files.length === 1 ? "" : "s"} to public/`);
  for (const file of files) console.log(`[atlas-vercel-public-ui]   ${file}`);
}
