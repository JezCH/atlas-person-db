import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../atlas-person-table-view.js', import.meta.url), 'utf8');

function moveChild(parent, child, index = parent.children.length) {
  if (!child) return;
  if (child.parent) {
    const oldIndex = child.parent.children.indexOf(child);
    if (oldIndex >= 0) child.parent.children.splice(oldIndex, 1);
  }
  child.parent = parent;
  parent.children.splice(Math.min(index, parent.children.length), 0, child);
}

function node(className) {
  const element = {
    className,
    children: [],
    dataset: {},
    attributes: {},
    parent: null,
    append(...children) { for (const child of children) moveChild(this, child); },
    prepend(child) { moveChild(this, child, 0); },
    insertBefore(child, before) {
      const index = this.children.indexOf(before);
      moveChild(this, child, index < 0 ? this.children.length : index);
    },
    setAttribute(name, value) { this.attributes[name] = value; },
    querySelector(selector) {
      if (selector === ':scope > .person-table-identity') return this.children.find((c) => String(c.className).split(' ').includes('person-table-identity')) || null;
      if (selector === ':scope > strong') return this.children.find((c) => c.tagName === 'STRONG') || null;
      if (selector === ':scope > .person-card-canonical') return this.children.find((c) => String(c.className).split(' ').includes('person-card-canonical')) || null;
      for (const cls of ['person-card-range','person-card-activities','person-card-count','person-card-top','person-table-head']) {
        if (selector === `:scope > .${cls}`) return this.children.find((c) => String(c.className).split(' ').includes(cls)) || null;
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === ':scope > .person-card') return this.children.filter((c) => String(c.className).split(' ').includes('person-card'));
      return [];
    }
  };
  element.classList = {
    add(value) {
      const classes = new Set(String(element.className || '').split(/\s+/).filter(Boolean));
      classes.add(value);
      element.className = [...classes].join(' ');
    }
  };
  return element;
}

test('UI7 decorator aligns Person row DOM with the visible table header order', () => {
  const strong = node(''); strong.tagName = 'STRONG';
  const canonical = node('person-card-canonical');
  const range = node('person-card-range');
  const activities = node('person-card-activities');
  const count = node('person-card-count');
  const status = node('person-card-top');
  const row = node('person-card');
  // Source Person card order intentionally differs from table header order.
  row.append(status, strong, canonical, range, count, activities);
  const grid = node('person-card-grid');
  grid.append(row);
  const document = {
    readyState: 'complete',
    createElement(tag) { const created = node(''); created.tagName = tag.toUpperCase(); created.textContent = ''; return created; },
    querySelectorAll(selector) { return selector === '.person-card-grid' ? [grid] : []; },
    addEventListener() {}
  };
  const window = { addEventListener() {} };
  vm.runInNewContext(source, { window, document, Object, Set, queueMicrotask: (fn) => fn() });

  assert.ok(grid.children[0].className.includes('person-table-head'));
  assert.ok(row.className.includes('person-table-row'));
  assert.equal(row.dataset.personTableDecorated, 'true');
  assert.deepEqual(
    row.children.map((child) => child.className),
    [
      'person-table-identity',
      'person-card-range person-table-range',
      'person-card-activities person-table-activities',
      'person-card-count person-table-count',
      'person-card-top person-table-status'
    ]
  );
  assert.equal(row.children[0].children[0], strong);
  assert.equal(row.children[0].children[1], canonical);
});
