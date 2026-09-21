// GannWyck Gann-Time Isolated Research V0.1
// RESEARCH ONLY. Exploratory feature study. Real Binance-derived event artifact.
// No synthetic data. No changes to frozen V5.6.
import fs from "node:fs";
const INPUT=process.env.INPUT_JSON||"range-level-audit.json";
const d=JSON.parse(fs.readFileSync(INPUT,"utf8"));
const DAYS=[145,180,270,360];
const WINDOWS=[1,3,7];
const stats=es=>{const r=es.map(e=>+e.r).filter(Number.isFinite);return{n:r.length,wins:es.filter(e=>e.outcome==="target").length,losses:es.filter(e=>e.outcome==="stop").length,totalR:+r.reduce((a,b)=>a+b,0).toFixed(6),avgR:r.length?+(r.reduce((a,b)=>a+b,0)/r.length).toFixed(6):null,hitRate:r.length?+(es.filter(e=>e.outcome==="target").length/r.length).toFixed(6):null}};
const split=es=>{const x=[...es].sort((a,b)=>a.entryIndex-b.entryIndex),n=x.length,a=Math.floor(n/2),b=Math.floor(n/4);return{train:x.slice(0,a),validation:x.slice(a,a+b),oos:x.slice(a+b)}};
function features(e){
 const rl=e.rangeLink;if(!rl||!Number.isFinite(e.entryIndex))return null;
 const start=Number(rl.start),end=Number(rl.end),entry=Number(e.entryIndex);
 if(!Number.isFinite(start)||!Number.isFinite(end)||!Number.isFinite(entry))return null;
 const dayFactor=({"1h":1/24,"4h":4/24,"12h":12/24,"1d":1,"2d":2,"3d":3,"5d":5,"1w":7,"1M":30})[e.tf]||null;
 if(!dayFactor)return null;
 const out={};
 for(const anchor of [["rangeStart",start],["rangeEnd",end]]){
   const days=Math.abs(entry-anchor[1])*dayFactor;
   out[anchor[0]]=DAYS.map(d=>({cycle:d,deltaDays:+(days-d).toFixed(6),near:WINDOWS.map(w=>({window:w,match:Math.abs(days-d)<=w}))}));
 }
 return out;
}
const out={version:"V0.1",protocol:"exploratory Gann-time feature; 145/180/270/360 days; chronology preserved; no OOS tuning",results:[]};
for(const x of d.results||[]){
 const closed=(x.events||[]).filter(e=>e.outcome==="target"||e.outcome==="stop").map(e=>({...e,tf:x.tf,...features({...e,tf:x.tf})})).filter(e=>e.rangeStart);
 const sp=split(closed), row={tf:x.tf,closed:closed.length,cycles:DAYS,windows:WINDOWS,anchors:{}};
 for(const anchor of ["rangeStart","rangeEnd"]){
   row.anchors[anchor]={};
   for(const day of DAYS)for(const w of WINDOWS){
     const key=anchor+"_"+day+"_"+w;
     const match=e=>e[anchor]?.some(z=>z.cycle===day&&z.near.some(n=>n.window===w&&n.match));
     const q=sp.train.filter(match);
     row.anchors[anchor][day+"d_"+w+"d"]={train:stats(q),validation:stats(sp.validation.filter(match)),oos:stats(sp.oos.filter(match))};
   }
 }
 out.results.push(row);
}
console.log(JSON.stringify(out,null,2));