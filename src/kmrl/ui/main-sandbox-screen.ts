import { quantity } from "../simulation/v1-a/quantity.js";
import type { ExperimentRuntime } from "../runtime/experiment-runtime.js";
import type { ExperimentCommand } from "../runtime/types.js";
import type { OfflineQueuePort } from "../contracts/offline.js";
import type { MainSandboxSyncPort, MainSandboxViewModel } from "./main-sandbox-controller.js";
import { MainSandboxController } from "./main-sandbox-controller.js";
import { renderMainSandbox } from "./main-sandbox-renderer.js";
import type { GuidedExperimentSession } from "../learning/experiment-library.js";

export interface MainSandboxScreenOptions { readonly onOpenLibrary?: () => void; }

export class MainSandboxScreen {
  private readonly controller:MainSandboxController; private forceN=0; private root?:HTMLElement;
  constructor(runtime:ExperimentRuntime,offline:OfflineQueuePort,syncPort?:MainSandboxSyncPort,private readonly options:MainSandboxScreenOptions={},private readonly guided?:GuidedExperimentSession){this.controller=new MainSandboxController(runtime,offline,syncPort);}
  mount(root:HTMLElement):void{this.root=root;this.bindNetworkState();this.render();}
  render():void{if(!this.root)return;this.root.innerHTML=renderMainSandbox(this.view());this.bindEvents();}
  private view():MainSandboxViewModel{const base=this.controller.view();if(!this.guided)return base;const definition=this.guided.definition();const progress=this.guided.progress();return{...base,guided:{title:definition.title,objective:definition.objective,currentStep:this.guided.currentStep(),completed:progress.completed,total:progress.total}};}
  private bindEvents():void{if(!this.root)return;this.root.querySelectorAll<HTMLButtonElement>("[data-action]").forEach(button=>button.addEventListener("click",()=>void this.handleAction(button.dataset.action??"")));const force=this.root.querySelector<HTMLInputElement>("[data-force]");const forceValue=this.root.querySelector<HTMLElement>("[data-force-value]");force?.addEventListener("input",()=>{this.forceN=Number(force.value);if(forceValue)forceValue.textContent=`${this.forceN.toFixed(1)} N`;});}
  private async handleAction(action:string):Promise<void>{try{switch(action){case"open-library":this.options.onOpenLibrary?.();return;case"complete-guided-step":this.guided?.completeCurrentStep();this.render();return;case"start":this.dispatch({type:"START"});break;case"pause":this.dispatch({type:"PAUSE"});break;case"resume":this.dispatch({type:"RESUME"});break;case"step":this.dispatch({type:"STEP",input:{dtS:0.1,netForce:quantity(this.forceN,"N")}});break;case"checkpoint":this.dispatch({type:"CHECKPOINT"});break;case"measure":{const view=this.controller.view();this.dispatch({type:"MEASURE",measurement:{id:`velocity-${view.tick}`,label:"Velocity",quantity:view.science.physics.velocityMps}});break;}case"reset":this.dispatch({type:"RESET"});break;case"sync":await this.controller.sync();this.render();break;case"resolve-remote":await this.controller.resolveConflict("KEEP_REMOTE");this.render();break;case"resolve-local":await this.controller.resolveConflict("KEEP_LOCAL");this.render();break;}}catch(error){this.showError(error instanceof Error?error.message:"KMRL command failed");}}
  private dispatch(command:ExperimentCommand):void{this.controller.command(command);this.render();}
  private bindNetworkState():void{const update=()=>{this.controller.setSyncState(navigator.onLine?"ONLINE":"OFFLINE");this.render();};window.addEventListener("online",update);window.addEventListener("offline",update);update();}
  private showError(message:string):void{if(!this.root)return;const node=document.createElement("div");node.className="kmrl-error";node.textContent=message;this.root.prepend(node);window.setTimeout(()=>node.remove(),2800);}
}
