/* KALP RETRO-64 UI v2
   Production contract: 3 reels × 8 shots = 24 shots.
   The eight progression stages remain mission DNA; they are not the final storyboard.
*/
(function(){
  'use strict';
  const TOTAL_REELS=3, SHOTS_PER_REEL=8;
  const stages=['ENTRY','THREAT INTRODUCTION','FIRST ENGAGEMENT','CAPABILITY ESCALATION','MAJOR ESCALATION','BREAKTHROUGH','GATE / OBJECTIVE','NEXT THREAT'];
  const root=()=>document.querySelector('#retro64ProductionV2');
  const state={reels:Array.from({length:TOTAL_REELS},(_,i)=>({number:i+1,status:i===0?'CURRENT':'LOCKED',shots:Array.from({length:SHOTS_PER_REEL},(_,j)=>({number:j+1,title:`${stages[j]}`,description:'Awaiting mission generation.'}))}))};
  function render(){const el=root();if(!el)return;el.innerHTML=`<section class="r64v2-shell"><header class="r64v2-head"><div><div class="r64v2-eyebrow">RETRO-64 · MISSION PRODUCTION</div><h2>3-Reel Cinematic Mission</h2><p>Mission DNA → Reel 01 → Reel 02 → Reel 03</p></div><div class="r64v2-total"><b>24</b><span>TOTAL SHOTS</span></div></header><div class="r64v2-arc">${stages.map((s,i)=>`<div class="r64v2-stage"><i>${String(i+1).padStart(2,'0')}</i><span>${s}</span></div>`).join('')}</div><div class="r64v2-reels">${state.reels.map(reel=>`<article class="r64v2-reel ${reel.status.toLowerCase()}"><div class="r64v2-reelhead"><div><span>REEL ${String(reel.number).padStart(2,'0')}</span><strong>8 SHOTS</strong></div><em>${reel.status}</em></div><div class="r64v2-shots">${reel.shots.map(s=>`<div class="r64v2-shot"><b>${String(s.number).padStart(2,'0')}</b><span>${s.title}</span><small>${s.description}</small></div>`).join('')}</div><button class="r64v2-action" data-reel="${reel.number}" ${reel.status==='LOCKED'?'disabled':''}>${reel.status==='CURRENT'?'GENERATE REEL 01':'RESUME REEL '+String(reel.number).padStart(2,'0')}</button></article>`).join('')}</div><footer class="r64v2-footer"><span>8 progression stages = mission DNA</span><b>3 × 8 = 24 production shots</b><span>Continuity preserved across reels</span></footer></section>`;}
  function activate(){document.querySelectorAll('.r64v2-action').forEach(btn=>btn.addEventListener('click',()=>{const n=Number(btn.dataset.reel);state.reels[n-1].status='GENERATED';if(n<TOTAL_REELS)state.reels[n].status='CURRENT';render();}));}
  function boot(){const el=root();if(!el)return;render();activate();}
  window.KALP_RETRO64_UI_V2={boot,state,TOTAL_REELS,SHOTS_PER_REEL};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
