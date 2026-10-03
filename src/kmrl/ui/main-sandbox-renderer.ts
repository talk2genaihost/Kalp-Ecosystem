import type { MainSandboxViewModel } from "./main-sandbox-controller.js";

const esc=(value:string):string=>value.replace(/[&<>\"]/g,char=>({"&":"&amp;","<":"&lt;","\u003e":"&gt;","\"":"&quot;"})[char]??char);
const number=(value:number,digits=3):string=>Number(value.toFixed(digits)).toString();

export function renderMainSandbox(view:MainSandboxViewModel):string{
  const running=view.status==="RUNNING";const paused=view.status==="PAUSED";
  const syncBanner=view.syncState==="CONFLICT"&&view.syncConflict?`<div class="kmrl-sync-alert" role="alert"><strong>Sync conflict</strong><span>Remote revision ${view.syncConflict.remoteRevision} is ahead of this experiment.</span><div class="kmrl-conflict-actions"><button data-action="resolve-remote">Keep remote</button><button data-action="resolve-local">Keep local</button></div></div>`:view.syncState==="OFFLINE"?`<div class="kmrl-sync-alert" role="status"><strong>Offline</strong><span>Changes are stored locally${view.pendingMutations?` · ${view.pendingMutations} pending`:""}.</span><button data-action="sync">Retry sync</button></div>`:view.syncState==="SYNCING"?`<div class="kmrl-sync-alert" role="status"><strong>Syncing…</strong><span>Saving experiment changes securely.</span></div>`:view.syncError?`<div class="kmrl-sync-alert" role="alert"><strong>Sync paused</strong><span>${esc(view.syncError)}</span><button data-action="sync">Retry sync</button></div>`:"";
  const guidedPanel=view.guided?`<section class="kmrl-guided-card"><div class="kmrl-card-title"><span>Guided Experiment</span><span>${view.guided.completed} / ${view.guided.total}</span></div><div class="kmrl-guided-body"><strong>${esc(view.guided.title)}</strong><p>${esc(view.guided.objective)}</p><div class="kmrl-guided-step"><span>Step ${view.guided.completed+1}</span><h3>${esc(view.guided.currentStep.title)}</h3><p>${esc(view.guided.currentStep.instruction)}</p><button data-action="complete-guided-step">Complete step</button></div></div></section>`:"";
  return `
  <section class="kmrl-shell" data-kmrl="main-sandbox">
    <header class="kmrl-header">
      <div><div class="kmrl-eyebrow">KMRL • EXPERIMENT LAB</div><h1>Main Sandbox</h1><p>${esc(view.experimentId)} · Tick ${view.tick}</p></div>
      <div class="kmrl-status-row"><button class="kmrl-library-button" data-action="open-library">Experiment Library</button><span class="kmrl-badge status-${view.status.toLowerCase()}">${view.status}</span><span class="kmrl-badge sync-${view.syncState.toLowerCase()}">${view.syncState}</span>${view.pendingMutations?`<span class="kmrl-pending">${view.pendingMutations} pending</span>`:""}</div>
    </header>
    ${syncBanner}
    ${guidedPanel}
    <main class="kmrl-workspace">
      <section class="kmrl-canvas-card">
        <div class="kmrl-card-title"><span>Sandbox World</span><span>Physics + Chemistry</span></div>
        <div class="kmrl-canvas" aria-label="KMRL sandbox world"><div class="kmrl-grid"></div><div class="kmrl-ground"></div><div class="kmrl-particle" style="--x:${Math.max(4,Math.min(92,50+view.science.physics.positionM.value*8))}%"></div><div class="kmrl-vector" style="--velocity:${Math.max(0,Math.min(160,Math.abs(view.science.physics.velocityMps.value)*20))}%"></div></div>
        <div class="kmrl-measure-strip"><div><span>Position</span><strong>${number(view.science.physics.positionM.value)} m</strong></div><div><span>Velocity</span><strong>${number(view.science.physics.velocityMps.value)} m/s</strong></div><div><span>Acceleration</span><strong>${number(view.science.physics.accelerationMps2.value)} m/s²</strong></div><div><span>Temperature</span><strong>${number(view.science.temperature.value)} ${esc(view.science.temperature.unit)}</strong></div></div>
      </section>
      <aside class="kmrl-panel">
        <div class="kmrl-panel-section"><div class="kmrl-card-title"><span>Experiment Controls</span></div><div class="kmrl-actions"><button data-action="start" ${view.status!=="CREATED"?"disabled":""}>Start</button><button data-action="pause" ${!running?"disabled":""}>Pause</button><button data-action="resume" ${!paused?"disabled":""}>Resume</button><button data-action="step" ${!running?"disabled":""}>Step</button><button data-action="checkpoint" ${view.status==="COMPLETED"?"disabled":""}>Checkpoint</button><button data-action="measure" ${!(running||paused)?"disabled":""}>Measure</button><button data-action="reset">Reset</button><button data-action="sync">Sync</button></div></div>
        <div class="kmrl-panel-section"><div class="kmrl-card-title"><span>Applied Force</span><span>N</span></div><input data-force type="range" min="-5" max="5" step="0.1" value="0" aria-label="Applied force in newtons"><div class="kmrl-range-readout"><span>−5 N</span><strong data-force-value>0 N</strong><span>+5 N</span></div></div>
        <div class="kmrl-panel-section"><div class="kmrl-card-title"><span>Latest Measurement</span></div>${view.measurements.length?(()=>{const m=view.measurements[view.measurements.length-1];return`<div class="kmrl-measurement"><strong>${esc(m.values[0]?.label??"Measurement")}</strong><span>${number(m.values[0]?.quantity.value??0)} ${esc(m.values[0]?.quantity.unit??"")}</span><small>Tick ${m.tick}</small></div>`;})():`<div class="kmrl-empty">No measurements yet. Start an experiment and tap Measure.</div>`}</div>
      </aside>
    </main>
  </section>`;
}
