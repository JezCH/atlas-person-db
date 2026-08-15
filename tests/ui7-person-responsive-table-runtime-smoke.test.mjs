import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../atlas-person-table-view.js', import.meta.url), 'utf8');

function node(className) {
  return {
    className,
    children: [],
    dataset: {},
    attributes: {},
    parent: null,
    append(...children) { for (const child of children) { if (child) { child.parent = this; this.children.push(child); } } },
    prepend(child) { child.parent = this; this.children.unshift(child); },
    insertBefore(child, before) { const index = this.children.indexOf(before); child.parent = this; this.children.splice(index < 0 ? this.children.length : index, 0, child); },
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelector(selector) {
      if (selector === ':scope > .person-table-identity') return this.children.find((c) => c.className === 'person-table-identity') || null;
      if (selector === ':scope > strong') return this.children.find((c) => c.tagName === 'STRONG') || null;
      if (selector === ':scope > .person-card-canonical') return this.children.find((c) => c.className === 'person-card-canonical') || null;
      for (const cls of ['person-card-range','person-card-activities','person-card-count','person-card-top','person-table-head']) {
        if (selector === `:scope > .${cls}`) return this.children.find((c) => String(c.className).split(' ').includes(cls)) || null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === ':scope > .person-card') return this.children.filter((c) => String(c.className).split(' ').includes('person-card'));
      return [];
    },
    classList: { add() {} }
  };
}

test('UI7 decorator can attach a table header and preserve an existing Person row', () => {
  const strong = node(''); strong.tagName = 'STRONG';
  const canonical = node('person-card-canonical');
  const range = node('person-card-range');
  const activities = node('person-card-activities');
  const count = node('person-card-count');
  const status = node('person-card-top');
  const row = node('person-card');
  row.classList = { add(value) { row.className += ` ${value}`; } };
  row.append(status, strong, canonical, range, count, activities);
  const grid = node('person-card-grid');
  grid.classList = { add(value) { grid.className += ` ${value}`; } };
  grid.append(row);
  const document = {
    readyState: 'complete',
    createElement(tag) { const element = node(''); element.tagName = tag.toUpperCase(); element.textContent = ''; element.classList = { add(value) { element.className += ` ${value}`; } }; return element; },
    querySelectorAll(selector) { return selector === '.person-card-grid' ? [grid] : []; },
    addEventListener() {}
  };
  const window = { addEventListener() {} };
  vm.runInNewContext(source, { window, document, Object, queueMicrotask: (fn) => fn() });
  assert.ok(grid.children[0].className.includes('person-table-head'));
  assert.ok(row.className.includes('person-table-row'));
  assert.equal(row.children.some((child) => child.className === 'person-table-identity'), true);
  assert.equal(row.dataset.personTableDecorated, 'true');
});
