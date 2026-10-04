import { quantity, type Quantity } from "../simulation/v1-a/quantity.js";

export class InclineFrictionExperimentAdapter {
  constructor(private readonly massKg:number, private readonly angleDeg:number, private readonly coefficient:number, private readonly gravityMps2:number) {
    if (massKg<=0 || coefficient<0 || gravityMps2<=0) throw new Error("Invalid incline friction inputs");
  }
  step(_dt: Quantity): void {}
  measure() {
    const theta=this.angleDeg*Math.PI/180;
    const netForce=this.massKg*this.gravityMps2*(Math.sin(theta)-this.coefficient*Math.cos(theta));
    return [
      {id:"force",label:"Net Force",quantity:quantity(netForce,"N")},
      {id:"acceleration",label:"Acceleration",quantity:quantity(netForce/this.massKg,"m/s2")},
    ];
  }
  reset():void {}
}

export class WorkEnergyExperimentAdapter {
  constructor(private readonly forceN:number, private readonly distanceM:number, private readonly angleDeg:number) {}
  step(_dt: Quantity):void {}
  measure() {
    const work=this.forceN*this.distanceM*Math.cos(this.angleDeg*Math.PI/180);
    return [
      {id:"work",label:"Work",quantity:quantity(work,"J")},
      {id:"energy",label:"Energy",quantity:quantity(work,"J")},
    ];
  }
  reset():void {}
}

export class PowerExperimentAdapter {
  constructor(private readonly workJ:number, private readonly timeS:number) {
    if (timeS<=0) throw new Error("time must be positive s");
  }
  step(_dt: Quantity):void {}
  measure() { return [{id:"power",label:"Power",quantity:quantity(this.workJ/this.timeS,"W")}]; }
  reset():void {}
}

export class CircularMotionExperimentAdapter {
  constructor(private readonly massKg:number, private readonly radiusM:number, private readonly speedMps:number) {
    if (massKg<=0 || radiusM<=0) throw new Error("mass and radius must be positive");
  }
  step(_dt: Quantity):void {}
  measure() { return [{id:"centripetal_force",label:"Centripetal Force",quantity:quantity(this.massKg*this.speedMps*this.speedMps/this.radiusM,"N")}]; }
  reset():void {}
}

export class ThermalExpansionExperimentAdapter {
  constructor(private readonly lengthM:number, private readonly coefficientPerK:number, private readonly deltaTMagnitude:number) {}
  step(_dt: Quantity):void {}
  measure() { return [{id:"delta_length",label:"Change in Length",quantity:quantity(this.coefficientPerK*this.lengthM*this.deltaTMagnitude,"m")}]; }
  reset():void {}
}
