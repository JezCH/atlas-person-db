// Read-only, data-independent viewport targeting for the real Chrome
// spacetime visual acceptance. Years use only reviewed time-axis ticks.
export const DENSE_WINDOWS = Object.freeze([
  Object.freeze({ area:"europe-1800-1950", subregion:"western-europe", years:Object.freeze([1800,1850,1900,1950]) }),
  Object.freeze({ area:"europe-1800-1950", subregion:"central-europe", years:Object.freeze([1800,1850,1900,1950]) }),
  Object.freeze({ area:"east-asia-500-1900", subregion:"china", years:Object.freeze([600,1200,1700,1850]) }),
  Object.freeze({ area:"east-asia-500-1900", subregion:"korean-peninsula", years:Object.freeze([600,1200,1700,1850]) })
]);

function number(value, label) {
  const result=Number(value);
  if (!Number.isFinite(result)) throw new TypeError(label+" must be finite");
  return result;
}
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));

export function interpolateYearTickY(ticks, targetYear) {
  const year=number(targetYear,"target year");
  if (!Number.isInteger(year) || year===0) throw new RangeError("historical year must be a non-zero integer");
  const rows=(Array.isArray(ticks)?ticks:[]).map(row=>({
    year:number(row.year,"tick year"),
    y:number(row.y,"tick Y")
  })).sort((a,b)=>a.year-b.year);
  if(rows.length<2) throw new RangeError("at least two historical year ticks required");
  for(let i=1;i<rows.length;i++){
    if(rows[i].year<=rows[i-1].year || rows[i].y<=rows[i-1].y)
      throw new RangeError("historical year ticks must increase strictly in time and screen Y");
  }
  if(year<rows[0].year || year>rows[rows.length-1].year)
    throw new RangeError("target year lies outside observed historical tick range");
  let last=rows[0];
  for(let i=1;i<rows.length;i++){
    const next=rows[i];
    if(year<=next.year){
      const fraction=(year-last.year)/(next.year-last.year);
      return last.y+fraction*(next.y-last.y);
    }
    last=next;
  }
  return rows[rows.length-1].y;
}

export function centeredWorldScrollTarget(input) {
  const worldX=number(input.worldX,"world X");
  const worldY=number(input.worldY,"world Y");
  const canvasLeft=number(input.canvasLeft,"canvas left");
  const canvasTop=number(input.canvasTop,"canvas top");
  const width=number(input.clientWidth,"client width");
  const height=number(input.clientHeight,"client height");
  const scrollWidth=number(input.scrollWidth,"scroll width");
  const scrollHeight=number(input.scrollHeight,"scroll height");
  if(width<=0||height<=0||scrollWidth<width||scrollHeight<height)
    throw new RangeError("invalid viewport/scroll dimensions");
  return Object.freeze({
    left:clamp(canvasLeft+worldX-width/2,0,scrollWidth-width),
    top:clamp(canvasTop+worldY-height/2,0,scrollHeight-height)
  });
}
