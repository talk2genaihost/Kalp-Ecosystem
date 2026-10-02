import type {Quantity} from "./quantity.js";
export type MaterialPhase = "SOLID" | "LIQUID" | "GAS" | "PLASMA";
export interface MaterialProperties {
  density?: Quantity; specificHeatCapacity?: Quantity; meltingPoint?: Quantity;
  boilingPoint?: Quantity; thermalConductivity?: Quantity; electricalConductivity?: Quantity; pH?: number;
}
export interface MaterialDefinition { id:string; name:string; phases:MaterialPhase[]; properties:MaterialProperties; tags?:string[]; }
export const CANONICAL_MATERIAL_IDS = ["water","ice","steam","iron","copper","aluminum","wood","sand","oxygen","carbon-dioxide","hydrogen"] as const;
export type CanonicalMaterialId = typeof CANONICAL_MATERIAL_IDS[number];
const clone = <T>(value:T):T => structuredClone(value);
export class MaterialRegistry {
  private readonly materials = new Map<string, MaterialDefinition>();
  register(definition: MaterialDefinition): void {
    if (!definition.id || !definition.name) throw new Error("Material ID and name are required");
    if (!definition.phases.length) throw new Error("Material requires at least one phase");
    if (this.materials.has(definition.id)) throw new Error(`Material already registered: ${definition.id}`);
    this.materials.set(definition.id, clone(definition));
  }
  get(id:string): MaterialDefinition { const value=this.materials.get(id); if(!value) throw new Error(`Material not found: ${id}`); return clone(value); }
  has(id:string): boolean { return this.materials.has(id); }
  list(): MaterialDefinition[] { return [...this.materials.values()].map((item) => clone(item)); }
  remove(id:string): void { this.materials.delete(id); }
}
