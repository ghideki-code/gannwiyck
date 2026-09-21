// GannWyck Conditional Cross-Analysis V0.2
// RESEARCH ONLY. Consumes a previously generated real-data range-cycle-research.json.
// Does not alter the frozen V5.6 model/protocol.

import fs from "node:fs";

const INPUT = process.env.INPUT_JSON || "range-cycle-research.json";
const d = JSON.parse(fs.readFileSync(INPUT, "utf8"));

const FEATURES = [
  "maxDirectionalImpulse",
  "stopToRange",
  "targetToRange",
  "t2ToBOS_ATR",
  "bosToT3Retracement",
  "t3DistanceToRange",
  "impulseRetention",
  "bosToT3RangeDuration"
];

function finite(v) { return Number.isFinite(Number(v)); }
function median(a) {
  const x = a.filter(finite).map(Number).sort((a,b)=>a-b);
  if (!x.length) return null;
  const m = Math.floor((x.length - 1) / 2);
  return x.length % 2 ? x[m] : (x[m] + x[m+1]) / 2;
}
function quartiles(a) {
  const x = a.filter(finite).map(Number).sort((a,b)=>a-b);
  if (x.length < 4) return null;
  const q = p => {
    const z=(x.length-1)*p, i=Math.floor(z), f=z-i;
    return x[i+1]===undefined ? x[i] : x[i]+f*(x[i+1]-x[i]);
  };
  return [q(.25),q(.5),q(.75)];
}
function stats(es) {
  const r=es.map(e=>Number(e.r)).filter(Number.isFinite);
  return {n:r.length,wins:es.filter(e=>e.outcome==="target").length,losses:es.filter(e=>e.outcome==="stop").length,totalR:+r.reduce((a,b)=>a+b,0).toFixed(6),avgR:r.length?+(r.reduce((a,b)=>a+b,0)/r.length).toFixed(6):null};
}
function bucket(v, qs) {
  if (!finite(v)||!qs) return null;
  v=Number(v);
  return v<=qs[0] ? "Q1" : v<=qs[1] ? "Q2" : v<=qs[2] ? "Q3" : "Q4";
}
function splitChronological(es) {
  const x=[...es].sort((a,b)=>Number(a.entryIndex)-Number(b.entryIndex));
  const n=x.length, nTr=Math.floor(n/2), nVa=Math.floor(n/4);
  return {train:x.slice(0,nTr),validation:x.slice(nTr,nTr+nVa),oos:x.slice(nTr+nVa)};
}
function direction(es) {
  return ["LONG","SHORT"].map(side=>({side,all:stats(es.filter(e=>e.side===side))}));
}

const output={version:"V0.2",source:d.source||"unknown",results:[]};

for (const result of d.results||[]) {
  const closed=(result.tap3Audit?.events||[]).filter(e=>e.outcome==="target"||e.outcome==="stop");
  const split=splitChronological(closed);
  const row={tf:result.tf,closed:closed.length,split:{train:split.train.length,validation:split.validation.length,oos:split.oos.length},features:{},direction:direction(closed)};

  for (const f of FEATURES) {
    const qs=quartiles(split.train.map(e=>e[f]));
    const qout={trainQuantiles:qs,train:{},validation:{},oos:{}};
    for (const [name,arr] of Object.entries(split)) {
      for (const q of ["Q1","Q2","Q3","Q4"]) {
        qout[name][q]=stats(arr.filter(e=>bucket(e[f],qs)===q));
      }
    }
    row.features[f]=qout;
  }

  // Dependency diagnostic: the current tap3Audit event object may not carry rangeLink.
  // If range identity is present, aggregate R by research Range and split cycles chronologically.
  const cycles=new Map();
  for(const e of closed){
    const rl=e.rangeLink;
    if(!rl) continue;
    const key=[rl.start,rl.end,rl.high,rl.low].join("|");
    if(!cycles.has(key)) cycles.set(key,[]);
    cycles.get(key).push(e);
  }
  const cyc=[...cycles.values()].map(es=>({entryIndex:Math.min(...es.map(e=>e.entryIndex)),r:es.reduce((s,e)=>s+e.r,0),events:es.length})).sort((a,b)=>a.entryIndex-b.entryIndex);
  const cn=cyc.length, cTr=cyc.slice(0,Math.floor(cn/2)), cVa=cyc.slice(Math.floor(cn/2),Math.floor(cn/2)+Math.floor(cn/4)), cOos=cyc.slice(Math.floor(cn/2)+Math.floor(cn/4));
  row.cycleDependence={available:cn>0,cycles:cn,multiEventCycles:cyc.filter(c=>c.events>1).length,trainR:+cTr.reduce((s,e)=>s+e.r,0).toFixed(6),validationR:+cVa.reduce((s,e)=>s+e.r,0).toFixed(6),oosR:+cOos.reduce((s,e)=>s+e.r,0).toFixed(6)};
  output.results.push(row);
}

console.log(JSON.stringify(output,null,2));
