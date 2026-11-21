import fs from "node:fs";
import path from "node:path";

const DEBUG_URL = process.env.ATLAS_CDP_URL || "http://127.0.0.1:9222";
const PRODUCTION_ORIGIN = process.env.ATLAS_PRODUCTION_ORIGIN || "https://atlas-person-db.vercel.app";
const EXPECTED_RUNTIME_SHA = String(process.env.ATLAS_EXPECTED_RUNTIME_SHA || "").trim();
const OUT_DIR = process.env.ATLAS_VISUAL_OUT_DIR || "artifacts/spacetime-visual-acceptance";
const DESKTOP = Object.freeze({ width:1600, height:1000, deviceScaleFactor:1, mobile:false });
const MOBILE = Object.freeze({ width:390, height:844, deviceScaleFactor:1, mobile:true });

fs.mkdirSync(OUT_DIR,{recursive:true});

const sleep=(ms)=>new Promise((resolve)=>setTimeout(resolve,ms));
function assert(condition,message,details=null){
  if(condition) return;
  const error=new Error(message);
  error.details=details;
  throw error;
}
function isDeepGraphiteSurface(value){
  const rgb=parseRgb(value);
  const alphaMatch=String(value||"").match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/i);
  const alpha=alphaMatch?Number(alphaMatch[1]):1;
  return !!rgb && rgb.every((c)=>Number.isFinite(c)&&c>=0&&c<=56) && alpha>=.94 && alpha<=1;
}

function parseRgb(value){
  const match=String(value||"").match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  return match?[Number(match[1]),Number(match[2]),Number(match[3])]:null;
}
function relativeLuminance(rgb){
  if(!rgb) return null;
  const channel=(value)=>{
    const s=value/255;
    return s<=0.04045?s/12.92:((s+0.055)/1.055)**2.4;
  };
  const [r,g,b]=rgb.map(channel);
  return 0.2126*r+0.7152*g+0.0722*b;
}
function contrastRatio(foreground,background){
  const fg=relativeLuminance(parseRgb(foreground));
  const bg=relativeLuminance(parseRgb(background));
  if(fg==null||bg==null) return null;
  const hi=Math.max(fg,bg);
  const lo=Math.min(fg,bg);
  return (hi+0.05)/(lo+0.05);
}
async function jsonFetch(url){
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  return response.json();
}

class CdpClient {
  constructor(url){
    this.url=url;
    this.ws=null;
    this.nextId=1;
    this.pending=new Map();
  }
  async ready(){
    this.ws=new WebSocket(this.url);
    await new Promise((resolve,reject)=>{
      this.ws.addEventListener("open",resolve,{once:true});
      this.ws.addEventListener("error",reject,{once:true});
    });
    this.ws.addEventListener("message",(event)=>{
      const msg=JSON.parse(String(event.data));
      if(!msg.id) return;
      const pending=this.pending.get(msg.id);
      if(!pending) return;
      this.pending.delete(msg.id);
      if(msg.error) pending.reject(new Error(msg.error.message||JSON.stringify(msg.error)));
      else pending.resolve(msg.result||{});
    });
  }
  call(method,params={}){
    const id=this.nextId++;
    return new Promise((resolve,reject)=>{
      this.pending.set(id,{resolve,reject});
      this.ws.send(JSON.stringify({id,method,params}));
    });
  }
  close(){ try{this.ws?.close();}catch{} }
}

async function evaluate(client,expression){
  const result=await client.call("Runtime.evaluate",{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text||"Runtime.evaluate failed");
  return result.result?.value;
}

async function waitFor(client,expression,timeout=45000){
  const started=Date.now();
  while(Date.now()-started<timeout){
    try{ if(await evaluate(client,expression)) return true; }catch{}
    await sleep(200);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function screenshot(client,name){
  const result=await client.call("Page.captureScreenshot",{format:"png",captureBeyondViewport:false});
  assert(result?.data,`Screenshot missing: ${name}`);
  fs.writeFileSync(path.join(OUT_DIR,name),Buffer.from(result.data,"base64"));
}

async function verifyDirectPersonDeepLink(client){
  // The direct-detail route must not eagerly download the entire register.
  // Use one stable registered Person and observe only browser resource names.
  const personId="da0303c2-1faf-40b8-9dc2-1325b77488d7";
  await client.call("Emulation.setDeviceMetricsOverride",DESKTOP);
  await client.call("Page.navigate",{url:"about:blank"});
  await waitFor(client,"document.readyState === 'complete'",10000);
  const target=(PRODUCTION_ORIGIN.endsWith("/")?PRODUCTION_ORIGIN.slice(0,-1):PRODUCTION_ORIGIN)+"/#atlas-persons/person/"+personId;
  await client.call("Page.navigate",{url:target});
  await waitFor(client,"document.readyState === 'complete'",45000);
  await waitFor(client,`window.ATLAS_PERSON_MAIN?.getSelectedPersonId?.() === "${personId}" && Boolean(document.querySelector("#personMainDetail .person-chronicle-hero"))`,45000);
  await sleep(600);
  const details=await evaluate(client,`(() => {
    const names=performance.getEntriesByType("resource")
      .filter((entry)=>entry?.name)
      .map((entry)=>{try{return new URL(entry.name,location.href);}catch{return null;}})
      .filter(Boolean)
      .filter((url)=>url.pathname==="/api/atlas-person-read");
    const roster=names.filter((url)=>!url.searchParams.has("person_id"));
    const single=names.filter((url)=>url.searchParams.get("person_id")==="${personId}");
    return {
      tested_person_id:"${personId}",
      route:location.hash,
      selected_person_id:window.ATLAS_PERSON_MAIN?.getSelectedPersonId?.()||null,
      detail_heading_visible:Boolean(document.querySelector("#personMainDetail .person-chronicle-hero")),
      detail_request_count:single.length,
      full_register_request_count:roster.length,
      relevant_request_count:names.length
    };
  })()`);
  fs.writeFileSync(path.join(OUT_DIR,"person-direct-deeplink-network.json"),
    JSON.stringify({schema:"atlas-person-direct-deeplink-network/v1",...details},null,2)+String.fromCharCode(10));
  assert(details.selected_person_id===personId && details.detail_heading_visible,
    "Direct Person detail did not resolve its registered Person",details);
  assert(details.detail_request_count>=1,
    "Direct Person detail bypassed its expected bounded detail request",details);
  assert(details.full_register_request_count===0,
    "Direct Person detail unexpectedly fetched the entire Person register",details);
  await screenshot(client,"person-direct-deeplink-1600x1000.png");
  console.log("ATLAS_UI05_DIRECT_PERSON_NO_FULL_REGISTER_PASS");
  return details;
}

async function navigatePerson(client,viewport){
  await client.call("Emulation.setDeviceMetricsOverride",viewport);
  await client.call("Page.navigate",{url:"about:blank"});
  await waitFor(client,"document.readyState === 'complete'",10000);
  await client.call("Page.navigate",{url:PRODUCTION_ORIGIN});
  await waitFor(client,"document.readyState === 'complete'",45000);
  await waitFor(client,"document.querySelectorAll('.person-register-entry').length > 0",90000);
  await sleep(500);
}

async function collectMain(client){
  return evaluate(client,`(() => {
    const q=(s)=>document.querySelector(s);
    const qa=(s)=>[...document.querySelectorAll(s)];
    const style=(el,pseudo=null)=>el?getComputedStyle(el,pseudo):null;
    const median=(values)=>{
      const sorted=values.filter(Number.isFinite).slice().sort((a,b)=>a-b);
      if(!sorted.length) return null;
      const mid=Math.floor(sorted.length/2);
      return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2;
    };
    const visible=(el)=>{
      const s=style(el);
      return Boolean(el&&s&&s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity||1)>0);
    };
    const bodyWidth=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);
    // Diagnose actual horizontal layout offenders before failing a live 390px
    // acceptance. A CSS clip may mask a child but not explain scrollWidth.
    const overflowProbe=bodyWidth > innerWidth+1 ? (() => {
      const selectors=[
        "html","body",".workspace-shell",".main-area","#personMainView",
        ".person-main-layout",".person-main-groups",".person-era-navigator",
        "#personEraNavigator",".person-monumental-register",".mobile-appbar"
      ];
      const keyBoxes=selectors.map((selector)=>{
        const el=q(selector);
        const rect=el?.getBoundingClientRect?.();
        const st=style(el);
        return el&&rect ? {
          selector,left:Number(rect.left.toFixed(2)),right:Number(rect.right.toFixed(2)),
          width:Number(rect.width.toFixed(2)),scrollWidth:el.scrollWidth,
          overflowX:st?.overflowX,position:st?.position,boxSizing:st?.boxSizing
        } : null;
      }).filter(Boolean);
      const offenders=qa("body *").map((el)=>{
        const rect=el.getBoundingClientRect();
        if (!(rect.right > innerWidth+0.75 && rect.left < bodyWidth+32)) return null;
        const st=style(el);
        if(st?.display==="none"||st?.visibility==="hidden")return null;
        const classes=typeof el.className==="string"?el.className.slice(0,130):"";
        return {tag:el.tagName.toLowerCase(),id:el.id||"",classes,
          parentClass:typeof el.parentElement?.className==="string"?el.parentElement.className.slice(0,100):"",
          left:Number(rect.left.toFixed(2)),right:Number(rect.right.toFixed(2)),
          width:Number(rect.width.toFixed(2)),scrollWidth:el.scrollWidth,
          overflowX:st?.overflowX,position:st?.position,boxSizing:st?.boxSizing
        };
      }).filter(Boolean).sort((a,b)=>b.right-a.right||a.width-b.width);
      const seen=new Set();
      return {keyBoxes,offenders:offenders.filter((x)=>{
        const key=[x.tag,x.id,x.classes,x.right].join("|");
        if(seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0,25)};
    })() : null;
    const rows=qa('.person-register-entry');
    const ordinaryRows=rows.filter((row)=>!row.classList.contains('has-multiple-activities'));
    const entry=rows[0]||null;
    const domainEntry=rows.find((row)=>row.dataset.representativeDomain)||null;
    const main=q('#personMainView');
    const registration=q('#registrationSummary');
    const eraNavigator=q('#personEraNavigator');
    const eraSearch=q('.person-era-search');
    const tableHead=q('.person-monumental-register > .person-table-head');
    const bg=style(document.body)?.backgroundColor||'';
    const registrationStyle=style(registration);
    const eraNavigatorStyle=style(eraNavigator);
    const eraSearchStyle=style(eraSearch);
    const ordinaryHeights=ordinaryRows.slice(0,30).map((row)=>Number(row.getBoundingClientRect().height.toFixed(2)));
    const centerSamples=ordinaryRows.slice(0,30).map((row)=>{
      const rowRect=row.getBoundingClientRect();
      const activities=row.querySelector('.person-register-activities');
      const identity=row.querySelector('.person-register-identity');
      const activityRect=activities?.getBoundingClientRect?.();
      const identityRect=identity?.getBoundingClientRect?.();
      const centerX=rowRect.left+(rowRect.width/2);
      return activityRect?{
        coversCenter:activityRect.left<=centerX&&activityRect.right>=centerX,
        widthRatio:Number((activityRect.width/Math.max(rowRect.width,1)).toFixed(3)),
        identityWidthRatio:identityRect?Number((identityRect.width/Math.max(rowRect.width,1)).toFixed(3)):null,
        activityToIdentityRatio:identityRect&&identityRect.width>0
          ? Number((activityRect.width/identityRect.width).toFixed(3))
          : null,
        leftGap:Number(Math.max(0,activityRect.left-rowRect.left).toFixed(2)),
        rightGap:Number(Math.max(0,rowRect.right-activityRect.right).toFixed(2))
      }:null;
    }).filter(Boolean);
    const centerCoverageRate=centerSamples.length
      ? centerSamples.filter((sample)=>sample.coversCenter).length/centerSamples.length
      : null;
    const medianActivityWidthRatio=median(centerSamples.map((sample)=>sample.widthRatio));
    const medianIdentityWidthRatio=median(centerSamples.map((sample)=>sample.identityWidthRatio));
    const medianActivityToIdentityRatio=median(centerSamples.map((sample)=>sample.activityToIdentityRatio));
    const mobileTypographySamples=ordinaryRows.slice(0,15).map((row)=>{
      const font=(selector)=>{const el=row.querySelector(selector);return el?Number.parseFloat(style(el)?.fontSize||"0")||0:null;};
      const identity=row.querySelector(".person-register-identity")?.getBoundingClientRect?.();
      const activities=row.querySelector(".person-register-activities")?.getBoundingClientRect?.();
      const rowRect=row.getBoundingClientRect();
      return {
        namePx:font(".person-table-identity > strong"),
        polityPx:font(".person-card-activity-head b"),
        rolePx:font(".person-card-activity-role"),
        rangePx:font(".person-register-range"),
        periodPx:font(".person-card-activity-period"),
        stacked:Boolean(identity&&activities&&activities.top>=identity.bottom-2),
        activityRightDelta:activities?Math.abs(rowRect.right-activities.right):null
      };
    });
    const personRowSurfaceSamples=rows.slice(0,5).map((row)=>{
      const computed=style(row);
      return {classes:String(row.className),border_radius:computed?.borderRadius,box_shadow:computed?.boxShadow,background:computed?.backgroundColor,selector_matches:{monumental:!!row.closest(".person-monumental-register"),era_rows:!!row.closest(".person-era-rows")}};
    });
    const cardLikeCount=rows.filter((row)=>{
      const s=style(row);
      const radius=Math.max(...String(s?.borderRadius||"0").split(/\s+/).map((value)=>Number.parseFloat(value)||0));
      // Memorial Register rows deliberately use subtle INSET hairline engravings.
      // Only OUTER elevation/drop shadows are evidence of a card-like row.
      // Split CSS shadow layers only at top-level commas, not rgba() commas.
      // This expression is itself evaluated inside a JS template string: avoid
      // nested RegExp escapes that silently become control characters.
      const cssShadow=String(s?.boxShadow||"none");
      const shadowLayers=[];
      let layer="",nesting=0;
      for(const ch of cssShadow){
        if(ch==="(")nesting++;
        if(ch===")")nesting=Math.max(0,nesting-1);
        if(ch===","&&nesting===0){shadowLayers.push(layer.trim());layer="";}
        else layer+=ch;
      }
      shadowLayers.push(layer.trim());
      const hasRaisedShadow=shadowLayers.some((shadow)=>{
        if(!shadow||shadow==="none")return false;
        return !shadow.split(" ").includes("inset");
      });
      return radius>0.5 || hasRaisedShadow;
    }).length;
    const quietCounts=qa('.person-register-count.is-activity-count-quiet');
    const multiRows=rows.filter((row)=>row.classList.contains('has-multiple-activities'));
    const activityDomIntegrity=multiRows.every((row)=>
      row.querySelectorAll('.person-card-activity').length===Number(row.dataset.activityCount||0)
    );
    const headerCells=tableHead?[...tableHead.querySelectorAll('.person-table-head-cell')].map((cell)=>String(cell.textContent||"").replace(/\s+/g," ").trim()):[];
    return {
      viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
      bodyScrollWidth:bodyWidth,
      overflowProbe,
      mainVisible:Boolean(main && !main.hidden),
      registerCount:rows.length,
      ordinaryRegisterCount:ordinaryRows.length,
      multiActivityCount:multiRows.length,
      ordinaryMedianHeight:median(ordinaryHeights),
      ordinarySampleHeights:ordinaryHeights,
      mobileTypographySamples,
      desktopTypographySamples:mobileTypographySamples,
      centerCoverageRate,
      medianActivityWidthRatio,
      medianIdentityWidthRatio,
      medianActivityToIdentityRatio,
      centerSamples,
      cardLikeCount,
      personRowSurfaceSamples,
      quietCountVisible:quietCounts.filter(visible).length,
      activityDomIntegrity,
      tableHeadVisible:visible(tableHead),
      headerCells,
      mainPortraitCount:qa('#personMainView .person-main-groups .person-detail-portrait').length,
      firstEntryName:(entry?.querySelector('.person-main-name-link')?.textContent||entry?.querySelector('strong')?.textContent||'').trim(),
      firstEntryDomain:entry?.dataset?.representativeDomain||null,
      firstDomainBackgroundImage:style(domainEntry)?.backgroundImage||"",
      bodyBackground:bg,
      registrationSurface:registrationStyle?{
        background:registrationStyle.backgroundColor,
        borderTopColor:registrationStyle.borderTopColor,
        color:registrationStyle.color
      }:null,
      eraNavigatorSurface:eraNavigatorStyle?{
        background:eraNavigatorStyle.backgroundColor,
        borderTopColor:eraNavigatorStyle.borderTopColor,
        color:eraNavigatorStyle.color
      }:null,
      eraSearchSurface:eraSearchStyle?{
        background:eraSearchStyle.backgroundColor,
        borderTopColor:eraSearchStyle.borderTopColor,
        color:eraSearchStyle.color
      }:null,
      v9Loaded:[...document.styleSheets].some(s=>String(s.href||'').includes('atlas-ui-motion-material-v9.css')),
      v8Loaded:[...document.styleSheets].some(s=>String(s.href||'').includes('atlas-ui-mobile-v8.css'))
    };
  })()`);
}

async function verifyRegisterInteraction(client){
  const target=await evaluate(client,`(() => {
    const row=[...document.querySelectorAll('.person-register-entry[data-representative-domain]')]
      .find((item)=>item.querySelector('.person-main-name-link'));
    if(!row) return null;
    const link=row.querySelector('.person-main-name-link');
    const rect=link.getBoundingClientRect();
    const rowStyle=getComputedStyle(row);
    const after=getComputedStyle(row,'::after');
    return {
      personId:row.dataset.personId||null,
      domain:row.dataset.representativeDomain||null,
      normalNameColor:getComputedStyle(link).color,
      rowBackground:rowStyle.backgroundColor,
      linkRect:{x:rect.left+rect.width/2,y:rect.top+rect.height/2},
      selectedRuleBefore:{opacity:after.opacity,background:after.backgroundColor}
    };
  })()`);
  assert(target&&target.linkRect,"No domain-colored NamuWiki Person link available for interaction acceptance");

  await client.call("Input.dispatchMouseEvent",{type:"mouseMoved",x:target.linkRect.x,y:target.linkRect.y});
  await sleep(80);
  const hover=await evaluate(client,`(() => {
    const personId=${JSON.stringify(target.personId)};
    const row=[...document.querySelectorAll('.person-register-entry')].find((item)=>item.dataset.personId===personId);
    const link=row?.querySelector('.person-main-name-link');
    return row&&link?{
      rowHovered:row.matches(':hover'),
      nameColor:getComputedStyle(link).color,
      decorationColor:getComputedStyle(link).textDecorationColor
    }:null;
  })()`);
  await client.call("Input.dispatchMouseEvent",{type:"mouseMoved",x:1,y:1});

  const focusAndSelected=await evaluate(client,`(() => {
    const personId=${JSON.stringify(target.personId)};
    const row=[...document.querySelectorAll('.person-register-entry')].find((item)=>item.dataset.personId===personId);
    const link=row?.querySelector('.person-main-name-link');
    if(!row||!link) return null;
    link.focus();
    const focusLinkColor=getComputedStyle(link).color;
    const linkOutline=getComputedStyle(link).outlineStyle;
    row.focus();
    const rowOutline=getComputedStyle(row).outlineStyle;
    row.classList.add('is-selected');
    const selectedNameColor=getComputedStyle(link).color;
    const selectedBackground=getComputedStyle(row).backgroundColor;
    const selectedAfter=getComputedStyle(row,'::after');
    const selectedRule={opacity:selectedAfter.opacity,background:selectedAfter.backgroundColor,transform:selectedAfter.transform};
    row.classList.remove('is-selected');
    row.blur();
    return {focusLinkColor,linkOutline,rowOutline,selectedNameColor,selectedBackground,selectedRule};
  })()`);

  return {...target,hover,...focusAndSelected};
}

async function verifyRegisterFiltering(client){
  return evaluate(client,`(() => {
    const api=window.ATLAS_PERSON_MAIN;
    if(!api) return null;
    const rows=()=>[...document.querySelectorAll('.person-register-entry')];
    const first=rows()[0];
    const domainRow=rows().find((row)=>row.dataset.representativeDomain);
    if(!first||!domainRow) return null;
    const firstName=(first.querySelector('.person-main-name-link')?.textContent||first.querySelector('strong')?.textContent||'').trim();
    const domain=domainRow.dataset.representativeDomain;
    const initialCount=rows().length;

    api.setSearchQuery(firstName);
    const searchRows=rows();
    const searchCount=searchRows.length;
    const searchContainsFirst=searchRows.some((row)=>
      (row.querySelector('.person-main-name-link')?.textContent||row.querySelector('strong')?.textContent||'').trim()===firstName
    );
    api.setSearchQuery('');

    api.setDomainFilter(domain);
    const domainRows=rows();
    const domainCount=domainRows.length;
    const domainPure=domainRows.length>0&&domainRows.every((row)=>row.dataset.representativeDomain===domain);
    api.setDomainFilter('');

    return {
      initialCount,
      firstName,
      searchCount,
      searchContainsFirst,
      domain,
      domainCount,
      domainPure,
      restoredCount:rows().length
    };
  })()`);
}

async function verifyMultiActivityVisibility(client){
  return evaluate(client,`(() => {
    const row=document.querySelector('.person-register-entry.has-multiple-activities');
    if(!row) return null;
    const visible=(el)=>{
      if(!el) return false;
      const s=getComputedStyle(el);
      return s.display!=="none"&&s.visibility!=="hidden"&&Number(s.opacity||1)>0;
    };
    const rect=(el)=>el?.getBoundingClientRect?.()||null;
    const activities=[...row.querySelectorAll('.person-card-activity')];
    const activityContainer=row.querySelector('.person-register-activities');
    const count=row.querySelector('.person-register-count');
    const range=row.querySelector('.person-register-range');
    const containerRect=rect(activityContainer);
    const rowRect=rect(row);
    const periodRightDeltas=activities
      .map((activity)=>activity.querySelector('.person-card-activity-period'))
      .filter(visible)
      .map((period)=>Math.abs((rect(period)?.right||0)-(containerRect?.right||0)));
    const activityHeights=activities.map((activity)=>Number((rect(activity)?.height||0).toFixed(2)));
    return {
      declared:Number(row.dataset.activityCount||0),
      total:activities.length,
      visibleCount:activities.filter(visible).length,
      hasToggle:Boolean(row.querySelector('.person-activity-toggle,[data-person-activity-toggle]')),
      countVisible:visible(count),
      rangeVisible:visible(range),
      activityAreaRightDelta:rowRect&&containerRect?Math.abs(rowRect.right-containerRect.right):null,
      rowHeight:rowRect?Number(rowRect.height.toFixed(2)):null,
      activityHeights,
      periodRightDeltas
    };
  })()`);
}

async function openFirstDetail(client){
  const opened=await evaluate(client,`(() => {
    const entry=document.querySelector('.person-register-entry');
    if(!entry) return false;
    entry.click();
    return true;
  })()`);
  assert(opened,"Could not select first Person register entry");
  await waitFor(client,"Boolean(document.querySelector('#personMainDetail:not([hidden]) .person-chronicle-hero'))",30000);
  await sleep(250);
  return evaluate(client,`(() => {
    const q=(s)=>document.querySelector(s);
    const qa=(s)=>[...document.querySelectorAll(s)];
    const panel=q('#personMainDetail');
    const portrait=q('#personMainDetail .person-detail-portrait');
    const hero=q('#personMainDetail .person-chronicle-hero');
    const rect=(el)=>{const r=el?.getBoundingClientRect?.();return r?{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}:null;};
    return {
      panelHidden:Boolean(panel?.hidden),
      panelRect:rect(panel),
      heroRect:rect(hero),
      portraitRect:rect(portrait),
      portraitCount:qa('#personMainDetail .person-detail-portrait').length,
      hasPortrait:Boolean(portrait?.classList.contains('has-portrait')),
      portraitStatusText:(portrait?.querySelector('.person-detail-portrait-state')?.textContent||'').trim(),
      portraitStatusVisible:portrait ? getComputedStyle(portrait.querySelector('.person-detail-portrait-state')).display!=='none' : false,
      identityRect:rect(q('#personMainDetail .person-chronicle-identity')),
      statusFontPx:Number.parseFloat(getComputedStyle(q('#personMainDetail .person-detail-status')).fontSize),
      descriptionFontPx:q('#personMainDetail .person-description p')
        ? Number.parseFloat(getComputedStyle(q('#personMainDetail .person-description p')).fontSize) : null,
      activityCount:qa('#personMainDetail .person-chronicle-activity').length,
      sectionCount:qa('#personMainDetail .person-chronicle-section').length,
      authoringPresent:Boolean(q('#personMainDetail .person-detail-authoring')),
      name:(q('#personMainDetail .person-chronicle-identity h2')?.textContent||'').trim()
    };
  })()`);
}


async function evaluateUi07(client, fn, ...args) {
  return evaluate(client,"("+fn.toString()+")("+args.map((x)=>JSON.stringify(x)).join(",")+")");
}

async function verifyMobileTwoPersonComparison(client) {
  const selected=[];
  for (const term of ["James Baldwin","Ernest Hemingway"]) {
    const row=await evaluateUi07(client,(needle)=>{
      const api=window.ATLAS_PERSON_MAIN;
      if(!api)return null;
      api.setSearchQuery(needle);
      const rows=[...document.querySelectorAll(".person-register-entry[data-person-id]")];
      const matched=rows.find((r)=>String(r.querySelector(".person-main-name-link")?.textContent||"")
        .toLowerCase().includes(needle.toLowerCase()))||rows[0];
      if(!matched)return null;
      matched.click();
      return matched.dataset.personId;
    },term);
    assert(row,"No actual registered Person for comparison: "+term);
    await waitFor(client,
      "document.querySelector('#personMainDetail [data-person-compare-add]')?.dataset.personCompareAdd === window.ATLAS_PERSON_MAIN?.getSelectedPersonId()",45000);
    const picked=await evaluateUi07(client,()=>{
      const button=document.querySelector("#personMainDetail [data-person-compare-add]");
      const name=document.querySelector("#personMainDetail .person-chronicle-identity h2")?.textContent?.trim();
      const id=button?.dataset.personCompareAdd||null;
      button?.click();
      return {id,name,pressed:button?.getAttribute("aria-pressed")};
    });
    assert(picked.id===row&&picked.pressed==="true","Real Person comparison control failed",picked);
    selected.push(picked);
  }
  assert(selected[0].id !== selected[1].id,"Two distinct Persons required");
  await waitFor(client,
    "document.querySelectorAll('#personComparePanel .atlas-compare-person').length === 2 && Boolean(document.querySelector('#personComparePanel .atlas-compare-period-analysis'))",
    65000);
  // Before the legacy inspector helper dismisses the detail and scrolls
  // manually, prove that the actual second Person click focused its result.
  const completedFocus=await evaluateUi07(client,()=>{
    const panel=document.querySelector("#personComparePanel");
    return {
      activeId:document.activeElement?.id||null,
      panelVisible:Boolean(panel?.isConnected&&!panel.hidden),
      panelTabindex:panel?.getAttribute("tabindex")||null,
      personCount:panel?.querySelectorAll(".atlas-compare-person").length||0
    };
  });
  assert(completedFocus.panelVisible&&completedFocus.activeId==="personComparePanel"
    &&completedFocus.panelTabindex==="-1"&&completedFocus.personCount===2,
    "UI-07 completed mobile comparison must focus its real result before any test-initiated scroll",completedFocus);
  await evaluateUi07(client,()=>{
    const close=document.querySelector(".person-detail-overlay-close");
    if(close && getComputedStyle(close).display!=="none")close.click();
    else window.ATLAS_PERSON_MAIN?.clearSelection?.();
    document.querySelector("#personComparePanel")?.scrollIntoView({block:"start",inline:"nearest"});
    return true;
  });
  const view=await evaluateUi07(client,()=>{
    const panel=document.querySelector("#personComparePanel");
    const columns=[...panel.querySelectorAll(".atlas-compare-person")];
    const bounds=columns.map((el)=>el.getBoundingClientRect());
    const rect=panel.getBoundingClientRect();
    return {
      viewport:innerWidth,documentWidth:document.body.scrollWidth,panelWidth:rect.width,
      panelScrollWidth:panel.scrollWidth,
      activityCounts:columns.map((el)=>el.querySelectorAll(".atlas-compare-activity").length),
      personNames:columns.map((el)=>el.querySelector("h4")?.textContent?.trim()),
      sourceLinks:panel.querySelectorAll(".atlas-compare-sources a[href^='http']").length,
      totals:[...panel.querySelectorAll(".atlas-compare-overlap-counts span")].map((el)=>
        Number.parseInt(el.querySelector("strong")?.textContent||"",10)),
      stacked:bounds.length===2&&bounds[1].top>=bounds[0].bottom-1,
      actions:[...panel.querySelectorAll(".atlas-compare-head button,.atlas-compare-person-head button")]
        .map((el)=>({label:el.textContent.trim(),height:el.getBoundingClientRect().height})),
      error:panel.querySelector("[role=alert]")?.textContent||null
    };
  });
  assert(!view.error && view.stacked,"390px source-backed comparison did not stack",view);
  assert(view.activityCounts.length===2 && view.activityCounts[0]===1 && view.activityCounts[1]===1,
    "Live Person Activity records were lost",view);
  assert(view.totals.length===4&&view.totals.reduce((a,b)=>a+b,0)===1,
    "Historical Activity pairing count is not conserved",view);
  assert(view.sourceLinks>0,"Two-Person comparison lost source access",view);
  assert(view.documentWidth<=391&&view.panelScrollWidth<=view.panelWidth+2,
    "UI-07 introduces real horizontal document overflow",view);
  assert(view.actions.length>=3&&view.actions.every((a)=>a.height>=43.5),
    "Mobile compare action touch target smaller than 44px",view);
  await screenshot(client,"ui07-person-comparison-mobile-390x844.png");
  const closed=await evaluateUi07(client,()=>{
    document.querySelector("#personComparePanel [data-compare-close]")?.click();
    return document.querySelector("#personComparePanel")?.hidden===true;
  });
  assert(closed,"Comparison close did not restore the reader");
  return {selected,completedFocus,view,closePassed:closed};
}


async function verifyDirectPersonDetailRoute(client, personId) {
  assert(/^[0-9a-f-]{36}$/i.test(String(personId || "")),
    "Deep-link acceptance requires a real Person UUID from the existing comparison journey", {personId});
  const directHash=await evaluate(client,
    "window.ATLAS_ENTITY_ROUTE?.entityHash('persons','person',"+JSON.stringify(personId)+")");
  assert(/^#/.test(String(directHash||"")),"Person routing did not return a canonical hash",{personId,directHash});

  // This must be a fresh entry, not a roster-row click or SPA-only transition.
  // Verify the dossier is visible without requesting a full roster.
  await client.call("Page.navigate",{url:"about:blank"});
  await waitFor(client,"document.readyState === 'complete'",10000);
  await client.call("Page.navigate",{url:PRODUCTION_ORIGIN+"/"+directHash});
  await waitFor(client,"document.readyState === 'complete'",45000);
  await waitFor(client,
    "window.ATLAS_PERSON_MAIN?.getSelectedPersonId?.()==="+JSON.stringify(personId)
    +" && Boolean(document.querySelector('#personMainDetail:not([hidden]) .person-chronicle-hero'))",45000);
  const opened=await evaluate(client,"(() => ({"
    +"personId:window.ATLAS_PERSON_MAIN?.getSelectedPersonId?.()||null,"
    +"urlHash:location.hash,"
    +"detailVisible:document.querySelector('#personMainDetail')?.hidden===false,"
    +"backdropVisible:document.querySelector('#personMainDetailBackdrop')?.hidden===false,"
    +"bodyOpen:document.body.classList.contains('person-detail-overlay-open'),"
    +"portraitCount:document.querySelectorAll('#personMainDetail .person-detail-portrait').length,"
    +"registerEntries:document.querySelectorAll('.person-register-entry').length"
    +"}))()");
  assert(opened.personId===personId&&opened.detailVisible&&opened.backdropVisible
    &&opened.bodyOpen&&opened.portraitCount===1,
    "Direct Person URL did not display an actual visible dossier overlay",opened);
  await screenshot(client,"person-direct-link-overlay-390x844.png");
  await evaluate(client,"window.location.hash=window.ATLAS_ENTITY_ROUTE.domainHash('persons')");
  await waitFor(client,"(() => {"
    +"const panel=document.querySelector('#personMainDetail');"
    +"const backdrop=document.querySelector('#personMainDetailBackdrop');"
    +"return !location.hash.includes('/person/')"
    +" && panel?.hidden===true && backdrop?.hidden===true"
    +" && !document.body.classList.contains('person-detail-overlay-open');"
    +"})()",30000);
  const listRoute=await evaluate(client,"(() => ({"
    +"route:location.hash,"
    +"detailHidden:document.querySelector('#personMainDetail')?.hidden===true,"
    +"backdropHidden:document.querySelector('#personMainDetailBackdrop')?.hidden===true"
    +"}))()");
  return {opened,listRoute};
}

async function main(){
  assert(/^[0-9a-f]{40}$/i.test(EXPECTED_RUNTIME_SHA),"ATLAS_EXPECTED_RUNTIME_SHA_REQUIRED",{expected_runtime_sha:EXPECTED_RUNTIME_SHA||null});
  const pages=await jsonFetch(`${DEBUG_URL}/json/list`);
  const page=pages.find((item)=>item.type==="page")||pages[0];
  assert(page?.webSocketDebuggerUrl,"No Chrome page target found");
  const client=new CdpClient(page.webSocketDebuggerUrl);
  await client.ready();

  await client.call("Page.enable");
  await client.call("Runtime.enable");
  await client.call("Emulation.setEmulatedMedia",{features:[{name:"prefers-reduced-motion",value:"reduce"}]});

  try{
    const directDeepLink=await verifyDirectPersonDeepLink(client);
    await navigatePerson(client,DESKTOP);
    const desktopMain=await collectMain(client);
    await screenshot(client,"person-main-pre-assert-1600x1000.png");
    assert(desktopMain.viewport.width===1600&&desktopMain.viewport.height===1000,"Unexpected desktop viewport",desktopMain);
    assert(desktopMain.mainVisible&&desktopMain.registerCount>0,"Person Register did not render on desktop",desktopMain);
    assert(desktopMain.mainPortraitCount===0,"Person Main must not render portraits",desktopMain);
    assert(desktopMain.v8Loaded&&desktopMain.v9Loaded,"Current V8/V9 presentation layers are not active",desktopMain);
    assert(isDeepGraphiteSurface(desktopMain.registrationSurface?.background),"Person Runtime telemetry regressed to a bright surface",desktopMain);
    assert(isDeepGraphiteSurface(desktopMain.eraNavigatorSurface?.background),"Person era navigator regressed to a bright surface",desktopMain);
    assert(isDeepGraphiteSurface(desktopMain.eraSearchSurface?.background),"Person era search regressed to a bright surface",desktopMain);
    assert(desktopMain.cardLikeCount===0,"Person Register regressed toward card-like row geometry",desktopMain);
    assert(desktopMain.quietCountVisible===0,"Ordinary 0/1-Activity rows expose Activity-count noise",desktopMain);
    assert(desktopMain.activityDomIntegrity,"Multi-Activity DOM count no longer matches declared Activity count",desktopMain);
    assert(desktopMain.tableHeadVisible,"Desktop Person factual header is not visible",desktopMain);
    assert(desktopMain.headerCells.length===5,"Desktop Person factual header column count changed",desktopMain);
    assert(desktopMain.ordinaryMedianHeight!=null&&desktopMain.ordinaryMedianHeight<=56,
      "Desktop Person Register lost compact scan density",desktopMain);
    // These are real computed browser values for current registered Persons.
    // A large canvas is not readable if actual Polity, Role or chronology
    // remains 9–10px despite passing older density-only tests.
    assert(desktopMain.desktopTypographySamples?.length>=5
      && desktopMain.desktopTypographySamples.every((item)=>
        item.namePx>=17
        &&(item.polityPx==null||item.polityPx>=12.5)
        &&(item.rolePx==null||item.rolePx>=12)
        &&(item.rangePx==null||item.rangePx>=12)
        &&(item.periodPx==null||item.periodPx>=12))
      && desktopMain.desktopTypographySamples.some((item)=>item.polityPx!=null)
      && desktopMain.desktopTypographySamples.some((item)=>item.rolePx!=null),
      "Desktop Person factual typography is too small or missing in real DOM",desktopMain.desktopTypographySamples);

    const desktopInteraction=await verifyRegisterInteraction(client);
    const desktopNameContrast=contrastRatio(desktopInteraction.normalNameColor,desktopMain.bodyBackground);
    assert(desktopNameContrast!=null&&desktopNameContrast>=4.5,
      "Rendered Person domain-name contrast fell below WCAG AA",{...desktopInteraction,bodyBackground:desktopMain.bodyBackground,contrast:desktopNameContrast});
    assert(desktopInteraction.hover?.rowHovered,"Real pointer hover did not reach the Person row",desktopInteraction);
    assert(desktopInteraction.hover?.nameColor===desktopInteraction.normalNameColor,
      "Hover replaced the Person semantic domain foreground",desktopInteraction);
    assert(desktopInteraction.focusLinkColor===desktopInteraction.normalNameColor,
      "Focus replaced the Person semantic domain foreground",desktopInteraction);
    assert(desktopInteraction.selectedNameColor===desktopInteraction.normalNameColor,
      "Selection replaced the Person semantic domain foreground",desktopInteraction);
    assert(desktopInteraction.linkOutline!=="none"&&desktopInteraction.rowOutline!=="none",
      "Person link or row focus-visible treatment is missing",desktopInteraction);
    assert(desktopInteraction.selectedRule?.opacity==="1",
      "Selected Person honor-metal rule is not visible",desktopInteraction);

    const desktopFiltering=await verifyRegisterFiltering(client);
    assert(desktopFiltering&&desktopFiltering.initialCount===desktopMain.registerCount,
      "Person filter regression probe could not start from the rendered Register",desktopFiltering);
    assert(desktopFiltering.searchCount>0&&desktopFiltering.searchCount<=desktopFiltering.initialCount&&desktopFiltering.searchContainsFirst,
      "Person search no longer preserves a matching result",desktopFiltering);
    assert(desktopFiltering.domainCount>0&&desktopFiltering.domainCount<=desktopFiltering.initialCount&&desktopFiltering.domainPure,
      "Person domain filtering no longer produces a pure domain result set",desktopFiltering);
    assert(desktopFiltering.restoredCount===desktopFiltering.initialCount,
      "Clearing Person filters did not restore the original result set",desktopFiltering);

    const desktopMultiActivity=await verifyMultiActivityVisibility(client);
    assert(desktopMultiActivity&&desktopMultiActivity.declared===desktopMultiActivity.total&&desktopMultiActivity.total>1,
      "No valid multi-Activity row was available for Production acceptance",desktopMultiActivity);
    assert(desktopMultiActivity.visibleCount===desktopMultiActivity.total,
      "Desktop multi-Activity row hides one or more Activities",desktopMultiActivity);
    assert(!desktopMultiActivity.hasToggle,
      "Desktop multi-Activity row still exposes the retired disclosure control",desktopMultiActivity);
    assert(desktopMultiActivity.countVisible,
      "Desktop multi-Activity static Activity count unexpectedly disappeared",desktopMultiActivity);

    await screenshot(client,"person-main-1600x1000.png");

    const desktopDetail=await openFirstDetail(client);
    assert(!desktopDetail.panelHidden&&desktopDetail.portraitCount===1,"Person Detail portrait contract failed on desktop",desktopDetail);
    assert(desktopDetail.sectionCount>=4,"Person Chronicle sections are incomplete",desktopDetail);
    assert(desktopDetail.authoringPresent,"Person Detail Authoring disclosure is missing",desktopDetail);
    assert(desktopDetail.panelRect?.right<=DESKTOP.width+1,"Person Detail escapes desktop viewport",desktopDetail);
    await screenshot(client,"person-detail-1600x1000.png");

    await navigatePerson(client,MOBILE);
    const mobileMain=await collectMain(client);
    assert(mobileMain.viewport.width===390&&mobileMain.viewport.height===844,"Unexpected mobile viewport",mobileMain);
    if (mobileMain.bodyScrollWidth>391) await screenshot(client,"person-main-overflow-diagnostic-390x844.png");
    assert(mobileMain.bodyScrollWidth<=391,"Person mobile page has horizontal document overflow",mobileMain);
    assert(mobileMain.mainVisible&&mobileMain.registerCount>0,"Person Register did not render on mobile",mobileMain);
    assert(mobileMain.mainPortraitCount===0,"Person Main must not render portraits on mobile",mobileMain);
    assert(!mobileMain.tableHeadVisible,"Desktop factual header leaked into the compact mobile Register",mobileMain);
    assert(mobileMain.cardLikeCount===0,"Mobile Person rows regressed toward card geometry",mobileMain);
    assert(mobileMain.quietCountVisible===0,"Mobile ordinary rows expose Activity-count noise",mobileMain);
    assert(mobileMain.activityDomIntegrity,"Mobile multi-Activity DOM lost Activity information",mobileMain);
    assert(mobileMain.ordinaryMedianHeight!=null&&mobileMain.ordinaryMedianHeight>=52&&mobileMain.ordinaryMedianHeight<=128,
      "Mobile Person Register no longer reserves enough room to read its actual facts",mobileMain);
    assert(mobileMain.mobileTypographySamples?.length>=5
      && mobileMain.mobileTypographySamples.every((item)=>
        item.namePx>=16
        &&(item.polityPx==null||item.polityPx>=12)
        &&(item.rolePx==null||item.rolePx>=11.5)
        &&(item.rangePx==null||item.rangePx>=11.5)
        &&(item.periodPx==null||item.periodPx>=11.5)
        &&item.stacked&&item.activityRightDelta<=1.5),
      "Mobile Person name/Polity/Role/chronology must be readable, stacked and aligned",mobileMain.mobileTypographySamples);
    assert(/linear-gradient/i.test(mobileMain.firstDomainBackgroundImage||""),
      "Mobile Person domain wash is not rendered",mobileMain);
    assert(mobileMain.centerCoverageRate!=null&&mobileMain.centerCoverageRate>=0.8,
      "Mobile Person factual Activity column no longer occupies the visual center",mobileMain);
    assert(mobileMain.medianActivityWidthRatio!=null&&mobileMain.medianActivityWidthRatio>=0.88,
      "Mobile Person Activity data must occupy its own legible full-width second row",mobileMain);
    assert(mobileMain.medianIdentityWidthRatio!=null&&mobileMain.medianIdentityWidthRatio>=0.58,
      "Mobile Person identity must retain the majority of its first factual line",mobileMain);
    assert(mobileMain.medianActivityToIdentityRatio!=null
      &&mobileMain.medianActivityToIdentityRatio>=1.30
      &&mobileMain.medianActivityToIdentityRatio<=1.85,
      "Mobile Person identity first line and Activity full-width second line are misaligned",mobileMain);

    const mobileMultiActivity=await verifyMultiActivityVisibility(client);
    assert(mobileMultiActivity&&mobileMultiActivity.declared===mobileMultiActivity.total&&mobileMultiActivity.total>1,
      "No valid mobile multi-Activity row was available for Production acceptance",mobileMultiActivity);
    assert(mobileMultiActivity.visibleCount===mobileMultiActivity.total,
      "Mobile multi-Activity row hides one or more Activities",mobileMultiActivity);
    assert(!mobileMultiActivity.hasToggle&&!mobileMultiActivity.countVisible,
      "Mobile multi-Activity row still reserves disclosure/count chrome",mobileMultiActivity);
    assert(!mobileMultiActivity.rangeVisible,
      "Mobile multi-Activity row still shows the aggregate Person range instead of per-Activity chronology",mobileMultiActivity);
    assert(mobileMultiActivity.activityAreaRightDelta!=null&&mobileMultiActivity.activityAreaRightDelta<=1.5,
      "Mobile multi-Activity facts do not reach the ordinary chronology edge",mobileMultiActivity);
    assert(mobileMultiActivity.periodRightDeltas.length===mobileMultiActivity.total
      &&mobileMultiActivity.periodRightDeltas.every((delta)=>delta<=1.5),
      "Mobile multi-Activity periods are not aligned to the ordinary chronology edge",mobileMultiActivity);
    assert(mobileMultiActivity.activityHeights.length===mobileMultiActivity.total
      &&mobileMultiActivity.activityHeights.every((height)=>height>=44),
      "Mobile multi-Activity rows compress individual polity Activities below the standard row rhythm",mobileMultiActivity);
    assert(mobileMultiActivity.rowHeight!=null&&mobileMultiActivity.rowHeight>=mobileMultiActivity.total*44,
      "Mobile multi-Activity Person height is no longer driven by visible polity Activity count",mobileMultiActivity);

    await screenshot(client,"person-main-390x844.png");

    await evaluate(client,`document.querySelector('#mobileMenuButton')?.click(); true`);
    await sleep(320);
    const drawerOpened=await evaluate(client,`(() => {
      const drawer=document.querySelector('#mobileDrawer');
      const backdrop=document.querySelector('#mobileDrawerBackdrop');
      const r=drawer?.getBoundingClientRect?.();
      return {
        open:Boolean(drawer?.classList.contains('open')),
        ariaHidden:drawer?.getAttribute('aria-hidden'),
        backdropHidden:Boolean(backdrop?.hidden),
        bodyOpen:document.body.classList.contains('mobile-menu-open'),
        rect:r?{left:r.left,right:r.right,width:r.width}:null,
        transform:drawer?getComputedStyle(drawer).transform:null
      };
    })()`);
    assert(drawerOpened.open&&drawerOpened.ariaHidden==="false"&&!drawerOpened.backdropHidden&&drawerOpened.bodyOpen,
      "Mobile drawer did not open through the real menu control",drawerOpened);
    assert(drawerOpened.rect?.left>=-1&&drawerOpened.rect?.right>100,
      "Mobile drawer did not enter the viewport",drawerOpened);
    await screenshot(client,"mobile-drawer-open-390x844.png");

    const drawerClosed=await evaluate(client,`(() => {
      document.querySelector('#mobileMenuClose')?.click();
      const drawer=document.querySelector('#mobileDrawer');
      const backdrop=document.querySelector('#mobileDrawerBackdrop');
      const r=drawer?.getBoundingClientRect?.();
      return new Promise((resolve)=>setTimeout(()=>{
        const rr=drawer?.getBoundingClientRect?.();
        resolve({
          open:Boolean(drawer?.classList.contains('open')),
          ariaHidden:drawer?.getAttribute('aria-hidden'),
          backdropHidden:Boolean(backdrop?.hidden),
          bodyOpen:document.body.classList.contains('mobile-menu-open'),
          rect:rr?{left:rr.left,right:rr.right,width:rr.width}:null,
          transform:drawer?getComputedStyle(drawer).transform:null
        });
      },320));
    })()`);
    assert(!drawerClosed.open&&drawerClosed.ariaHidden==="true"&&drawerClosed.backdropHidden&&!drawerClosed.bodyOpen,
      "Mobile drawer close control did not clear open state",drawerClosed);
    assert(drawerClosed.rect?.right<=1,
      "Mobile drawer remained visibly onscreen after pressing close",drawerClosed);
    await screenshot(client,"mobile-drawer-closed-390x844.png");

    const mobileDetail=await openFirstDetail(client);
    assert(!mobileDetail.panelHidden&&mobileDetail.portraitCount===1,"Person Detail portrait contract failed on mobile",mobileDetail);
    assert(mobileDetail.panelRect?.left>=-1&&mobileDetail.panelRect?.right<=391,"Person Detail escapes mobile viewport",mobileDetail);
    // Registered historical portraits remain 4:5; no-portrait dossiers were
    // deliberately changed in #2762 to present Person identity before a short
    // visible "not registered" status, rather than a 230px empty image.
    if(mobileDetail.hasPortrait){
      assert(mobileDetail.portraitRect?.width>=220&&mobileDetail.portraitRect?.width<=260,
        "Real registered portrait must retain its reviewed mobile 4:5 width",mobileDetail);
    } else {
      assert(mobileDetail.portraitRect?.height>0&&mobileDetail.portraitRect?.height<=45
        &&mobileDetail.portraitRect?.width<200,
        "Empty portrait must not consume an image-sized first mobile screen",mobileDetail);
      assert(mobileDetail.identityRect?.top<mobileDetail.portraitRect.top,
        "Person identity must appear before empty-portrait status on mobile",mobileDetail);
      assert(mobileDetail.portraitStatusVisible&&/초상화 (미등록|조회 실패)/.test(mobileDetail.portraitStatusText),
        "Missing-portrait factual status must remain visible",mobileDetail);
    }
    assert(mobileDetail.statusFontPx>=11.5
      &&(mobileDetail.descriptionFontPx===null||mobileDetail.descriptionFontPx>=13),
      "Actual mobile Person factual text is still microscopic",mobileDetail);
    await screenshot(client,"person-detail-390x844.png");
    const mobileComparison=await verifyMobileTwoPersonComparison(client);
    console.log("ATLAS_UI07_PRODUCTION_MOBILE_COMPARISON_PASS");
    const directPersonRoute=await verifyDirectPersonDetailRoute(client,mobileComparison.selected[0].id);
    console.log("ATLAS_PERSON_DIRECT_LINK_OVERLAY_PASS");

    const report={
      schema:"atlas-ui-v10-production-visual-acceptance/v1",
      production_origin:PRODUCTION_ORIGIN,
      expected_runtime_sha:EXPECTED_RUNTIME_SHA,
      checked_at:new Date().toISOString(),
      p6_register_regression:"PASS",
      direct_person_detail:directDeepLink,
      desktop:{
        main:desktopMain,
        interaction:{...desktopInteraction,nameContrast:Number(desktopNameContrast.toFixed(2))},
        filtering:desktopFiltering,
        multiActivity:desktopMultiActivity,
        detail:desktopDetail
      },
      mobile:{main:mobileMain,multiActivity:mobileMultiActivity,detail:mobileDetail,comparison:mobileComparison,directLink:directPersonRoute},
      screenshots:[
        "person-direct-deeplink-1600x1000.png",
        "person-main-1600x1000.png",
        "person-detail-1600x1000.png",
        "person-main-390x844.png",
        "mobile-drawer-open-390x844.png",
        "mobile-drawer-closed-390x844.png",
        "person-detail-390x844.png",
        "ui07-person-comparison-mobile-390x844.png",
        "person-direct-link-overlay-390x844.png"
      ],
      status:"PASS"
    };
    fs.writeFileSync(path.join(OUT_DIR,"ui-v10-visual-acceptance.json"),JSON.stringify(report,null,2)+"\n");
    fs.writeFileSync(path.join(OUT_DIR,"ui-p6-person-register-acceptance.json"),JSON.stringify(report,null,2)+"\n");
    console.log("ATLAS_UI_P6_PERSON_REGISTER_ACCEPTANCE_PASS");
    console.log("ATLAS_UI_V10_PRODUCTION_VISUAL_ACCEPTANCE_PASS");
    console.log(JSON.stringify(report,null,2));
  } finally {
    client.close();
  }
}

main().catch((error)=>{
  const failure={
    schema:"atlas-ui-v10-production-visual-acceptance/v1",
    production_origin:PRODUCTION_ORIGIN,
    expected_runtime_sha:EXPECTED_RUNTIME_SHA||null,
    checked_at:new Date().toISOString(),
    status:"FAIL",
    error:error?.message||String(error),
    details:error?.details||null
  };
  fs.writeFileSync(path.join(OUT_DIR,"ui-v10-visual-acceptance.json"),JSON.stringify(failure,null,2)+"\n");
  fs.writeFileSync(path.join(OUT_DIR,"ui-p6-person-register-acceptance.json"),JSON.stringify(failure,null,2)+"\n");
  console.error("ATLAS_UI_P6_PERSON_REGISTER_ACCEPTANCE_FAIL");
  console.error("ATLAS_UI_V10_PRODUCTION_VISUAL_ACCEPTANCE_FAIL");
  console.error(JSON.stringify(failure,null,2));
  process.exitCode=1;
});
