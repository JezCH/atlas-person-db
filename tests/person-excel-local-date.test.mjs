import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source=readFileSync(new URL("../atlas-person-excel-export.js",import.meta.url),"utf8");
function fixture(){
  let filename=null;
  const excel={
    utils:{
      json_to_sheet:(rows)=>({rows}),
      book_new:()=>({}),
      book_append_sheet:()=>{}
    },
    writeFile:(_book,name)=>{filename=name;}
  };
  const context={window:{XLSX:excel},Date,Promise,Object,Number,String,console};
  vm.runInNewContext(source,context,{filename:"atlas-person-excel-export.js"});
  return {api:context.window.ATLAS_PERSON_EXCEL_EXPORT,filename:()=>filename};
}
const empty=()=>({persons:[{display_name:"표준 인물",activity_summaries:[]}],
  boundaryLabel:()=>""});

test("Excel filename uses user's local date after Korean midnight, not previous UTC date", async ()=>{
  const previous=process.env.TZ;
  try{
    process.env.TZ="Asia/Seoul";
    const x=fixture();
    const result=await x.api.exportPersons({...empty(),fileDate:new Date("2026-11-20T15:05:00Z")});
    assert.equal(result.file_date,"2026-11-21");
    assert.equal(x.filename(),"atlas-persons-2026-11-21.xlsx");
    assert.equal(result.row_count,1);
  } finally {if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});

test("Excel filename stays on user's previous calendar day in America/New_York",async ()=>{
  const previous=process.env.TZ;
  try{
    process.env.TZ="America/New_York";
    const x=fixture();
    const result=await x.api.exportPersons({...empty(),fileDate:new Date("2026-11-21T02:30:00Z")});
    assert.equal(result.file_date,"2026-11-20");
    assert.equal(x.filename(),"atlas-persons-2026-11-20.xlsx");
  } finally {if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});

test("invalid Excel export date falls back to a valid local day",async ()=>{
  const x=fixture();
  const result=await x.api.exportPersons({...empty(),fileDate:new Date(NaN)});
  assert.match(result.file_date,/^\d{4}-\d{2}-\d{2}$/);
  assert.equal(x.filename(),`atlas-persons-${result.file_date}.xlsx`);
});
