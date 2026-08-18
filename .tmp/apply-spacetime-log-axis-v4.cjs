const fs = require('fs');

let source = fs.readFileSync('.tmp/apply-spacetime-log-axis-v2.cjs', 'utf8');

const tickBefore = `replaceText(viewPath,\n  '\${yForYear(tick.year, timeline.start_year, pxPerYear)}',\n  '\${tick.y}');`;
const tickAfter = `{
  const tickSource = read(viewPath);
  const beforeTick = '\${yForYear(tick.year, timeline.start_year, pxPerYear)}';
  const afterTick = '\${tick.y}';
  const count = tickSource.split(beforeTick).length - 1;
  if (count !== 2) throw new Error('Expected exactly two tick-coordinate expressions');
  write(viewPath, tickSource.replaceAll(beforeTick, afterTick));
}`;
if (!source.includes(tickBefore)) throw new Error('Could not locate v2 tick replacement block');
source = source.replace(tickBefore, tickAfter);

const testPattern = /  assert\.ok\(modernCentury > ancientCentury \* 4, ` \+ '`' \+ `expected modern century to be much wider: ancient=\$\{ancientCentury\}, modern=\$\{modernCentury\}` \+ '`' \+ `\);/;
if (!testPattern.test(source)) throw new Error('Could not locate compiler-interpolated log-axis assertion');
source = source.replace(testPattern, '  assert.ok(modernCentury > ancientCentury * 4, "expected modern century to be much wider");');

Function('require', source)(require);
