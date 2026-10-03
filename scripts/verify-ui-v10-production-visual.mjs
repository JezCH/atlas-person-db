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
    const style=(el)=>el?getComputedStyle(el):null;
    const bodyWidth=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth);
    const entry=q('.person-register-entry');
    const main=q('#personMainView');
    const registration=q('#registrationSummary');
    const eraNavigator=q('#personEraNavigator');
    const eraSearch=q('.person-era-search');
    const bg=style(document.body)?.backgroundColor||'';
    const registrationStyle=style(registration);
    const eraNavigatorStyle=style(eraNavigator);
    const eraSearchStyle=style(eraSearch);
    return {
      viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},
      bodyScrollWidth:bodyWidth,
      mainVisible:Boolean(main && !main.hidden),
      registerCount:qa('.person-register-entry').length,
      mainPortraitCount:qa('#personMainView .person-main-groups .person-detail-portrait').length,
      firstEntryName:(entry?.querySelector('.person-main-name-link')?.textContent||entry?.querySelector('strong')?.textContent||'').trim(),
      firstEntryDomain:entry?.dataset?.representativeDomain||null,
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
    await screenshot(client,"person-main-390x844.png");

    const drawerOpened=await evaluate(client,`(() => {
      document.querySelector('#mobileMenuButton')?.click();
      const drawer=document.querySelector('#mobileDrawer');
      const backdrop=document.querySelector('#mobileDrawerBackdrop');
      const r=drawer?.getBoundingClientRect?.();
      return {
        open:Boolean(drawer?.classList.contains('open')),
        ariaHidden:drawer?.getAttribute('aria-hidden'),
        backdropHidden:Boolean(backdrop?.hidden),
        bodyOpen:document.body.classList.contains('mobile-menu-open'),
        rect:r?{left:r.left,right:r.right,width:r.width}:null
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
      desktop:{main:desktopMain,detail:desktopDetail},
      mobile:{main:mobileMain,detail:mobileDetail},
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
  console.error("ATLAS_UI_V10_PRODUCTION_VISUAL_ACCEPTANCE_FAIL");
  console.error(JSON.stringify(failure,null,2));
  process.exitCode=1;
});
