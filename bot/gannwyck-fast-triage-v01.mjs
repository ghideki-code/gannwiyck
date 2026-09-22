// GannWyck Fast Triage V0.1
// RESEARCH ONLY. Real-data artifacts. Never modifies frozen V5.6.
import fs from "node:fs";
const INPUT=process.env.INPUT_JSON||"range-level-audit.json";
const d=JSON.parse(fs.readFileSync(INPUT,"utf8"));
const stat=rows=>{const r=rows.map(e=>Number(e.r)).filter(Number.isFinite);return{n:r.length,totalR:+r.reduce((a,b)=>a+b,0).toFixed(6),avgR:r.length?+(r.reduce((a,b)=>a+b,0)/r.length).toFixed(6):null,wins:rows.filter(e=>e.outcome==="target").length,losses:rows.filter(e=>e.outcome==="stop").length}};
const split=a=>{const x=[...a].sort((a,b)=>Number(a.entryIndex)-Number(b.entryIndex)),n=x.length,t=Math.floor(n/2),v=Math.floor(n/4);return{train:x.slice(0,t),validation:x.slice(t,t+v),oos:x.slice(t+v)}};
const out={version:"V0.1",protocol:"fast triage; chronological 50/25/25; no parameter tuning on OOS; candidate only, never promotion to V5.6",results:[]};
for(const x of d.results||[]){
 const c=(x.events||[]).filter(e=>e.outcome==="target"||e.outcome==="stop");
 const s=split(c);
 const candidates=[
  ["ALL",e=>true],
  ["RR>=1.5",e=>Number(e.rr)>=1.5],
  ["RR>=2",e=>Number(e.rr)>=2],
  ["stopToRange<=5%",e=>Number(e.risk)/Number(e.rangeSize)<=.05],
  ["T2-BOS<=10",e=>e.bos-e.t2<=10],
  ["BOS-T3<=10",e=>e.t3-e.bos<=10],
  ["BOS-T3>20",e=>e.t3-e.bos>20]
 ];
 const rows=candidates.map(([name,p])=>({name,train:stat(s.train.filter(p)),validation:stat(s.validation.filter(p)),oos:stat(s.oos.filter(p))}));
 out.results.push({tf:x.tf,closed:c.length,rows});
}
console.log(JSON.stringify(out,null,2));
