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
      const activityRect=activities?.getBoundingClientRect?.();
      const centerX=rowRect.left+(rowRect.width/2);
      return activityRect?{
        coversCenter:activityRect.left<=centerX&&activityRect.right>=centerX,
        widthRatio:Number((activityRect.width/Math.max(rowRect.width,1)).toFixed(3)),
        leftGap:Number(Math.max(0,activityRect.left-rowRect.left).toFixed(2)),
        rightGap:Number(Math.max(0,rowRect.right-activityRect.right).toFixed(2))
      }:null;
    }).filter(Boolean);
    const centerCoverageRate=centerSamples.length
      ? centerSamples.filter((sample)=>sample.coversCenter).length/centerSamples.length
      : null;
    const medianActivityWidthRatio=median(centerSamples.map((sample)=>sample.widthRatio));
    const cardLikeCount=rows.filter((row)=>{
      const s=style(row);
      const radius=Math.max(...String(s?.borderRadius||"0").split(/\s+/).map((value)=>Number.parseFloat(value)||0));
      return radius>0.5 || (s?.boxShadow&&s.boxShadow!=="none");
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
      mainVisible:Boolean(main && !main.hidden),
      registerCount:rows.length,
      ordinaryRegisterCount:ordinaryRows.length,
      multiActivityCount:multiRows.length,
      ordinaryMedianHeight:median(ordinaryHeights),
      ordinarySampleHeights:ordinaryHeights,
      centerCoverageRate,
      medianActivityWidthRatio,
      centerSamples,
      cardLikeCount,
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

async function verifyActivityDisclosure(client){
  return evaluate(client,`(() => {
    const row=document.querySelector('.person-register-entry.has-multiple-activities');
    if(!row) return null;
    const visible=(el)=>{
      const s=getComputedStyle(el);
      return s.display!=="none"&&s.visibility!=="hidden";
    };
    const activities=()=>[...row.querySelectorAll('.person-card-activity')];
    const toggle=row.querySelector('.person-activity-toggle');
    if(!toggle) return {missingToggle:true};
    const selectedBefore=window.ATLAS_PERSON_MAIN?.getSelectedPersonId?.()||null;
    const total=activities().length;
    const collapsedVisible=activities().filter(visible).length;
    const collapsedExpanded=toggle.getAttribute('aria-expanded');
    toggle.click();
    const expandedVisible=activities().filter(visible).length;
    const expandedState=toggle.getAttribute('aria-expanded');
    const selectedAfterExpand=window.ATLAS_PERSON_MAIN?.getSelectedPersonId?.()||null;
    toggle.click();
    const recollapsedVisible=activities().filter(visible).length;
    const recollapsedState=toggle.getAttribute('aria-expanded');
    const selectedAfterCollapse=window.ATLAS_PERSON_MAIN?.getSelectedPersonId?.()||null;
    return {
      missingToggle:false,
      declared:Number(row.dataset.activityCount||0),
      total,
      collapsedVisible,
      collapsedExpanded,
      expandedVisible,
      expandedState,
      recollapsedVisible,
      recollapsedState,
      selectedBefore,
      selectedAfterExpand,
      selectedAfterCollapse
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
      activityCount:qa('#personMainDetail .person-chronicle-activity').length,
      sectionCount:qa('#personMainDetail .person-chronicle-section').length,
      authoringPresent:Boolean(q('#personMainDetail .person-detail-authoring')),
      name:(q('#personMainDetail .person-chronicle-identity h2')?.textContent||'').trim()
    };
  })()`);
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
    await navigatePerson(client,DESKTOP);
    const desktopMain=await collectMain(client);
    assert(desktopMain.viewport.width===1600&&desktopMain.viewport.height===1000,"Unexpected desktop viewport",desktopMain);
    assert(desktopMain.mainVisible&&desktopMain.registerCount>0,"Person Register did not render on desktop",desktopMain);
    assert(desktopMain.mainPortraitCount===0,"Person Main must not render portraits",desktopMain);
    assert(desktopMain.v8Loaded&&desktopMain.v9Loaded,"Current V8/V9 presentation layers are not active",desktopMain);
    assert(desktopMain.registrationSurface?.background==="rgb(21, 25, 28)","Person Runtime telemetry regressed to a bright surface",desktopMain);
    assert(desktopMain.eraNavigatorSurface?.background==="rgba(18, 21, 24, 0.96)","Person era navigator regressed to a bright surface",desktopMain);
    assert(desktopMain.eraSearchSurface?.background==="rgb(17, 21, 24)","Person era search regressed to a bright surface",desktopMain);
    assert(desktopMain.cardLikeCount===0,"Person Register regressed toward card-like row geometry",desktopMain);
    assert(desktopMain.quietCountVisible===0,"Ordinary 0/1-Activity rows expose Activity-count noise",desktopMain);
    assert(desktopMain.activityDomIntegrity,"Multi-Activity DOM count no longer matches declared Activity count",desktopMain);
    assert(desktopMain.tableHeadVisible,"Desktop Person factual header is not visible",desktopMain);
    assert(desktopMain.headerCells.length===5,"Desktop Person factual header column count changed",desktopMain);
    assert(desktopMain.ordinaryMedianHeight!=null&&desktopMain.ordinaryMedianHeight<=56,
      "Desktop Person Register lost compact scan density",desktopMain);

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

    const desktopActivityDisclosure=await verifyActivityDisclosure(client);
    assert(desktopActivityDisclosure&&!desktopActivityDisclosure.missingToggle,
      "No multi-Activity disclosure control was available for Production acceptance",desktopActivityDisclosure);
    assert(desktopActivityDisclosure.declared===desktopActivityDisclosure.total&&desktopActivityDisclosure.total>1,
      "Multi-Activity row lost Activity information",desktopActivityDisclosure);
    assert(desktopActivityDisclosure.collapsedVisible===1&&desktopActivityDisclosure.collapsedExpanded==="false",
      "Multi-Activity row is not compact when collapsed",desktopActivityDisclosure);
    assert(desktopActivityDisclosure.expandedVisible===desktopActivityDisclosure.total&&desktopActivityDisclosure.expandedState==="true",
      "Multi-Activity disclosure did not reveal every Activity",desktopActivityDisclosure);
    assert(desktopActivityDisclosure.recollapsedVisible===1&&desktopActivityDisclosure.recollapsedState==="false",
      "Multi-Activity disclosure did not return to compact state",desktopActivityDisclosure);
    assert(desktopActivityDisclosure.selectedBefore===desktopActivityDisclosure.selectedAfterExpand
      &&desktopActivityDisclosure.selectedBefore===desktopActivityDisclosure.selectedAfterCollapse,
      "Activity disclosure triggered Person selection",desktopActivityDisclosure);

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
    assert(mobileMain.bodyScrollWidth<=391,"Person mobile page has horizontal document overflow",mobileMain);
    assert(mobileMain.mainVisible&&mobileMain.registerCount>0,"Person Register did not render on mobile",mobileMain);
    assert(mobileMain.mainPortraitCount===0,"Person Main must not render portraits on mobile",mobileMain);
    assert(!mobileMain.tableHeadVisible,"Desktop factual header leaked into the compact mobile Register",mobileMain);
    assert(mobileMain.cardLikeCount===0,"Mobile Person rows regressed toward card geometry",mobileMain);
    assert(mobileMain.quietCountVisible===0,"Mobile ordinary rows expose Activity-count noise",mobileMain);
    assert(mobileMain.activityDomIntegrity,"Mobile multi-Activity DOM lost Activity information",mobileMain);
    assert(mobileMain.ordinaryMedianHeight!=null&&mobileMain.ordinaryMedianHeight>=30&&mobileMain.ordinaryMedianHeight<=56,
      "Mobile Person Register left the intended breathing-density band",mobileMain);
    assert(/linear-gradient/i.test(mobileMain.firstDomainBackgroundImage||""),
      "Mobile Person domain wash is not rendered",mobileMain);
    assert(mobileMain.centerCoverageRate!=null&&mobileMain.centerCoverageRate>=0.8,
      "Mobile Person factual Activity column no longer occupies the visual center",mobileMain);
    assert(mobileMain.medianActivityWidthRatio!=null&&mobileMain.medianActivityWidthRatio>=0.24,
      "Mobile Person factual Activity column became too narrow and reopened center whitespace",mobileMain);

    const mobileActivityDisclosure=await verifyActivityDisclosure(client);
    assert(mobileActivityDisclosure&&!mobileActivityDisclosure.missingToggle,
      "Mobile multi-Activity disclosure control is missing",mobileActivityDisclosure);
    assert(mobileActivityDisclosure.declared===mobileActivityDisclosure.total
      &&mobileActivityDisclosure.expandedVisible===mobileActivityDisclosure.total,
      "Mobile Activity disclosure does not preserve every Activity",mobileActivityDisclosure);
    assert(mobileActivityDisclosure.collapsedVisible===1&&mobileActivityDisclosure.recollapsedVisible===1,
      "Mobile multi-Activity row does not retain compact collapsed state",mobileActivityDisclosure);
    assert(mobileActivityDisclosure.selectedBefore===mobileActivityDisclosure.selectedAfterExpand
      &&mobileActivityDisclosure.selectedBefore===mobileActivityDisclosure.selectedAfterCollapse,
      "Mobile Activity disclosure triggered Person selection",mobileActivityDisclosure);

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
    assert(mobileDetail.portraitRect?.width>=220&&mobileDetail.portraitRect?.width<=260,"Mobile Detail portrait left reviewed range",mobileDetail);
    await screenshot(client,"person-detail-390x844.png");

    const report={
      schema:"atlas-ui-v10-production-visual-acceptance/v1",
      production_origin:PRODUCTION_ORIGIN,
      expected_runtime_sha:EXPECTED_RUNTIME_SHA,
      checked_at:new Date().toISOString(),
      p6_register_regression:"PASS",
      desktop:{
        main:desktopMain,
        interaction:{...desktopInteraction,nameContrast:Number(desktopNameContrast.toFixed(2))},
        filtering:desktopFiltering,
        activityDisclosure:desktopActivityDisclosure,
        detail:desktopDetail
      },
      mobile:{main:mobileMain,activityDisclosure:mobileActivityDisclosure,detail:mobileDetail},
      screenshots:[
        "person-main-1600x1000.png",
        "person-detail-1600x1000.png",
        "person-main-390x844.png",
        "mobile-drawer-open-390x844.png",
        "mobile-drawer-closed-390x844.png",
        "person-detail-390x844.png"
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
