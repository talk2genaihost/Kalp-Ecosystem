export type QuantityType =
  | "DIMENSIONLESS" | "LENGTH" | "MASS" | "TIME" | "FORCE"
  | "ENERGY" | "MOMENTUM" | "SPEED" | "ACCELERATION" | "AMOUNT" | "TEMPERATURE";

export interface UnitDefinition {
  id: string;
  symbol: string;
  quantity: QuantityType;
  scaleToBase: number;
  offsetToBase?: number;
}

export interface Quantity { value: number; unit: string; }

const units: Record<string, UnitDefinition> = {
  "1": {id:"dimensionless", symbol:"1", quantity:"DIMENSIONLESS", scaleToBase:1},
  "m": {id:"meter", symbol:"m", quantity:"LENGTH", scaleToBase:1},
  "cm": {id:"centimeter", symbol:"cm", quantity:"LENGTH", scaleToBase:0.01},
  "kg": {id:"kilogram", symbol:"kg", quantity:"MASS", scaleToBase:1},
  "g": {id:"gram", symbol:"g", quantity:"MASS", scaleToBase:0.001},
  "s": {id:"second", symbol:"s", quantity:"TIME", scaleToBase:1},
  "N": {id:"newton", symbol:"N", quantity:"FORCE", scaleToBase:1},
  "J": {id:"joule", symbol:"J", quantity:"ENERGY", scaleToBase:1},
  "kg*m/s": {id:"kilogram-meter-per-second", symbol:"kg*m/s", quantity:"MOMENTUM", scaleToBase:1},
  "m/s": {id:"meter-per-second", symbol:"m/s", quantity:"SPEED", scaleToBase:1},
  "m/s2": {id:"meter-per-second-squared", symbol:"m/s2", quantity:"ACCELERATION", scaleToBase:1},
  "mol": {id:"mole", symbol:"mol", quantity:"AMOUNT", scaleToBase:1},
  "mmol": {id:"millimole", symbol:"mmol", quantity:"AMOUNT", scaleToBase:0.001},
  "degC": {id:"celsius", symbol:"degC", quantity:"TEMPERATURE", scaleToBase:1, offsetToBase:0},
  "K": {id:"kelvin", symbol:"K", quantity:"TEMPERATURE", scaleToBase:1, offsetToBase:-273.15}
};

export function defineUnit(unit: UnitDefinition): void {
  if (!unit.id || !unit.symbol || !Number.isFinite(unit.scaleToBase) || unit.scaleToBase <= 0) throw new Error("Invalid unit definition");
  if (units[unit.symbol]) throw new Error(`Unit already registered: ${unit.symbol}`);
  units[unit.symbol] = structuredClone(unit);
}
export function getUnit(symbol: string): UnitDefinition {
  const unit = units[symbol];
  if (!unit) throw new Error(`Unknown unit: ${symbol}`);
  return structuredClone(unit);
}
export function quantity(value: number, unit: string): Quantity {
  if (!Number.isFinite(value)) throw new Error("Quantity value must be finite");
  getUnit(unit);
  return {value, unit};
}
export function convert(input: Quantity, targetUnit: string): Quantity {
  const from = getUnit(input.unit); const to = getUnit(targetUnit);
  if (from.quantity !== to.quantity) throw new Error("Incompatible quantity dimensions");
  const base = input.value * from.scaleToBase + (from.offsetToBase ?? 0);
  const value = (base - (to.offsetToBase ?? 0)) / to.scaleToBase;
  return quantity(value, targetUnit);
}
export function add(a: Quantity, b: Quantity): Quantity { return quantity(a.value + convert(b, a.unit).value, a.unit); }
export function subtract(a: Quantity, b: Quantity): Quantity { return quantity(a.value - convert(b, a.unit).value, a.unit); }
export function compare(a: Quantity, b: Quantity): number { const v=convert(b,a.unit).value; return a.value===v?0:a.value<v?-1:1; }
