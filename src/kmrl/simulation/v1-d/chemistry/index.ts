import type {MaterialAmount,ReactionContext,ReactionDefinition} from "./types.js";
export interface ChemistryResult {status:"COMPLETED"|"NO_MATCH"|"CONDITION_NOT_MET";remaining:MaterialAmount[];products:MaterialAmount[];}
function conditionsPass(conditions:ReactionDefinition["conditions"],context:ReactionContext):boolean { return (conditions??[]).every(c=>{if(c.temperature.unit!==context.temperature.unit) throw new Error("Temperature units must match in v1.0-D"); return c.type==="MIN_TEMPERATURE"?context.temperature.value>=c.temperature.value:context.temperature.value<=c.temperature.value;}); }
export function runChemistry(materials:MaterialAmount[],reaction:ReactionDefinition,context:ReactionContext):ChemistryResult {
  for(const material of materials) if(material.amount.value<0) throw new Error("Material amount cannot be negative");
  if(!conditionsPass(reaction.conditions,context)) return {status:"CONDITION_NOT_MET",remaining:structuredClone(materials),products:[]};
  const extent=Math.min(...reaction.reactants.map(r=>{const found=materials.find(x=>x.materialId===r.materialId);return found?found.amount.value/r.coefficient:0;}));
  if(!Number.isFinite(extent)||extent<=0) return {status:"NO_MATCH",remaining:structuredClone(materials),products:[]};
  const remaining=materials.map(material=>{const required=reaction.reactants.find(x=>x.materialId===material.materialId);if(!required)return structuredClone(material);return {materialId:material.materialId,amount:{value:material.amount.value-required.coefficient*extent,unit:material.amount.unit}};});
  const products=reaction.products.map(product=>({materialId:product.materialId,amount:{value:product.coefficient*extent,unit:"mol"}}));
  return {status:"COMPLETED",remaining,products};
}
