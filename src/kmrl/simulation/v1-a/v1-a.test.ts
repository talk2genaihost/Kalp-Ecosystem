import test from "node:test";
import assert from "node:assert/strict";
import {MaterialRegistry,add,compare,convert,quantity} from "../v1-a/index.js";
test("quantity converts temperature and amount units",()=>{assert.equal(convert(quantity(0,"degC"),"K").value,273.15);assert.equal(convert(quantity(1,"mol"),"mmol").value,1000);});
test("quantity rejects incompatible dimensions",()=>{assert.throws(()=>convert(quantity(1,"m"),"s"));});
test("quantity arithmetic validates dimensions",()=>{assert.equal(add(quantity(1,"m"),quantity(50,"cm")).value,1.5);assert.equal(compare(quantity(100,"cm"),quantity(1,"m")),0);});
test("material registry rejects duplicates and returns immutable copies",()=>{const r=new MaterialRegistry();r.register({id:"water",name:"Water",phases:["LIQUID"],properties:{}});assert.equal(r.has("water"),true);assert.throws(()=>r.register({id:"water",name:"Water",phases:["LIQUID"],properties:{}}));const m=r.get("water");m.phases.push("GAS");assert.deepEqual(r.get("water").phases,["LIQUID"]);});
