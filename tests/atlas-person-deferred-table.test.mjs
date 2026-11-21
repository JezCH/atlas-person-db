import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const source=fs.readFileSync(new URL('../atlas-person-table-view.js',import.meta.url),'utf8');
const eraModel=require('../atlas-person-era-model.js');

function harness({ withObserver=true }={}) {
  let document;
  const observers=[];
  const fakeElement=(tag='div')=>{
    const node={
      tagName:tag.toUpperCase(),id:'',className:'',dataset:{},children:[],parent:null,
      attributes:[],textContent:'',listeners:{},title:'',style:{},
      get firstChild(){return this.children[0]||null;},
      get isConnected(){return Boolean(this.root||this.parent?.isConnected);},
      setAttribute(name,value){
        const text=String(value);
        const existing=this.attributes.find(a=>a.name===name);
        if(existing)existing.value=text;else this.attributes.push({name,value:text});
        if(name==='class')this.className=text;
        if(name==='id')this.id=text;
        if(name.startsWith('data-')){
          const key=name.slice(5).replace(/-([a-z])/g,(_,char)=>char.toUpperCase());
          this.dataset[key]=text;
        }
      },
      getAttribute(name){return this.attributes.find(a=>a.name===name)?.value??null;},
      removeAttribute(name){this.attributes=this.attributes.filter(a=>a.name!==name);},
      append(...children){
        for(const child of children){
          if(!child)continue;
          if(child.parent)child.parent.children=child.parent.children.filter(n=>n!==child);
          child.parent=this;
          this.children.push(child);
        }
      },
      prepend(child){
        if(child.parent)child.parent.children=child.parent.children.filter(n=>n!==child);
        child.parent=this;
        this.children.unshift(child);
      },
      insertBefore(child,before){
        if(child.parent)child.parent.children=child.parent.children.filter(n=>n!==child);
        child.parent=this;
        const position=this.children.indexOf(before);
        this.children.splice(position<0?this.children.length:position,0,child);
      },
      replaceWith(replacement){
        if(!this.parent)return;
        const siblings=this.parent.children;
        const index=siblings.indexOf(this);
        if(index>=0){siblings[index]=replacement;replacement.parent=this.parent;this.parent=null;}
      },
      addEventListener(name,listener){this.listeners[name]=listener;},
      focus(){document.activeElement=this;},
      querySelector(selector){return this.querySelectorAll(selector)[0]||null;},
      querySelectorAll(selector){
        const selectors=selector.split(',').map(s=>s.trim());
        const all=[];
        const visit=(node)=>{for(const child of node.children){all.push(child);visit(child);}};
        visit(this);
        return all.filter(candidate=>selectors.some(part=>{
          const direct=part.startsWith(':scope > ');
          const expression=direct?part.slice(9).trim():part;
          if(direct&&candidate.parent!==this)return false;
          if(expression==='strong')return candidate.tagName==='STRONG';
          if(expression==='span')return candidate.tagName==='SPAN';
          if(expression==='[data-person-deferred="true"]')return candidate.dataset.personDeferred==='true';
          if(expression.startsWith('.')){
            const cls=expression.slice(1);
            return candidate.className.split(/\s+/).includes(cls);
          }
          return false;
        }));
      }
    };
    node.classList={
      add(...names){const set=new Set(node.className.split(/\s+/).filter(Boolean));names.forEach(n=>set.add(n));node.className=[...set].join(' ');},
      toggle(name,forced){const set=new Set(node.className.split(/\s+/).filter(Boolean));const active=forced===undefined?!set.has(name):Boolean(forced);if(active)set.add(name);else set.delete(name);node.className=[...set].join(' ');return active;},
      contains(name){return node.className.split(/\s+/).includes(name);}
    };
    return node;
  };

  const grid=fakeElement('div');
  grid.root=true;
  grid.className='person-card-grid';
  const first=fakeElement('button');first.setAttribute('class','person-card person-table-deferred');
  first.setAttribute('data-person-id','person-a');
  first.setAttribute('data-person-deferred','true');
  first.setAttribute('data-person-range','BC 800 – BC 790');
  const second=fakeElement('button');second.setAttribute('class','person-card person-table-deferred');
  second.setAttribute('data-person-id','person-b');
  second.setAttribute('data-person-deferred','true');
  second.setAttribute('data-person-range','AD 1995 – AD 1996');
  grid.append(first,second);

  const makeTemplate=()=>{
    const template={content:{firstElementChild:null}};
    Object.defineProperty(template,'innerHTML',{set(markup){
      const personId=markup.match(/data-person-id="([^"]+)"/)?.[1]||'missing';
      const row=fakeElement('button');
      row.setAttribute('class','person-card');
      row.setAttribute('data-person-id',personId);
      const name=fakeElement('strong');name.textContent=personId;
      const range=fakeElement('span');range.className='person-card-range';
      range.textContent=personId==='person-a'?'BC 800 – BC 790':'AD 1995 – AD 1996';
      const count=fakeElement('span');count.className='person-card-count';count.textContent='활동 1건';
      row.append(name,range,count);
      template.content.firstElementChild=row;
    }});
    return template;
  };
  document={
    readyState:'loading',activeElement:null,
    createElement(tag){return tag==='template'?makeTemplate():fakeElement(tag);},
    querySelectorAll(selector){return selector==='.person-card-grid'?[grid]:[];},
    querySelector(){return null;},
    addEventListener(){}
  };
  const window={
    ATLAS_PERSON_ERA_MODEL:eraModel,
    ATLAS_PERSON_MAIN:{personCardMarkup(id){return '<button class="person-card" data-person-id="'+id+'"></button>';}},
    ATLAS_PERSON_EXTERNAL_REFERENCES:{},
    location:{href:'https://example.org/'},
    addEventListener(){}
  };
  if(withObserver)window.IntersectionObserver=class {
    constructor(callback,options){this.callback=callback;this.options=options;this.observed=new Set();this.disconnected=false;observers.push(this);}
    observe(element){this.observed.add(element);}
    unobserve(element){this.observed.delete(element);}
    disconnect(){this.disconnected=true;this.observed.clear();}
    emit(element){this.callback([{target:element,isIntersecting:true}]);}
  };
  vm.runInNewContext(source,{window,document,URL,console});
  return {grid,first,second,document,observers,api:window.ATLAS_PERSON_TABLE_VIEW};
}
function groupedRows(grid) {
  return grid.querySelectorAll('.person-era-rows').flatMap(group=>group.children);
}

test('deferred register groups all Person identities into the exact era without building Activities',()=>{
  const h=harness();
  h.api.decorateAll();
  const rows=groupedRows(h.grid);
  assert.equal(rows.length,2);
  assert.equal(rows[0],h.first);
  assert.equal(rows[1],h.second);
  assert.equal(rows[0].dataset.atlasEra,'ancient');
  assert.equal(rows[1].dataset.atlasEra,'information');
  assert.equal(h.observers.length,1);
  assert.equal(h.observers[0].observed.size,2);
  assert.equal(h.observers[0].options.rootMargin,'900px 0px');
  assert.equal(rows.filter(row=>row.dataset.personDeferred==='true').length,2);
});

test('scroll hydration upgrades only intersecting row and preserves Person ID, era, and keyboard behavior',()=>{
  const h=harness();
  h.api.decorateAll();
  h.observers[0].emit(h.first);
  const rows=groupedRows(h.grid);
  assert.equal(rows.length,2);
  assert.equal(rows[0].dataset.personId,'person-a');
  assert.equal(rows[0].dataset.atlasEra,'ancient');
  assert.equal(rows[0].dataset.personTableDecorated,'true');
  assert.equal(rows[0].tagName,'DIV');
  assert.equal(rows[1].dataset.personDeferred,'true');
  assert.equal(h.observers[0].observed.size,1,'only the second row remains observed');
  // Runtime focus on the second row must upgrade it without requiring scroll.
  h.document.activeElement=h.second;
  const focusListener=h.grid.listeners.focusin;
  assert.equal(typeof focusListener,'function');
  focusListener({target:{closest:()=>h.second}});
  const focused=groupedRows(h.grid)[1];
  assert.equal(focused.dataset.personId,'person-b');
  assert.equal(focused.dataset.personTableDecorated,'true');
  assert.equal(h.document.activeElement,focused,'focus remains usable after row replacement');
});

test('old browsers without IntersectionObserver hydrate all rows rather than hide Persons',()=>{
  const h=harness({withObserver:false});
  h.api.decorateAll();
  const rows=groupedRows(h.grid);
  assert.equal(rows.length,2);
  assert.equal(rows.every(row=>row.dataset.personTableDecorated==='true'),true);
  assert.equal(h.observers.length,0);
});
