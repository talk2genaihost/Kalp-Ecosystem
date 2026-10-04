import assert from "node:assert/strict";
import test from "node:test";
import { validateStemLabCatalog } from "./excel-catalog-validator.js";
import type { StemLabCatalog } from "./excel-catalog-loader.js";

function validCatalog(): StemLabCatalog {
  return {
    experiments: [{
      experimentId:"PHY-MEC-001", domain:"PHYSICS", experimentName:"Constant Force Motion",
      category:"Mechanics", modelType:"constant_force", modelId:"constant_force",
      guidedFlow:["OBSERVE","INTERACT","MEASURE","REFLECT"], level:"FOUNDATION", status:"DEFINED",
      inputRefs:"Parameters sheet", measurementRefs:"Measurements sheet", safetyRef:"S01"
    }],
    modelContracts: [{
      modelId:"constant_force", domain:"PHYSICS", requiredInputs:["mass","force","dt"],
      stateOutputs:["position","velocity","acceleration"], ruleOrEquation:"F=m*a"
    }],
    parameters: [
      {experimentId:"PHY-MEC-001",parameterId:"P01",parameterName:"mass",modelInput:"mass",defaultValue:1,min:0.1,max:100,unit:"kg",learnerEditable:true},
      {experimentId:"PHY-MEC-001",parameterId:"P02",parameterName:"force",modelInput:"force",defaultValue:10,min:0,max:100,unit:"N",learnerEditable:true},
      {experimentId:"PHY-MEC-001",parameterId:"P03",parameterName:"time_step",modelInput:"dt",defaultValue:0.1,min:0.001,max:10,unit:"s",learnerEditable:false}
    ],
    procedureSteps: [{experimentId:"PHY-MEC-001",stepNo:1,stepType:"OBSERVE",instruction:"Observe motion",runtimeAction:"Model/UI defined"}],
    measurements: [{measurementId:"M01",experimentId:"PHY-MEC-001",measurementName:"Velocity",unit:"m/s",source:"runtime state"}],
    safety: [{safetyId:"S01",experimentId:"PHY-MEC-001",level:"LOW",hazards:"Simulation only",restrictions:"No physical procedure"}],
    materials: [{materialId:"MAT-H2O",materialName:"Water",domain:"CHEMISTRY",unit:"kg",state:"liquid",keyProperties:["specific_heat","density"]}],
    outcomes: [{experimentId:"PHY-MEC-001",outcomeId:"O01",type:"EXPECTED",condition:"valid parameter range",expectedResult:"Model-defined result"}],
    curriculumMap: [{curriculumId:"PHYSICS-FOUNDATION",domain:"PHYSICS",level:"FOUNDATION",topics:["Mechanics"],seedCount:1}],
    mediaAssets: [{mediaId:"MEDIA-01",experimentId:"PHY-MEC-001",assetType:"diagram",assetKey:"PHY-MEC-001_diagram",required:false}]
    ,reactionDefinitions: []
  };
}

test("valid STEM catalog passes structural validation", () => {
  const result = validateStemLabCatalog(validCatalog());
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validator catches missing model references", () => {
  const catalog = validCatalog();
  catalog.experiments[0].modelId = "missing_model";
  const result = validateStemLabCatalog(catalog);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.code === "MODEL_REFERENCE_MISSING"));
});

test("validator catches model/experiment domain mismatch", () => {
  const catalog = validCatalog();
  catalog.modelContracts[0].domain = "CHEMISTRY";
  const result = validateStemLabCatalog(catalog);
  assert.ok(result.errors.some((e) => e.code === "MODEL_DOMAIN_MISMATCH"));
});

test("validator catches parameter range and duplicate parameter IDs", () => {
  const catalog = validCatalog();
  catalog.parameters[0].defaultValue = 200;
  catalog.parameters.push({...catalog.parameters[0]});
  const result = validateStemLabCatalog(catalog);
  assert.ok(result.errors.some((e) => e.code === "PARAMETER_DEFAULT_OUT_OF_RANGE"));
  assert.ok(result.errors.some((e) => e.code === "DUPLICATE_PARAMETER_ID"));
});

test("validator catches unknown experiment references and invalid procedure ordering", () => {
  const catalog = validCatalog();
  catalog.procedureSteps.push({...catalog.procedureSteps[0], stepNo:1});
  catalog.measurements[0].experimentId = "UNKNOWN";
  const result = validateStemLabCatalog(catalog);
  assert.ok(result.errors.some((e) => e.code === "DUPLICATE_STEP_NUMBER"));
  assert.ok(result.errors.some((e) => e.code === "EXPERIMENT_REFERENCE_MISSING"));
});

test("validator allows completely unmapped seed experiments", () => {
  const catalog = validCatalog();
  catalog.parameters = catalog.parameters.map((parameter) => ({...parameter, modelInput:""}));
  const result = validateStemLabCatalog(catalog);
  assert.equal(result.valid, true);
  assert.ok(result.warnings.some((warning) => warning.code === "EXPERIMENT_MODEL_INPUTS_UNMAPPED"));
});

test("validator rejects missing semantic model-input mappings", () => {
  const catalog = validCatalog();
  catalog.parameters = catalog.parameters.filter((parameter) => parameter.modelInput !== "force");
  const result = validateStemLabCatalog(catalog);
  assert.ok(result.errors.some((e) => e.code === "MODEL_INPUT_MAPPING_MISSING"));
});

test("validator rejects duplicate semantic model-input mappings", () => {
  const catalog = validCatalog();
  catalog.parameters.push({...catalog.parameters[0], parameterId:"P99"});
  const result = validateStemLabCatalog(catalog);
  assert.ok(result.errors.some((e) => e.code === "DUPLICATE_MODEL_INPUT_MAPPING"));
});

test("validator keeps runtime executability separate from catalog validity", () => {
  const catalog = validCatalog();
  catalog.experiments[0].modelId = "catalog_only_model";
  catalog.modelContracts[0].modelId = "catalog_only_model";
  const result = validateStemLabCatalog(catalog);
  assert.equal(result.valid, true);
});


test("validator validates reaction definition source references and status", () => {
  const catalog = validCatalog();
  catalog.reactionDefinitions.push({
    reactionId:"RXN-001", experimentId:"PHY-MEC-001", reactionName:"Test Reaction",
    reactants:["MAT-A:1"], products:["MAT-B:1"], conditions:["MIN_TEMPERATURE:25"], status:"PROPOSED"
  });
  let result = validateStemLabCatalog(catalog);
  assert.equal(result.valid, true);

  catalog.reactionDefinitions[0].experimentId = "UNKNOWN";
  result = validateStemLabCatalog(catalog);
  assert.ok(result.errors.some((e) => e.code === "EXPERIMENT_REFERENCE_MISSING" && e.sheet === "REACTION_DEFINITIONS"));

  catalog.reactionDefinitions[0].experimentId = "PHY-MEC-001";
  catalog.reactionDefinitions[0].status = "INVALID";
  result = validateStemLabCatalog(catalog);
  assert.ok(result.errors.some((e) => e.code === "INVALID_REACTION_STATUS"));

  catalog.reactionDefinitions[0].status = "CANONICAL";
  catalog.reactionDefinitions[0].reactants = ["UNKNOWN-MATERIAL:1"];
  result = validateStemLabCatalog(catalog);
  assert.ok(result.errors.some((e) => e.code === "REACTION_MATERIAL_REFERENCE_MISSING"));
});
