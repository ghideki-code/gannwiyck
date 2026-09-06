/* GannWyck Terminal UI fixes: stable price formatting, autoscale guard and prominent signal card. */
(function(){'use strict';
function inject(){
  if(document.getElementById('gw-ui-fixes')) return;
  const s=document.createElement('style'); s.id='gw-ui-fixes'; s.textContent=`
    .signal{position:relative;overflow:hidden;border:1px solid #34475c!important;background:linear-gradient(145deg,#111b26,#0a1017)!important;box-shadow:0 0 0 1px rgba(81,216,232,.05),0 18px 45px rgba(0,0,0,.32)!important}
    .signal:before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px;background:#4b5d70}
    .signal.gw-long:before{background:#39d98a;box-shadow:0 0 18px #39d98a}.signal.gw-short:before{background:#ff6375;box-shadow:0 0 18px #ff6375}
    .signal.gw-long{border-color:rgba(57,217,138,.45)!important}.signal.gw-short{border-color:rgba(255,99,117,.45)!important}
    .signal.gw-long .side{color:#39d98a;text-shadow:0 0 18px rgba(57,217,138,.25)}.signal.gw-short .side{color:#ff6375;text-shadow:0 0 18px rgba(255,99,117,.25)}
    .signal.gw-long .badge,.signal.gw-short .badge{font-size:10px;padding:6px 9px}
    .signal .metric b{font-size:14px}.signal .metric:first-child{border-color:#3b5269}.signal.gw-long .metric:first-child{background:rgba(57,217,138,.07)}.signal.gw-short .metric:first-child{background:rgba(255,99,117,.07)}
    .gw-price-stable{font-variant-numeric:tabular-nums;letter-spacing:-.02em}
  `; document.head.appendChild(s);
}
function stablePrecision(price){const p=Math.abs(Number(price));if(!Number.isFinite(p))return{precision:2,minMove:.01};if(p>=1000)return{precision:2,minMove:.01};if(p>=100)return{precision:3,minMove:.001};if(p>=1)return{precision:4,minMove:.0001};if(p>=.1)return{precision:5,minMove:.00001};return{precision:8,minMove:.00000001}}
function apply(){
  inject();
  try{
    if(typeof series!=='undefined'&&series){
      const last=Array.isArray(candles)&&candles.length?candles[candles.length-1]:null;
      const p=last?last.close:null, pf=stablePrecision(p);
      series.applyOptions({priceFormat:{type:'price',precision:pf.precision,minMove:pf.minMove},priceScale:{autoScale:true,mode:0,scaleMargins:{top:.08,bottom:.08}}});
      if(chart&&chart.priceScale) chart.priceScale('right').applyOptions({autoScale:true,mode:0,scaleMargins:{top:.08,bottom:.08}});
    }
    const card=document.querySelector('.signal');
    const side=document.getElementById('side');
    if(card&&side){card.classList.remove('gw-long','gw-short');const v=(side.textContent||'').toUpperCase();if(v.includes('LONG'))card.classList.add('gw-long');if(v.includes('SHORT'))card.classList.add('gw-short')}
    document.querySelectorAll('#entry,#stop,#target,#rr,#pricePill,#rh,#mid,#rl,#extremePrice').forEach(el=>el.classList.add('gw-price-stable'));
  }catch(e){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,300));else setTimeout(apply,300);
setInterval(apply,1000);
})();
