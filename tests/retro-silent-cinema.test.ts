import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
const {createSilentCinemaPlan,detectGenre}=require("../apps/cinematic-studio/engine/retro-silent-cinema.cjs");
test("builds a mythological silent-film blueprint",()=>{
 const p=createSilentCinemaPlan({request:"Recreate the Ramayana golden deer episode as a 1920s Indian silent mythological film.",genre:"auto",format:"short-film",aspect_ratio:"4:3",style:"authentic-1920s-indian",characters:["Rama","Sita","Lakshmana","Maricha"]});
 assert.equal(p.module,"KALP-CINE-RSCE-001");assert.equal(p.input.genre,"mythological");assert.equal(p.production.scene_count,8);assert.equal(p.transformation.dialogue_mode,"visual-performance-and-intertitles");assert.equal(p.continuity.character_identity_lock,true);assert.equal(p.validation.renderer_ready,false);
});
test("supports vertical advertisements",()=>{
 const p=createSilentCinemaPlan({request:"Create a silent film advertisement for a new rice brand.",genre:"auto",format:"advertisement",aspect_ratio:"9:16",style:"indian-mythological"});
 assert.equal(p.input.genre,"advertisement");assert.equal(p.input.aspect_ratio,"9:16");
});
test("rejects short briefs and unsupported profiles",()=>{
 assert.throws(()=>createSilentCinemaPlan({request:"short"}),/at least 12 characters/);
 assert.throws(()=>createSilentCinemaPlan({request:"A sufficiently detailed creative brief",style:"modern-3d"}),/Unsupported silent-film style/);
});
test("explicit genre takes precedence over auto-detection",()=>assert.equal(detectGenre("A love story in a palace","historical"),"historical"));
