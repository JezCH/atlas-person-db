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

function node(className, textContent = '') {
  const element = {
    className,
    textContent,
    hidden: false,
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
    remove() {
      if (!this.parent) return;
      const index = this.parent.children.indexOf(this);
      if (index >= 0) this.parent.children.splice(index, 1);
      this.parent = null;
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

function personRow(historicity, personType) {
  const strong = node(''); strong.tagName = 'STRONG';
  const canonical = node('person-card-canonical');
  const range = node('person-card-range');
  const activities = node('person-card-activities');
  const count = node('person-card-count');
  const status = node('person-card-top');
  status.append(node('person-historicity', historicity), node('', personType));
  const row = node('person-card');
  row.append(status, strong, canonical, range, count, activities);
  return { row, strong, canonical, status };
}

test('UI7 table removes redundant historical status column and keeps only exceptional status inline', () => {
  const historical = personRow('historical', 'historical');
  const legendary = personRow('legendary', 'historical');
  const grid = node('person-card-grid');
  grid.append(historical.row, legendary.row);
  const document = {
    readyState: 'complete',
    createElement(tag) { const created = node(''); created.tagName = tag.toUpperCase(); return created; },
    querySelectorAll(selector) { return selector === '.person-card-grid' ? [grid] : []; },
    addEventListener() {}
  };
  const window = { addEventListener() {} };
  vm.runInNewContext(source, { window, document, Object, Set, String, queueMicrotask: (fn) => fn() });

  const header = grid.children[0];
  assert.ok(header.className.includes('person-table-head'));
  assert.equal(header.children.length, 4);

  assert.deepEqual(
    historical.row.children.map((child) => child.className),
    [
      'person-table-identity',
      'person-card-range person-table-range',
      'person-card-activities person-table-activities',
      'person-card-count person-table-count'
    ]
  );
  assert.equal(historical.status.parent, null);

  assert.deepEqual(
    legendary.row.children.map((child) => child.className),
    [
      'person-table-identity',
      'person-card-range person-table-range',
      'person-card-activities person-table-activities',
      'person-card-count person-table-count'
    ]
  );
  assert.equal(legendary.status.parent, legendary.row.children[0]);
  assert.ok(legendary.status.className.includes('person-table-status-inline'));
  assert.equal(legendary.status.children[0].hidden, false);
  assert.equal(legendary.status.children[1].hidden, true);
});
