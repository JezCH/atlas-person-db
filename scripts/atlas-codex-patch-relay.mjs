import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const PATCH_MARKER = "ATLAS-CODEX-PATCH-V1";
export const TASK_ID = "atlas-patch-relay-pilot-20261020";
export const LAUNCHER_PR = 2560;
export const CODEX_BOT_ID = 199175422;
const SHA40 = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const MAX_BODY_BYTES = 50000;
const MAX_NEW_BYTES = 24000;
const MAX_TOTAL_BYTES = 38000;

function requireValid(condition, message) {
  if (!condition) throw new Error("ATLAS_PATCH_REJECTED: " + message);
}

export function extractPatchComment(body) {
  requireValid(typeof body === "string" && Buffer.byteLength(body) <= MAX_BODY_BYTES, "body size");
  const begin = PATCH_MARKER + "\n";
  const end = "\nEND-" + PATCH_MARKER;
  // Codex GitHub replies may prepend a report heading and append a View task link.
  // The markers still bound exactly one machine-readable JSON payload.
  const start = body.indexOf(begin);
  const finish = start < 0 ? -1 : body.indexOf(end, start + begin.length);
  requireValid(start >= 0 && finish > start &&
    body.indexOf("\n" + begin, start + begin.length) === -1 &&
    body.indexOf(end, finish + end.length) === -1, "unique complete markers required");
  const payload = body.slice(start + begin.length, finish);
  requireValid(payload.length > 2 && payload.length < MAX_BODY_BYTES, "invalid payload");
  try { return JSON.parse(payload); } catch { throw new Error("ATLAS_PATCH_REJECTED: invalid JSON"); }
}

export function validateEnvelope(event) {
  requireValid(event && event.action === "created", "event action");
  requireValid(event.repository?.full_name === "JezCH/atlas-person-db", "repository");
  requireValid(event.issue?.number === LAUNCHER_PR && Boolean(event.issue.pull_request), "launcher PR");
  requireValid(event.comment?.user?.login === "chatgpt-codex-connector[bot]" &&
    event.comment.user.type === "Bot" && event.comment.user.id === CODEX_BOT_ID, "sender");
  requireValid(Number.isSafeInteger(event.comment.id) && event.comment.id > 0, "comment id");
  return extractPatchComment(event.comment.body);
}

function validPath(value, group) {
  if (typeof value !== "string" || value.length > 130 || value.includes("\\") ||
      value.includes("\0") || value.includes("..") || value.startsWith("/")) return false;
  const parts = value.split("/");
  if (parts.length !== 2 || parts.some(p => !/^[a-zA-Z0-9._-]+$/.test(p) || p.startsWith("."))) return false;
  if (group === "source") return parts[0] === "scripts" && parts[1].endsWith(".mjs") &&
    !/^(?:atlas-codex-|apply-|deploy-|verify-vercel-resource-budget)/.test(parts[1]);
  return parts[0] === "tests" && parts[1].endsWith(".test.mjs") &&
    !parts[1].startsWith("atlas-codex-");
}

export function validatePlan(value) {
  requireValid(value && !Array.isArray(value) && typeof value === "object", "plan");
  requireValid(value.version === 1 && value.task_id === TASK_ID && SHA40.test(value.base_sha), "version/task/base");
  requireValid(Array.isArray(value.files) && value.files.length === 2, "exactly two files");
  const roles = ["source", "test"];
  let total = 0;
  for (let i = 0; i < roles.length; i++) {
    const f = value.files[i];
    requireValid(f && validPath(f.path, roles[i]), "unsafe path/role");
    requireValid(SHA256.test(f.before_sha256), "invalid original file hash");
    requireValid(typeof f.after_base64 === "string" && /^[A-Za-z0-9+/]*={0,2}$/.test(f.after_base64), "invalid encoding");
    const bytes = Buffer.from(f.after_base64, "base64");
    requireValid(bytes.length > 0 && bytes.length <= MAX_NEW_BYTES &&
      bytes.toString("base64") === f.after_base64, "noncanonical or oversized replacement");
    requireValid(!bytes.includes(0) && Buffer.from(bytes.toString("utf8"), "utf8").equals(bytes), "not UTF8 source");
    total += bytes.length;
  }
  requireValid(total <= MAX_TOTAL_BYTES, "payload total bytes");
  return value;
}

function git(root, args) {
  return execFileSync("git", ["-C", root, ...args], {encoding: "utf8", stdio: ["ignore", "pipe", "pipe"]}).trim();
}

export function applyPlan(value, root, options = {}) {
  const plan = validatePlan(value);
  const directory = fs.realpathSync(root);
  if (!options.skipGitCheck) {
    requireValid(git(directory, ["rev-parse", "HEAD"]) === plan.base_sha, "stale base SHA");
    requireValid(git(directory, ["status", "--porcelain"]) === "", "dirty checkout");
  }
  const pending = [];
  for (const f of plan.files) {
    const abs = path.join(directory, f.path);
    requireValid(fs.existsSync(abs) && fs.lstatSync(abs).isFile() &&
      fs.realpathSync(abs) === abs, "missing or symlink source");
    const original = fs.readFileSync(abs);
    const actual = crypto.createHash("sha256").update(original).digest("hex");
    requireValid(actual === f.before_sha256, "stale original file: " + f.path);
    const replacement = Buffer.from(f.after_base64, "base64");
    requireValid(!original.equals(replacement), "unchanged file: " + f.path);
    pending.push({abs, bytes:replacement, name:f.path});
  }
  // Validate *both* old hashes and all paths before performing any write.
  for (const item of pending) fs.writeFileSync(item.abs, item.bytes);
  return {test_path: pending[1].name, changed_paths:pending.map(i => i.name), base_sha:plan.base_sha};
}

export function createPlanFromEvent(event) {
  return validatePlan(validateEnvelope(event));
}

const invoked = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invoked) {
  const [mode, source, destination] = process.argv.slice(2);
  try {
    requireValid(["extract", "apply"].includes(mode) && source && destination, "usage");
    const data = JSON.parse(fs.readFileSync(source, "utf8"));
    if (mode === "extract") {
      const plan = createPlanFromEvent(data);
      fs.writeFileSync(destination, JSON.stringify(plan) + "\n", {flag:"wx", mode:0o600});
      console.log("ATLAS_PATCH_ACCEPTED: envelope + plan validated");
    } else {
      const result = applyPlan(data, process.cwd());
      fs.writeFileSync(destination, JSON.stringify(result) + "\n", {flag:"wx", mode:0o600});
      console.log("ATLAS_PATCH_APPLIED: strict path + base + hashes validated");
    }
  } catch (e) {
    console.error(e?.message || "ATLAS_PATCH_REJECTED");
    process.exitCode = 1;
  }
}
