import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const guard = require("../atlas-person-spacetime-label-overlap-guard.js");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viewCss = fs.readFileSync(path.join(root, "atlas-person-spacetime-view.css"), "utf8");

test("browser CSS pixel geometry is parsed as numeric world-space presentation geometry", () => {
  assert.equal(guard.cssNumber("123.5px"), 123.5);
  assert.equal(guard.cssNumber(" 48px "), 48);
  assert.equal(guard.cssNumber("" , 7), 7);
});

test("live guard resolves a real box overlap by horizontal movement only", () => {
  const rows = [
    { id:"a", left:0, top:100, width:70, height:18, band_code:"band" },
    { id:"b", left:10, top:101, width:70, height:18, band_code:"band" }
  ];
  const result = guard.resolvePositions(rows, { band:{ left:0, width:240 } }, { gap:2, step:4, maxShift:160, canvasWidth:240 });
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.positions.a.top, 100);
  assert.equal(result.positions.b.top, 101);
  assert.equal(result.positions.a.left, 0);
  assert.notEqual(result.positions.b.left, 10);
  const a = { ...rows[0], left:result.positions.a.left };
  const b = { ...rows[1], left:result.positions.b.left };
  assert.equal(guard.overlap(a, b, 2), false);
});

test("live guard may borrow the shared world overlay while keeping historical Y unchanged", () => {
  const rows = [
    { id:"a", left:40, top:50, width:70, height:18, band_code:"band" },
    { id:"b", left:44, top:51, width:70, height:18, band_code:"band" }
  ];
  const band = { left:40, width:90 };
  const result = guard.resolvePositions(rows, { band }, {
    gap:2,
    step:4,
    maxShift:260,
    canvasWidth:260,
    borrowWorld:true
  });
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.positions.a.top, 50);
  assert.equal(result.positions.b.top, 51);
  for (const id of ["a", "b"]) {
    const left = result.positions[id].left;
    assert.ok(left >= -1e-6);
    assert.ok(left + 70 <= 260 + 1e-6);
  }
  assert.ok(
    result.positions.a.left < band.left - 1e-6
      || result.positions.a.left + 70 > band.left + band.width + 1e-6
      || result.positions.b.left < band.left - 1e-6
      || result.positions.b.left + 70 > band.left + band.width + 1e-6,
    "at least one conflicting label should borrow presentation space outside its preferred band"
  );
});

test("impossible capacity is reported instead of changing historical Y", () => {
  const rows = [
    { id:"a", left:0, top:10, width:70, height:18, band_code:"band" },
    { id:"b", left:0, top:11, width:70, height:18, band_code:"band" }
  ];
  const result = guard.resolvePositions(rows, { band:{ left:0, width:70 } }, { gap:2, step:4, maxShift:160, canvasWidth:70 });
  assert.deepEqual(result.unresolved, ["b"]);
  assert.equal(result.positions.a.top, 10);
  assert.equal(result.positions.b.top, 11);
});

test("browser integration never writes label top/Y geometry", () => {
  const source = fs.readFileSync(path.join(root, "atlas-person-spacetime-label-overlap-guard.js"), "utf8");
  assert.doesNotMatch(source, /style\.top\s*=/);
  assert.match(source, /element\.style\.left\s*=/);
  assert.match(source, /data-spacetime-band/);
  assert.match(source, /borrowWorld:true/);
});

test("person names stay above every temporal and spatial line layer", () => {
  assert.match(viewCss, /\.spacetime-track-label\{position:absolute;z-index:30;[^}]*background:#fff/);
  assert.match(viewCss, /\.spacetime-activity-glyph\{position:absolute;z-index:32;/);
  assert.match(viewCss, /\.spacetime-track-label:hover,\.spacetime-track-label\.is-selected\{z-index:42/);
  assert.match(viewCss, /\.spacetime-track-label\.is-meanwhile-active\{z-index:41/);
  assert.match(viewCss, /\.spacetime-activity-glyph:hover,\.spacetime-activity-glyph\.is-selected\{z-index:42/);
  assert.match(viewCss, /\.spacetime-activity-glyph\.is-activity-selected\{z-index:43/);
  assert.match(viewCss, /\.spacetime-track-rail\.is-activity-selected\{z-index:20/);
  assert.match(viewCss, /\.spacetime-spatial-uncertainty\.is-activity-selected\{z-index:20/);
});

test("surface owner loads the guard only for spacetime without modifying the core spacetime renderer", () => {
  const owner = fs.readFileSync(path.join(root, "atlas-domain-surface-owner.js"), "utf8");
  const view = fs.readFileSync(path.join(root, "atlas-person-spacetime-view.js"), "utf8");
  assert.match(owner, /if \(domain === "spacetime"\)/);
  assert.match(owner, /spacetimeDomainAssetsPromise = ensurePersonDomainAssets\(\)/);
  assert.match(owner, /atlas-person-spacetime-label-overlap-guard\.js\?v=20260920-world-name-overlay/);
  assert.match(view, /const CAMERA_MIN_ZOOM = 0\.5;/);
  assert.match(view, /const CAMERA_DEFAULT_ZOOM = 5;/);
  assert.match(view, /const CAMERA_MAX_ZOOM = 15;/);
  assert.match(view, /const GLOBAL_EXTENT_COMPRESSION = 0\.748;/);
  assert.doesNotMatch(view, /LABEL_OVERLAP_GUARD/);
});

function associationMock(initial = {}) {
  const children = [];
  const parent = {
    children,
    insertBefore(node, before) {
      const index = children.indexOf(before);
      assert.ok(index >= 0);
      if (node.parentNode) node.remove();
      node.parentNode = parent;
      children.splice(index, 0, node);
    }
  };
  const doc = {
    createElement() { return make("i"); }
  };
  function make(tag, className = "") {
    const node = {
      tagName:tag, className, parentNode:null, ownerDocument:doc,
      dataset:{}, style:{}, offsetHeight:22, textContent:"",
      setAttribute() {},
      remove() {
        if (!node.parentNode) return;
        const at = children.indexOf(node);
        if (at >= 0) children.splice(at,1);
        node.parentNode = null;
      },
      get previousElementSibling() {
        const index = children.indexOf(node);
        return index > 0 ? children[index-1] : null;
      },
      get classList() {
        return { contains:(value)=>node.className.split(" ").includes(value) };
      }
    };
    return node;
  }
  function add(className, attributes = {}) {
    const node = make("i",className);
    Object.assign(node, attributes);
    node.parentNode = parent;
    children.push(node);
    return node;
  }
  const label = add("spacetime-track-label"+(initial.selected?" is-selected":""));
  label.dataset = {
    spacetimePerson:"person-one",
    spacetimeAnchorX:String(initial.anchorX ?? 40),
    spacetimeAnchorY:"100",
    spacetimeHomeLeft:String(initial.homeLeft ?? 30),
    spacetimeHomeRight:String(initial.homeRight ?? 130)
  };
  label.style = { left:String(initial.left ?? 80)+"px", width:String(initial.width ?? 70)+"px" };
  label.textContent = "역사 인물";
  return {children,label,add,parent};
}

test("post-layout movement updates the correct Person connector across an intervening home marker", () => {
  const {children,label,add} = associationMock({anchorX:40,left:80,width:70,homeLeft:30,homeRight:130});
  const connector = add("spacetime-label-connector");
  connector.dataset.spacetimePerson = "person-one";
  connector.style = {left:"40px",width:"40px",top:"100px"};
  const marker = add("spacetime-label-home-anchor");
  marker.dataset.spacetimePerson = "person-one";
  marker.style = {left:"40px",top:"111px"};
  children.splice(0,children.length,connector,marker,label);
  guard.updateConnector(label,80,140);
  assert.equal(children.filter(x=>x.classList.contains("spacetime-label-connector")).length,1);
  assert.equal(connector.style.left,"40px");
  assert.equal(connector.style.width,"100px", "connector remains attached to rail after a DOM re-pack shift");
  assert.equal(marker.style.left,"40px");
  assert.equal(marker.style.top,"111px");
  assert.equal(label.dataset.spacetimeLabelBorrowed,"true");
});

test("post-layout movement creates and removes a Person-owned connector/home anchor as needed", () => {
  const {children,label} = associationMock({anchorX:130,left:110,width:80,homeLeft:110,homeRight:210,selected:true});
  guard.updateConnector(label,110,220);
  const connector=children.find(x=>x.classList.contains("spacetime-label-connector"));
  const marker=children.find(x=>x.classList.contains("spacetime-label-home-anchor"));
  assert.ok(connector);
  assert.ok(marker);
  assert.equal(connector.dataset.spacetimePerson,"person-one");
  assert.equal(connector.style.left,"130px");
  assert.equal(connector.style.width,"90px");
  assert.equal(connector.style.top,"100px");
  assert.equal(marker.style.left,"130px");
  assert.equal(marker.style.top,"111px");
  assert.equal(label.dataset.spacetimeLabelBorrowed,"true");
  assert.ok(connector.classList.contains("is-selected"));
  guard.updateConnector(label,220,120);
  assert.equal(children.some(x=>x.classList.contains("spacetime-label-connector")),false);
  assert.equal(children.some(x=>x.classList.contains("spacetime-label-home-anchor")),false);
  assert.equal(label.dataset.spacetimeLabelBorrowed,"false");
});

test("post-layout association refuses labels without validated historical anchors", () => {
  const {children,label} = associationMock();
  label.dataset.spacetimeAnchorX="not-a-number";
  guard.updateConnector(label,80,140);
  assert.equal(children.length,1);
  assert.equal(label.dataset.spacetimeLabelBorrowed,undefined);
});
