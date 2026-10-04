import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const eraSource = fs.readFileSync(new URL('../atlas-person-era-model.js', import.meta.url), 'utf8');
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
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null; },
    removeAttribute(name) { delete this.attributes[name]; },
    closest(selector) {
      let current = this;
      while (current) {
        const classes = String(current.className || '').split(/\s+/).filter(Boolean);
        if (selector === 'button[data-person-activity-toggle]' && current.tagName === 'BUTTON' && current.dataset.personActivityToggle != null) return current;
        if (selector === '.person-register-entry[data-person-id]' && classes.includes('person-register-entry') && current.dataset.personId) return current;
        current = current.parent;
      }
      return null;
    },
    querySelector(selector) {
      if (selector === ':scope > .person-table-identity') return this.children.find((c) => String(c.className).split(' ').includes('person-table-identity')) || null;
      if (selector === ':scope > strong') return this.children.find((c) => c.tagName === 'STRONG') || null;
      if (selector === ':scope > .person-card-canonical') return this.children.find((c) => String(c.className).split(' ').includes('person-card-canonical')) || null;
      if (selector === ':scope > .person-table-range, :scope > .person-card-range') return this.children.find((c) => String(c.className).split(' ').some((cls) => cls === 'person-table-range' || cls === 'person-card-range')) || null;
      for (const cls of ['person-card-range','person-card-activities','person-card-count','person-card-top','person-table-head']) {
        if (selector === `:scope > .${cls}`) return this.children.find((c) => String(c.className).split(' ').includes(cls)) || null;
      }
      if (selector === '.person-activity-toggle-icon') return this.children.find((c) => String(c.className).split(' ').includes('person-activity-toggle-icon')) || null;
      const simpleClass = selector.match(/^\.([A-Za-z0-9_-]+)$/);
      if (simpleClass) {
        const wanted = simpleClass[1];
        const queue = [...this.children];
        while (queue.length) {
          const current = queue.shift();
          if (String(current.className || '').split(/\s+/).filter(Boolean).includes(wanted)) return current;
          queue.push(...(current.children || []));
        }
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === ':scope > .person-card') return this.children.filter((c) => String(c.className).split(' ').includes('person-card'));
      if (selector === '.person-card-activity') return this.children.filter((c) => String(c.className).split(' ').includes('person-card-activity'));
      return [];
    }
  };
  element.classList = {
    add(...values) {
      const classes = new Set(String(element.className || '').split(/\s+/).filter(Boolean));
      for (const value of values) classes.add(value);
      element.className = [...classes].join(' ');
    },
    remove(...values) {
      const classes = new Set(String(element.className || '').split(/\s+/).filter(Boolean));
      for (const value of values) classes.delete(value);
      element.className = [...classes].join(' ');
    },
    toggle(value, force) {
      const classes = new Set(String(element.className || '').split(/\s+/).filter(Boolean));
      const next = force === undefined ? !classes.has(value) : Boolean(force);
      if (next) classes.add(value); else classes.delete(value);
      element.className = [...classes].join(' ');
      return next;
    },
    contains(value) {
      return String(element.className || '').split(/\s+/).filter(Boolean).includes(value);
    }
  };
  return element;
}

function personRow(historicity, personType, rangeText = '', personId = '') {
  const strong = node(''); strong.tagName = 'STRONG';
  const canonical = node('person-card-canonical');
  const range = node('person-card-range', rangeText);
  const activities = node('person-card-activities');
  const count = node('person-card-count');
  const status = node('person-card-top');
  status.append(node('person-historicity', historicity), node('', personType));
  const row = node('person-card');
  if (personId) row.dataset.personId = personId;
  row.append(status, strong, canonical, range, count, activities);
  return { row, strong, canonical, range, status, activities, count };
}

test('UI7 table keeps status folding and groups visible rows under the derived era band', () => {
  const historical = personRow('historical', 'historical', 'BC 1792 – BC 1750');
  const legendary = personRow('legendary', 'historical', 'BC 1620 – BC 1590');
  const grid = node('person-card-grid');
  grid.append(historical.row, legendary.row);
  const document = {
    readyState: 'complete',
    createElement(tag) { const created = node(''); created.tagName = tag.toUpperCase(); return created; },
    querySelectorAll(selector) { return selector === '.person-card-grid' ? [grid] : []; },
    addEventListener() {}
  };
  const window = { addEventListener() {} };
  const context = { window, document, Object, Set, String, Number, queueMicrotask: (fn) => fn(), console };
  vm.runInNewContext(eraSource, context);
  vm.runInNewContext(source, context);

  assert.ok(grid.className.includes('person-monumental-register'));
  assert.equal(grid.children[0].className, 'person-table-head');
  assert.equal(grid.children.some((child) => child.className.includes('person-table-head')), true);

  const eraGroup = grid.children[1];
  assert.ok(eraGroup.className.includes('person-era-group'));
  assert.equal(eraGroup.dataset.atlasEra, 'early-civilization');
  assert.equal(eraGroup.children[0].children[0].textContent, '초기문명');
  assert.equal(eraGroup.children[0].children[1].className, 'person-era-band-range');
  assert.equal(eraGroup.children[1].children.length, 2);
  assert.ok(eraGroup.className.includes('person-register-era'));
  assert.ok(eraGroup.children[1].className.includes('person-register-entries'));
  assert.ok(historical.row.className.includes('person-register-entry'));

  assert.deepEqual(
    historical.row.children.map((child) => child.className),
    [
      'person-table-identity person-register-identity',
      'person-card-range person-table-range person-register-range',
      'person-card-activities person-table-activities person-register-activities',
      'person-card-count person-table-count person-register-count is-activity-count-quiet'
    ]
  );
  assert.equal(historical.status.parent, null);

  assert.deepEqual(
    legendary.row.children.map((child) => child.className),
    [
      'person-table-identity person-register-identity',
      'person-card-range person-table-range person-register-range',
      'person-card-activities person-table-activities person-register-activities',
      'person-card-count person-table-count person-register-count is-activity-count-quiet'
    ]
  );
  assert.equal(legendary.status.parent, legendary.row.children[0]);
  assert.ok(legendary.status.className.includes('person-table-status-inline'));
  assert.equal(legendary.status.children[0].hidden, false);
  assert.equal(legendary.status.children[1].hidden, true);
});


test('P3 multi-Activity rows expose a real disclosure control and expand in place', () => {
  const multi = personRow('historical', 'historical', 'AD 100 – AD 140', 'person-multi');
  multi.activities.append(node('person-card-activity'), node('person-card-activity'));
  multi.count.textContent = 'Activity 2건';

  const grid = node('person-card-grid');
  grid.append(multi.row);
  let activityToggleCapture = null;
  const document = {
    readyState: 'complete',
    createElement(tag) { const created = node(''); created.tagName = tag.toUpperCase(); return created; },
    querySelectorAll(selector) { return selector === '.person-card-grid' ? [grid] : []; },
    addEventListener(type, handler, options) {
      if (type === 'click' && options === true) activityToggleCapture = handler;
    }
  };
  const window = { addEventListener() {} };
  const context = { window, document, Object, Set, String, Number, queueMicrotask: (fn) => fn(), console };
  vm.runInNewContext(eraSource, context);
  vm.runInNewContext(source, context);

  assert.ok(multi.row.classList.contains('has-multiple-activities'));
  assert.equal(multi.row.dataset.activityCount, '2');
  assert.equal(multi.count.classList.contains('is-activity-count-quiet'), false);
  assert.equal(multi.count.children.length, 1);

  const toggle = multi.count.children[0];
  assert.equal(toggle.className, 'person-activity-toggle');
  assert.equal(toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(toggle.children[0].textContent, '2건');
  assert.equal(toggle.children[1].textContent, '+');
  assert.equal(typeof activityToggleCapture, 'function');

  let stopped = false;
  activityToggleCapture({
    target: toggle,
    stopPropagation() { stopped = true; }
  });

  assert.equal(stopped, true);
  assert.ok(multi.row.classList.contains('is-activities-expanded'));
  assert.equal(toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(toggle.children[1].textContent, '−');
});


test('P9 promotes single-Activity approximation into the primary range without role noise', () => {
  const rowData = personRow('historical', 'historical', 'BC 3150 – BC 3125', 'person-approx');
  const activity = node('person-card-activity');
  const head = node('person-card-activity-head');
  head.append(node('', '고대 이집트'), node('person-relation-badge', 'rules'));
  const role = node('person-card-activity-role', '파라오 · reign');
  const period = node('person-card-activity-period', '약 BC 3150 – 약 BC 3125');
  activity.append(head, role, period);
  rowData.activities.append(activity);
  rowData.count.textContent = 'Activity 1건';

  const grid = node('person-card-grid');
  grid.append(rowData.row);
  const document = {
    readyState: 'complete',
    createElement(tag) { const created = node(''); created.tagName = tag.toUpperCase(); return created; },
    querySelectorAll(selector) { return selector === '.person-card-grid' ? [grid] : []; },
    addEventListener() {}
  };
  const window = { addEventListener() {} };
  const context = { window, document, Object, Set, String, Number, queueMicrotask: (fn) => fn(), console };
  vm.runInNewContext(eraSource, context);
  vm.runInNewContext(source, context);

  assert.equal(rowData.range.textContent, '약 BC 3150 – 약 BC 3125');
  assert.equal(rowData.range.dataset.rangeApproximationFromActivity, 'true');
  assert.ok(period.classList.contains('is-redundant'));
  assert.equal(period.getAttribute('aria-hidden'), 'true');
  assert.equal(role.textContent.includes('연대 근사'), false);
});
