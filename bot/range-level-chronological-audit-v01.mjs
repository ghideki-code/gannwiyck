// GannWyck Range-Level Chronological Audit V0.1
// RESEARCH ONLY. Real-data artifact consumer. Never modifies frozen V5.6.
import fs from "node:fs";
const INPUT=process.env.INPUT_JSON||"range-level-audit.json";
const d=JSON.parse(fs.readFileSync(INPUT,"utf8"));

const stats=rows=>{
  const r=rows.map(x=>Number(x.r)).filter(Number.isFinite);
  return {n:r.length,wins:rows.filter(x=>x.outcome==="target").length,losses:rows.filter(x=>x.outcome==="stop").length,totalR:+r.reduce((a,b)=>a+b,0).toFixed(6),avgR:r.length?+(r.reduce((a,b)=>a+b,0)/r.length).toFixed(6):null};
};
const key=e=>e.rangeLink?[e.rangeLink.start,e.rangeLink.end,e.rangeLink.high,e.rangeLink.low].join("|"):"NO_RANGE";

function buildRanges(events){
  const m=new Map();
  for(const e of events){const k=key(e);if(!m.has(k))m.set(k,[]);m.get(k).push(e);}
  return [...m.values()].map(es=>({
    key:key(es[0]),entryIndex:Math.min(...es.map(e=>e.entryIndex)),
    events:es.length,totalR:es.reduce((s,e)=>s+e.r,0),
    bestR:Math.max(...es.map(e=>e.r)),worstR:Math.min(...es.map(e=>e.r)),rows:es
  })).sort((a,b)=>a.entryIndex-b.entryIndex);
}
function split(xs){
  const n=xs.length,a=Math.floor(n/2),b=Math.floor(n/4);
  return {train:xs.slice(0,a),validation:xs.slice(a,a+b),oos:xs.slice(a+b)};
}
function rangeStats(rs){return stats(rs.flatMap(x=>x.rows));}

const out={version:"V0.1",protocol:"chronological range-level audit; Train 50%, Validation 25%, OOS 25%; no OOS tuning",results:[]};
for(const result of d.results||[]){
  const closed=(result.events||[]).filter(e=>e.outcome==="target"||e.outcome==="stop");
  const ranges=buildRanges(closed);
  const sp=split(ranges);
  const oneEvent=ranges.map(x=>[...x.rows].sort((a,b)=>a.entryIndex-b.entryIndex)[0]);
  const oneSp=split(ranges).oos;
  out.results.push({
    tf:result.tf,
    eventLevel:stats(closed),
    ranges:ranges.length,
    multiEventRanges:ranges.filter(x=>x.events>1).length,
    eventsInMultiRanges:ranges.filter(x=>x.events>1).reduce((s,x)=>s+x.events,0),
    chronologicalRanges:{
      train:{ranges:sp.train.length,...rangeStats(sp.train)},
      validation:{ranges:sp.validation.length,...rangeStats(sp.validation)},
      oos:{ranges:sp.oos.length,...rangeStats(sp.oos)}
    },
    oneEventPerRange:{
      all:stats(oneEvent),
      train:stats(split(oneEvent).train),
      validation:stats(split(oneEvent).validation),
      oos:stats(split(oneEvent).oos)
    },
    rangeConcentration:{
      top1RangeR:ranges.length?+Math.max(...ranges.map(x=>x.totalR)).toFixed(6):null,
      top3RangeR:+ranges.slice().sort((a,b)=>b.totalR-a.totalR).slice(0,3).reduce((s,x)=>s+x.totalR,0).toFixed(6)
    }
  });
}
console.log(JSON.stringify(out,null,2));
