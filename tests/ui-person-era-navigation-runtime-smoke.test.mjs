import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../atlas-person-era-navigation.js', import.meta.url), 'utf8');

function hasClass(node, className) {
  return String(node.className || '').split(/\s+/).filter(Boolean).includes(className);
}

function matches(node, selector) {
  if (selector.startsWith('#')) return node.id === selector.slice(1);
  if (selector === 'span') return node.tagName === 'SPAN';
  if (selector === '.person-era-band') return hasClass(node, 'person-era-band');
  if (selector === '.person-era-rows') return hasClass(node, 'person-era-rows');
  if (selector === '.person-card') return hasClass(node, 'person-card');
  if (selector === '.person-era-jump-list') return hasClass(node, 'person-era-jump-list');
  if (selector === '.person-era-jump-count') return hasClass(node, 'person-era-jump-count');
  if (selector === '.person-era-nav-current') return hasClass(node, 'person-era-nav-current');
  if (selector === '.person-era-nav-summary') return hasClass(node, 'person-era-nav-summary');
  if (selector === '.person-era-search') return hasClass(node, 'person-era-search');
  if (selector === '.person-era-polity-filter') return hasClass(node, 'person-era-polity-filter');
  if (selector === '.person-era-nav-prev') return hasClass(node, 'person-era-nav-prev');
  if (selector === '.person-era-nav-next') return hasClass(node, 'person-era-nav-next');
  if (selector === 'button[data-era]') return node.tagName === 'BUTTON' && Boolean(node.dataset.era);
  if (selector === '.person-era-group[data-atlas-era]') return hasClass(node, 'person-era-group') && Boolean(node.dataset.atlasEra);
  return false;
}

function descendants(node) {
  const found = [];
  for (const child of node.children) {
    found.push(child, ...descendants(child));
  }
  return found;
}

function createNode(tagName = 'div', className = '', textContent = '') {
  const node = {
    tagName: tagName.toUpperCase(),
    id: '',
    className,
    textContent,
    title: '',
    value: '',
    hidden: false,
    disabled: false,
    children: [],
    parent: null,
    dataset: {},
    attributes: {},
    scrolled: false,
    append(...items) {
      for (const item of items) {
        if (item.parent) item.parent.children = item.parent.children.filter((child) => child !== item);
        item.parent = this;
        this.children.push(item);
      }
    },
    prepend(item) {
      if (item.parent) item.parent.children = item.parent.children.filter((child) => child !== item);
      item.parent = this;
      this.children.unshift(item);
    },
    replaceChildren(...items) {
      for (const child of this.children) child.parent = null;
      this.children = [];
      this.append(...items);
    },
    remove() {
      if (!this.parent) return;
      this.parent.children = this.parent.children.filter((child) => child !== this);
      this.parent = null;
    },
    addEventListener() {},
    setAttribute(name, value) { this.attributes[name] = String(value); },
    getAttribute(name) { return this.attributes[name] ?? null; },
    removeAttribute(name) { delete this.attributes[name]; },
    querySelector(selector) {
      const direct = selector.startsWith(':scope > ');
      const normalized = direct ? selector.slice(9) : selector;
      const pool = direct ? this.children : descendants(this);
      return pool.find((candidate) => matches(candidate, normalized)) || null;
    },
    querySelectorAll(selector) {
      const direct = selector.startsWith(':scope > ');
      const normalized = direct ? selector.slice(9) : selector;
      const pool = direct ? this.children : descendants(this);
      return pool.filter((candidate) => matches(candidate, normalized));
    },
    scrollIntoView() { this.scrolled = true; },
    getBoundingClientRect() { return this.rect || { top: 0, bottom: 50 }; },
    focus() {}
  };
  node.classList = {
    toggle(classNameToToggle, force) {
      const classes = new Set(String(node.className || '').split(/\s+/).filter(Boolean));
      const shouldAdd = force === undefined ? !classes.has(classNameToToggle) : Boolean(force);
      if (shouldAdd) classes.add(classNameToToggle); else classes.delete(classNameToToggle);
      node.className = [...classes].join(' ');
      return shouldAdd;
    }
  };
  return node;
}

function eraGroup(code, label, range, count, top) {
  const group = createNode('section', 'person-era-group');
  group.dataset.atlasEra = code;
  group.rect = { top, bottom: top + 300 };
  const band = createNode('div', `person-era-band person-era-${code}`);
  band.setAttribute('aria-label', `${label} · ${range}`);
  band.append(createNode('span', '', label));
  const rows = createNode('div', 'person-era-rows');
  for (let i = 0; i < count; i += 1) rows.append(createNode('button', 'person-card'));
  group.append(band, rows);
  return group;
}

test('era navigator builds from rendered era groups, owns search/Polity status, and jumps without a data read path', () => {
  const container = createNode('div', 'person-main-groups');
  container.id = 'personMainGroups';
  const ancient = eraGroup('ancient', '고대', 'BC 480 이전', 2, 100);
  const medieval = eraGroup('medieval', '중세', 'AD 500 – 1491', 3, 500);
  container.append(ancient, medieval);

  const document = {
    readyState: 'complete',
    activeElement: null,
    createElement(tag) { return createNode(tag); },
    querySelector(selector) { return selector === '#personMainGroups' ? container : null; },
    addEventListener() {}
  };
  const window = {
    addEventListener() {},
    requestAnimationFrame(callback) { callback(); },
    setTimeout(callback) { callback(); },
    matchMedia() { return { matches: false }; }
  };

  vm.runInNewContext(source, {
    window,
    document,
    Object,
    Map,
    Set,
    String,
    Math,
    Boolean,
    Number,
    CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
    queueMicrotask: (callback) => callback()
  });

  window.ATLAS_PERSON_ERA_NAVIGATION.installNavigator({
    detail: {
      visibleCount: 5,
      visiblePolityCount: 2,
      query: 'alexander',
      selectedPolityId: 'rome',
      polityOptions: [{ id: 'rome', label: '로마 제국' }, { id: 'france', label: '프랑스 왕국' }]
    }
  });

  const nav = container.children[0];
  assert.equal(nav.id, 'personEraNavigator');
  const search = nav.querySelector('.person-era-search');
  const summary = nav.querySelector('.person-era-nav-summary');
  const politySelect = nav.querySelector('.person-era-polity-filter');
  assert.equal(search.value, 'alexander');
  assert.equal(summary.textContent, '인물 5명 · 정치체 2개');
  assert.ok(hasClass(summary.parent, 'person-era-nav-intro'));
  assert.ok(hasClass(search.parent, 'person-era-nav-controls'));
  assert.equal(politySelect.parent, search.parent);
  assert.equal(politySelect.value, 'rome');
  assert.equal(politySelect.children.length, 3);

  const buttons = nav.querySelectorAll('button[data-era]');
  assert.equal(buttons.length, 2);
  assert.equal(buttons[0].dataset.era, 'ancient');
  assert.equal(buttons[0].querySelector('.person-era-jump-count').textContent, '2');
  assert.equal(buttons[1].dataset.era, 'medieval');
  assert.equal(buttons[1].querySelector('.person-era-jump-count').textContent, '3');

  window.ATLAS_PERSON_ERA_NAVIGATION.jumpToEra('medieval');
  assert.equal(medieval.scrolled, true);
  assert.equal(buttons[1].attributes['aria-current'], 'location');
  assert.ok(hasClass(buttons[1], 'is-current'));
  assert.equal(nav.querySelector('.person-era-nav-current').textContent.includes('3명'), false);
});
