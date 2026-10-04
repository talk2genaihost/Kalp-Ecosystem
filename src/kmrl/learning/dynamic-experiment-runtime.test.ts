import assert from "node:assert/strict";
import test from "node:test";
import { createDynamicExperimentRuntime } from "./dynamic-experiment-runtime.js";
import { validateStemLabCatalog } from "./excel-catalog-validator.js";
import { createKMRLModelRegistry } from "./model-registry.js";
import type { StemLabCatalog } from "./excel-catalog-loader.js";

function catalogFixture(): StemLabCatalog {
  const experimentId = "PHY-MEC-001";
  return {
    experiments: [{
      experimentId,
      domain: "PHYSICS",
      experimentName: "Constant Force Motion",
      category: "Mechanics",
      modelType: "constant_force",
      modelId: "constant_force",
      guidedFlow: ["OBSERVE", "INTERACT", "MEASURE", "REFLECT"],
      level: "FOUNDATION",
      status: "DEFINED",
      inputRefs: "Parameters sheet",
      measurementRefs: "Measurements sheet",
      safetyRef: `${experimentId}-SAFE`,
    }],
    modelContracts: [{
      modelId: "constant_force",
      domain: "PHYSICS",
      requiredInputs: ["mass", "force", "dt"],
      stateOutputs: ["position", "velocity", "acceleration"],
      ruleOrEquation: "F=m*a",
    }],
    parameters: [
      { experimentId, parameterId: `${experimentId}-P01`, parameterName: "primary_parameter", modelInput: "mass", defaultValue: 1, min: 0, max: 100, unit: "DOMAIN", learnerEditable: true },
      { experimentId, parameterId: `${experimentId}-P02`, parameterName: "secondary_parameter", modelInput: "force", defaultValue: 1, min: 0, max: 100, unit: "DOMAIN", learnerEditable: true },
      { experimentId, parameterId: `${experimentId}-P03`, parameterName: "time_step", modelInput: "dt", defaultValue: 0.1, min: 0.001, max: 10, unit: "s", learnerEditable: false },
    ],
    procedureSteps: [{ experimentId, stepNo: 1, stepType: "INTERACT", instruction: "Apply force", runtimeAction: "MODEL_DEFINED" }],
    measurements: [
      { measurementId: `${experimentId}-M01`, experimentId, measurementName: "Position", unit: "m", source: "position" },
    ],
    safety: [{ safetyId: `${experimentId}-SAFE`, experimentId, level: "LOW", hazards: "None", restrictions: "Standard lab rules" }],
    materials: [],
    outcomes: [{ experimentId, outcomeId: `${experimentId}-O01`, type: "OBSERVATION", condition: "step", expectedResult: "Motion changes" }],
    curriculumMap: [{ curriculumId: "PHY-MEC", domain: "PHYSICS", level: "FOUNDATION", topics: ["Mechanics"], seedCount: 1 }],
    mediaAssets: [],
    reactionDefinitions: [],
  };
}

test("catalog experiment launches through generic runtime without experiment-specific UI code", () => {
  const catalog = catalogFixture();
  const validation = validateStemLabCatalog(catalog);
  assert.equal(validation.valid, true);

  const registry = createKMRLModelRegistry(catalog);
  const runtime = createDynamicExperimentRuntime(
    catalog,
    registry,
    validation,
    "PHY-MEC-001",
  );

  let snapshot = runtime.getSnapshot();
  assert.equal(snapshot.experimentId, "PHY-MEC-001");
  assert.equal(snapshot.modelId, "constant_force");
  assert.equal(snapshot.status, "CREATED");

  const mass = snapshot.parameters.find((parameter) => parameter.parameterName === "primary_parameter");
  const force = snapshot.parameters.find((parameter) => parameter.parameterName === "secondary_parameter");
  assert.ok(mass);
  assert.ok(force);

  snapshot = runtime.dispatch({ type: "START" });
  snapshot = runtime.dispatch({ type: "SET_PARAMETER", parameterId: force!.parameterId, value: 10 });
  snapshot = runtime.dispatch({ type: "STEP" });
  assert.equal(snapshot.tick, 1);

  snapshot = runtime.dispatch({ type: "MEASURE" });
  assert.ok(snapshot.measurements.length >= 1);
  assert.equal(snapshot.measurements[0].id, "position");
});

test("a second Excel-defined experiment using the same registered model needs no new runtime implementation", () => {
  const catalog = catalogFixture();
  const validation = validateStemLabCatalog(catalog);
  assert.equal(validation.valid, true);

  const clone = structuredClone(catalog);
  clone.experiments.push({
    ...clone.experiments[0],
    experimentId: "PHY-MEC-001-CLONE",
    experimentName: "Constant Force Motion — Catalog Clone",
    safetyRef: "PHY-MEC-001-CLONE-SAFE",
  });
  clone.parameters = clone.parameters.concat(
    clone.parameters
      .filter((parameter) => parameter.experimentId === "PHY-MEC-001")
      .map((parameter) => ({ ...parameter, experimentId: "PHY-MEC-001-CLONE" })),
  );
  clone.procedureSteps = clone.procedureSteps.concat(
    clone.procedureSteps
      .filter((step) => step.experimentId === "PHY-MEC-001")
      .map((step) => ({ ...step, experimentId: "PHY-MEC-001-CLONE" })),
  );
  clone.measurements = clone.measurements.concat(
    clone.measurements
      .filter((measurement) => measurement.experimentId === "PHY-MEC-001")
      .map((measurement) => ({ ...measurement, experimentId: "PHY-MEC-001-CLONE", measurementId: measurement.measurementId.replace("PHY-MEC-001", "PHY-MEC-001-CLONE") })),
  );
  clone.safety = clone.safety.concat(
    clone.safety
      .filter((safety) => safety.experimentId === "PHY-MEC-001")
      .map((safety) => ({ ...safety, experimentId: "PHY-MEC-001-CLONE", safetyId: "PHY-MEC-001-CLONE-SAFE" })),
  );
  clone.outcomes = clone.outcomes.concat(
    clone.outcomes
      .filter((outcome) => outcome.experimentId === "PHY-MEC-001")
      .map((outcome) => ({ ...outcome, experimentId: "PHY-MEC-001-CLONE", outcomeId: outcome.outcomeId.replace("PHY-MEC-001", "PHY-MEC-001-CLONE") })),
  );

  const clonedValidation = validateStemLabCatalog(clone);
  assert.equal(clonedValidation.valid, true, JSON.stringify(clonedValidation.errors));

  const registry = createKMRLModelRegistry(clone);
  const runtime = createDynamicExperimentRuntime(
    clone,
    registry,
    clonedValidation,
    "PHY-MEC-001-CLONE",
  );
  runtime.dispatch({ type: "START" });
  const result = runtime.dispatch({ type: "STEP" });
  assert.equal(result.tick, 1);
  assert.equal(result.modelId, "constant_force");
});

test("heating-water catalog experiment launches through the same generic runtime", () => {
  const catalog = catalogFixture();
  catalog.experiments[0] = {
    ...catalog.experiments[0],
    experimentId: "CHE-THM-001",
    experimentName: "Heating Water",
    domain: "CHEMISTRY",
    modelType: "heating_water",
    modelId: "heating_water",
    safetyRef: "CHE-THM-001-SAFE",
  };
  catalog.modelContracts.push({
    modelId: "heating_water",
    domain: "CHEMISTRY",
    requiredInputs: ["mass", "energy", "dt"],
    stateOutputs: ["temperature"],
    ruleOrEquation: "Q=m*c*dT",
  });
  catalog.parameters = [
    { experimentId: "CHE-THM-001", parameterId: "CHE-THM-001-P01", parameterName: "primary_parameter", modelInput: "mass", defaultValue: 1, min: 0.1, max: 100, unit: "kg", learnerEditable: true },
    { experimentId: "CHE-THM-001", parameterId: "CHE-THM-001-P02", parameterName: "secondary_parameter", modelInput: "energy", defaultValue: 1000, min: 1, max: 100000, unit: "J", learnerEditable: true },
    { experimentId: "CHE-THM-001", parameterId: "CHE-THM-001-P03", parameterName: "time_step", modelInput: "dt", defaultValue: 0.1, min: 0.001, max: 10, unit: "s", learnerEditable: false },
  ];
  catalog.procedureSteps = [{ experimentId: "CHE-THM-001", stepNo: 1, stepType: "INTERACT", instruction: "Apply heat", runtimeAction: "MODEL_DEFINED" }];
  catalog.measurements = [{ measurementId: "CHE-THM-001-M01", experimentId: "CHE-THM-001", measurementName: "Temperature", unit: "degC", source: "temperature" }];
  catalog.safety = [{ safetyId: "CHE-THM-001-SAFE", experimentId: "CHE-THM-001", level: "LOW", hazards: "Heat", restrictions: "Handle carefully" }];
  catalog.outcomes = [{ experimentId: "CHE-THM-001", outcomeId: "CHE-THM-001-O01", type: "OBSERVATION", condition: "step", expectedResult: "Temperature increases" }];

  const validation = validateStemLabCatalog(catalog);
  assert.equal(validation.valid, true);
  const registry = createKMRLModelRegistry(catalog);
  const runtime = createDynamicExperimentRuntime(catalog, registry, validation, "CHE-THM-001");

  runtime.dispatch({ type: "START" });
  runtime.dispatch({ type: "SET_PARAMETER", parameterId: "CHE-THM-001-P02", value: 4186 });
  const result = runtime.dispatch({ type: "STEP" });
  assert.equal(result.tick, 1);
  const measured = runtime.dispatch({ type: "MEASURE" });
  assert.equal(measured.measurements[0].id, "temperature");
});

test("free-fall catalog experiment launches through the same generic runtime", () => {
  const experimentId = "PHY-MEC-002";
  const catalog = catalogFixture();
  catalog.experiments[0] = {
    ...catalog.experiments[0],
    experimentId,
    experimentName: "Free Fall",
    modelType: "free_fall",
    modelId: "free_fall",
    safetyRef: "PHY-MEC-002-SAFE",
  };
  catalog.modelContracts[0] = {
    modelId: "free_fall",
    domain: "PHYSICS",
    requiredInputs: ["gravity", "dt"],
    stateOutputs: ["height", "velocity", "acceleration"],
    ruleOrEquation: "a=-g",
  };
  catalog.parameters = [
    { experimentId, parameterId: "PHY-MEC-002-P01", parameterName: "gravity", modelInput: "gravity", defaultValue: 9.81, min: 0.1, max: 30, unit: "m/s2", learnerEditable: true },
    { experimentId, parameterId: "PHY-MEC-002-P02", parameterName: "time_step", modelInput: "dt", defaultValue: 0.1, min: 0.001, max: 10, unit: "s", learnerEditable: false },
  ];
  catalog.procedureSteps = [{ experimentId, stepNo: 1, stepType: "INTERACT", instruction: "Release object", runtimeAction: "MODEL_DEFINED" }];
  catalog.measurements = [{ measurementId: "PHY-MEC-002-M01", experimentId, measurementName: "Height", unit: "m", source: "height" }];
  catalog.safety = [{ safetyId: "PHY-MEC-002-SAFE", experimentId, level: "LOW", hazards: "Falling object", restrictions: "Use safe test area" }];
  catalog.outcomes = [{ experimentId, outcomeId: "PHY-MEC-002-O01", type: "OBSERVATION", condition: "step", expectedResult: "Velocity changes under gravity" }];

  const validation = validateStemLabCatalog(catalog);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  const registry = createKMRLModelRegistry(catalog);
  const runtime = createDynamicExperimentRuntime(catalog, registry, validation, experimentId);

  runtime.dispatch({ type: "START" });
  runtime.dispatch({ type: "STEP" });
  const measured = runtime.dispatch({ type: "MEASURE" });

  assert.equal(measured.tick, 1);
  assert.equal(measured.measurements[0].id, "height");
  assert.ok(measured.measurements[0].quantity.value < 0);
});

test("projectile-motion catalog experiment launches through the same generic runtime", () => {
  const experimentId = "PHY-MEC-003";
  const catalog = catalogFixture();
  catalog.experiments[0] = {
    ...catalog.experiments[0],
    experimentId,
    experimentName: "Projectile Motion",
    modelType: "projectile_motion",
    modelId: "projectile_motion",
    safetyRef: "PHY-MEC-003-SAFE",
  };
  catalog.modelContracts[0] = {
    modelId: "projectile_motion",
    domain: "PHYSICS",
    requiredInputs: ["speed", "angle", "gravity", "dt"],
    stateOutputs: ["x", "y", "speed"],
    ruleOrEquation: "projectile trajectory",
  };
  catalog.parameters = [
    { experimentId, parameterId: "PHY-MEC-003-P01", parameterName: "speed", modelInput: "speed", defaultValue: 20, min: 1, max: 100, unit: "m/s", learnerEditable: true },
    { experimentId, parameterId: "PHY-MEC-003-P02", parameterName: "angle", modelInput: "angle", defaultValue: 45, min: 0, max: 90, unit: "deg", learnerEditable: true },
    { experimentId, parameterId: "PHY-MEC-003-P03", parameterName: "gravity", modelInput: "gravity", defaultValue: 9.81, min: 0.1, max: 30, unit: "m/s2", learnerEditable: true },
    { experimentId, parameterId: "PHY-MEC-003-P04", parameterName: "time_step", modelInput: "dt", defaultValue: 0.1, min: 0.001, max: 1, unit: "s", learnerEditable: false },
  ];
  catalog.procedureSteps = [{ experimentId, stepNo: 1, stepType: "INTERACT", instruction: "Launch projectile", runtimeAction: "MODEL_DEFINED" }];
  catalog.measurements = [{ measurementId: "PHY-MEC-003-M01", experimentId, measurementName: "Horizontal Position", unit: "m", source: "x" }];
  catalog.safety = [{ safetyId: "PHY-MEC-003-SAFE", experimentId, level: "LOW", hazards: "Projectile motion", restrictions: "Use controlled environment" }];
  catalog.outcomes = [{ experimentId, outcomeId: "PHY-MEC-003-O01", type: "OBSERVATION", condition: "step", expectedResult: "Projectile follows a trajectory" }];

  const validation = validateStemLabCatalog(catalog);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  const registry = createKMRLModelRegistry(catalog);
  const runtime = createDynamicExperimentRuntime(catalog, registry, validation, experimentId);

  runtime.dispatch({ type: "START" });
  const measured = runtime.dispatch({ type: "MEASURE" });
  assert.equal(measured.measurements[0].id, "x");
  const stepped = runtime.dispatch({ type: "STEP" });
  assert.equal(stepped.tick, 1);
});

test("spring-mass catalog experiment launches through the same generic runtime", () => {
  const experimentId = "PHY-MEC-004";
  const catalog = catalogFixture();
  catalog.experiments[0] = { ...catalog.experiments[0], experimentId, experimentName: "Spring-Mass Oscillation", modelType: "spring_mass", modelId: "spring_mass", safetyRef: "PHY-MEC-004-SAFE" };
  catalog.modelContracts[0] = { modelId: "spring_mass", domain: "PHYSICS", requiredInputs: ["mass", "spring_constant", "dt"], stateOutputs: ["displacement", "velocity", "acceleration"], ruleOrEquation: "F=-k*x" };
  catalog.parameters = [
    { experimentId, parameterId: "PHY-MEC-004-P01", parameterName: "mass", modelInput: "mass", defaultValue: 1, min: 0.1, max: 100, unit: "kg", learnerEditable: true },
    { experimentId, parameterId: "PHY-MEC-004-P02", parameterName: "spring_constant", modelInput: "spring_constant", defaultValue: 10, min: 0.1, max: 1000, unit: "N/m", learnerEditable: true },
    { experimentId, parameterId: "PHY-MEC-004-P03", parameterName: "time_step", modelInput: "dt", defaultValue: 0.01, min: 0.001, max: 1, unit: "s", learnerEditable: false },
  ];
  catalog.procedureSteps = [{ experimentId, stepNo: 1, stepType: "INTERACT", instruction: "Release spring", runtimeAction: "MODEL_DEFINED" }];
  catalog.measurements = [{ measurementId: "PHY-MEC-004-M01", experimentId, measurementName: "Displacement", unit: "m", source: "displacement" }];
  catalog.safety = [{ safetyId: "PHY-MEC-004-SAFE", experimentId, level: "LOW", hazards: "Stored spring energy", restrictions: "Use controlled displacement" }];
  catalog.outcomes = [{ experimentId, outcomeId: "PHY-MEC-004-O01", type: "OBSERVATION", condition: "step", expectedResult: "Oscillatory displacement changes" }];

  const validation = validateStemLabCatalog(catalog);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  const registry = createKMRLModelRegistry(catalog);
  const runtime = createDynamicExperimentRuntime(catalog, registry, validation, experimentId);

  runtime.dispatch({ type: "START" });
  runtime.dispatch({ type: "STEP" });
  const measured = runtime.dispatch({ type: "MEASURE" });
  assert.equal(measured.tick, 1);
  assert.equal(measured.measurements[0].id, "displacement");
});

test("pendulum catalog experiment executes the Excel-defined closed-form calculation", () => {
  const experimentId = "PHY-MEC-005";
  const catalog = catalogFixture();
  catalog.experiments[0] = { ...catalog.experiments[0], experimentId, experimentName: "Pendulum", modelType: "pendulum", modelId: "pendulum", safetyRef: "PHY-MEC-005-SAFE" };
  catalog.modelContracts[0] = { modelId: "pendulum", domain: "PHYSICS", requiredInputs: ["length", "gravity"], stateOutputs: ["period"], ruleOrEquation: "T=2*pi*sqrt(L/g)" };
  catalog.parameters = [
    { experimentId, parameterId: "PHY-MEC-005-P01", parameterName: "length", modelInput: "length", defaultValue: 1, min: 0.1, max: 100, unit: "m", learnerEditable: true },
    { experimentId, parameterId: "PHY-MEC-005-P02", parameterName: "gravity", modelInput: "gravity", defaultValue: 9.81, min: 0.1, max: 30, unit: "m/s2", learnerEditable: true },
    { experimentId, parameterId: "PHY-MEC-005-P03", parameterName: "time_step", modelInput: "", defaultValue: 0.1, min: 0.001, max: 10, unit: "s", learnerEditable: false },
  ];
  catalog.procedureSteps = [{ experimentId, stepNo: 1, stepType: "MEASURE", instruction: "Calculate pendulum period", runtimeAction: "MODEL_DEFINED" }];
  catalog.measurements = [{ measurementId: "PHY-MEC-005-M01", experimentId, measurementName: "Period", unit: "s", source: "period" }];
  catalog.safety = [{ safetyId: "PHY-MEC-005-SAFE", experimentId, level: "LOW", hazards: "Pendulum motion", restrictions: "Use controlled setup" }];
  catalog.outcomes = [{ experimentId, outcomeId: "PHY-MEC-005-O01", type: "CALCULATION", condition: "measure", expectedResult: "Period follows T=2*pi*sqrt(L/g)" }];

  const validation = validateStemLabCatalog(catalog);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  const registry = createKMRLModelRegistry(catalog);
  const runtime = createDynamicExperimentRuntime(catalog, registry, validation, experimentId);

  runtime.dispatch({ type: "START" });
  const measured = runtime.dispatch({ type: "MEASURE" });
  assert.equal(measured.measurements[0].id, "period");
  assert.ok(Math.abs(measured.measurements[0].quantity.value - 2 * Math.PI * Math.sqrt(1 / 9.81)) < 1e-12);
});


test("CHE-MIX-002 launches from the canonical Excel reaction definition without runtime reaction injection", () => {
  const experimentId = "CHE-MIX-002";
  const catalog = catalogFixture();
  catalog.experiments[0] = {
    ...catalog.experiments[0], experimentId, domain:"CHEMISTRY", experimentName:"Mixing Materials: Observe a System Change",
    modelType:"registered_reaction", modelId:"registered_reaction", safetyRef:"CHE-MIX-002-SAFE"
  };
  catalog.modelContracts[0] = {
    modelId:"registered_reaction", domain:"CHEMISTRY",
    requiredInputs:["material:MAT-HCL","material:MAT-NAOH","dt"],
    stateOutputs:["material amounts","chemistry status","reaction events"],
    ruleOrEquation:"HCl(aq) + NaOH(aq) → NaCl(aq) + H2O(l)"
  };
  catalog.parameters = [
    {experimentId,parameterId:"CHE-MIX-002-P01",parameterName:"primary_parameter",modelInput:"material:MAT-HCL",defaultValue:1,min:0,max:100,unit:"mol",learnerEditable:true},
    {experimentId,parameterId:"CHE-MIX-002-P02",parameterName:"secondary_parameter",modelInput:"material:MAT-NAOH",defaultValue:1,min:0,max:100,unit:"mol",learnerEditable:true},
    {experimentId,parameterId:"CHE-MIX-002-P03",parameterName:"time_step",modelInput:"dt",defaultValue:0.1,min:0.001,max:10,unit:"s",learnerEditable:false},
  ];
  catalog.materials = [
    {materialId:"MAT-HCL",materialName:"Hydrochloric Acid",domain:"CHEMISTRY",unit:"mol",state:"aqueous",keyProperties:["concentration"]},
    {materialId:"MAT-NAOH",materialName:"Sodium Hydroxide",domain:"CHEMISTRY",unit:"mol",state:"aqueous",keyProperties:["concentration"]},
    {materialId:"MAT-NACL",materialName:"Sodium Chloride",domain:"CHEMISTRY",unit:"mol",state:"aqueous",keyProperties:["salt","electrolyte"]},
    {materialId:"MAT-H2O",materialName:"Water",domain:"CHEMISTRY",unit:"mol",state:"liquid",keyProperties:["specific_heat","density"]},
  ];
  catalog.procedureSteps = [{experimentId,stepNo:1,stepType:"INTERACT",instruction:"Mix acid and base",runtimeAction:"MODEL_DEFINED"}];
  catalog.measurements = [{measurementId:"CHE-MIX-002-M01",experimentId,measurementName:"Material Amounts",unit:"mol",source:"material amounts"}];
  catalog.safety = [{safetyId:"CHE-MIX-002-SAFE",experimentId,level:"LOW",hazards:"Chemical simulation",restrictions:"Simulation only"}];
  catalog.outcomes = [{experimentId,outcomeId:"CHE-MIX-002-O01",type:"OBSERVATION",condition:"step",expectedResult:"Neutralization produces salt and water"}];
  catalog.reactionDefinitions = [{
    reactionId:"RXN-CHE-MIX-002-001",experimentId,reactionName:"Hydrochloric Acid + Sodium Hydroxide Neutralization",
    reactants:["MAT-HCL:1","MAT-NAOH:1"],products:["MAT-NACL:1","MAT-H2O:1"],conditions:[],status:"CANONICAL"
  }];

  const validation = validateStemLabCatalog(catalog);
  assert.equal(validation.valid, true, JSON.stringify(validation.errors));
  const registry = createKMRLModelRegistry(catalog);
  const runtime = createDynamicExperimentRuntime(catalog, registry, validation, experimentId);

  runtime.dispatch({type:"START"});
  const measured = runtime.dispatch({type:"MEASURE"});
  assert.ok(measured.measurements.length >= 1);
  runtime.dispatch({type:"STEP"});
  const after = runtime.dispatch({type:"MEASURE"});
  assert.equal(after.tick, 1);
});
