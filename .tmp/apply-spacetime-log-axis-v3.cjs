const fs = require('fs');

const path = '.tmp/apply-spacetime-log-axis-v2.cjs';
let source = fs.readFileSync(path, 'utf8');
const before = `replaceText(viewPath,\n  '\${yForYear(tick.year, timeline.start_year, pxPerYear)}',\n  '\${tick.y}');`;
const after = `{
  const tickSource = read(viewPath);
  const beforeTick = '\${yForYear(tick.year, timeline.start_year, pxPerYear)}';
  const afterTick = '\${tick.y}';
  const count = tickSource.split(beforeTick).length - 1;
  if (count !== 2) throw new Error(\`Expected exactly two tick-coordinate expressions in \${viewPath}, found \${count}\`);
  write(viewPath, tickSource.replaceAll(beforeTick, afterTick));
}`;
if (!source.includes(before)) throw new Error('Could not locate v2 tick replacement block');
source = source.replace(before, after);
Function('require', source)(require);
