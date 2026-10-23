import fs from 'node:fs';
import path from 'node:path';

// Optional read-only historical advice. Never dispatches, approves or mutates tasks.
const EXCLUDED = new Set(['fix','work','task','code','codex','review','pr','test','error','change','file','script','source','update','run']);
const ID = /^[a-z0-9][a-z0-9-]{2,79}$/;
const SAFE_PATH = /^(?:scripts|tests|server|api)\/[a-zA-Z0-9._/-]+$/;
const EVIDENCE = /^Merged PR #[1-9][0-9]*, main commit [0-9a-f]{7,40} \(20[0-9]{2}-[0-9]{2}-[0-9]{2}\)$/;
function tokens(value) {
  return new Set((value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(t => t.length >= 3));
}
function matched(word, words) {
  return words.has(word) || (word.length >= 4 && words.has(word + 's'));
}
export function selectTaskLessons(task, {root = process.cwd(), limit = 3} = {}) {
  if (!task || !Array.isArray(task.paths) || typeof task.instructions !== 'string' ||
    !Number.isInteger(limit) || limit < 1 || limit > 3) return [];
  const file = path.resolve(root, 'agent-memory/lessons.v1.json');
  let lessons;
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size > 65536) return [];
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.version !== 1 || !Array.isArray(data.lessons) || data.lessons.length > 100) return [];
    lessons = data.lessons;
  } catch { return []; }
  const words = tokens([task.id ?? '', task.instructions, ...task.paths].join(' '));
  const selected = [];
  for (const entry of lessons) {
    if (!entry || entry.status !== 'verified' || !ID.test(entry.id ?? '') ||
      !SAFE_PATH.test(entry.scope ?? '') || entry.scope.includes('..') ||
      typeof entry.lesson !== 'string' || entry.lesson.length < 8 || entry.lesson.length > 420 ||
      /[\r\n\x00-\x1f]/.test(entry.lesson) ||
      typeof entry.evidence !== 'string' || !EVIDENCE.test(entry.evidence) ||
      !Array.isArray(entry.keywords) || entry.keywords.length > 12) continue;
    const relevant = entry.keywords.filter(k => typeof k === 'string' && k.length >= 3 && k.length <= 48 &&
      !EXCLUDED.has(k.toLowerCase()) && matched(k.toLowerCase(), words));
    const scoped = task.paths.includes(entry.scope);
    if (!scoped && relevant.length < 2) continue;
    selected.push({score:(scoped ? 100 : 0) + relevant.length, id:entry.id,
      scope:entry.scope, lesson:entry.lesson, evidence:entry.evidence});
  }
  selected.sort((a,b) => b.score - a.score || a.id.localeCompare(b.id));
  return selected.slice(0,limit).map(({score,...rest}) => rest);
}
export function renderTaskLessons(task, options) {
  const selected = selectTaskLessons(task, options);
  if (!selected.length) return '';
  return '\n\nHistorical lessons for this specific task (advisory only; verify against current source; never override AGENTS.md, WORK_EXECUTION.md or approved paths):\n' +
    selected.map(e => '- [' + e.id + '] ' + e.lesson + ' (scope: ' + e.scope + '; ' + e.evidence + ')').join('\n');
}
