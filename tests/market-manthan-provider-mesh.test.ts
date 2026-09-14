import test from "node:test";
import assert from "node:assert/strict";
import { initialFreeProviderMesh, SyntheticFixtureAdapter, safeEndpointForEvidence } from "../src/market-to-revenue/provider-adapters-v01.js";
import { selectEvidenceProviders } from "../src/market-to-revenue/paf-gateway-v01.js";
test("mesh has four selected providers",()=>assert.deepEqual(initialFreeProviderMesh.map(p=>p.provider_id),["MM-PROV-ALPHA-001","MM-PROV-FINNHUB-001","MM-PROV-GDELT-001","MM-PROV-GEMINI-001"]));
test("fixture remains test provider",async()=>{const r=await new SyntheticFixtureAdapter().fetch({});assert.equal(r.provider_id,"MM-PAF-FIXTURE");assert.equal(r.status,"ok")});
test("PAF excludes fixture evidence",()=>{const a={provider_id:"MM-PROV-GDELT-001",provider_name:"GDELT",role:"news-intelligence" as const,status:"ok" as const,observed_at:new Date().toISOString(),data:{},request_meta:{endpoint:"x",adapter_version:"MM-PAF-v0.1"}};const b={provider_id:"MM-PAF-FIXTURE",provider_name:"fixture",role:"fixture" as const,status:"ok" as const,observed_at:new Date().toISOString(),data:{},request_meta:{endpoint:"fixture",adapter_version:"MM-PAF-v0.1"}};assert.deepEqual(selectEvidenceProviders([a,b]).map(x=>x.provider_id),["MM-PROV-GDELT-001"])});
test("evidence endpoint redaction removes credential query parameters",()=>{const endpoint="https://example.test/api?symbol=IBM&apikey=SECRET_A&token=SECRET_B&key=SECRET_C&query=market";const safe=safeEndpointForEvidence(endpoint);assert.equal(safe,"https://example.test/api");assert.doesNotMatch(safe,/SECRET_A|SECRET_B|SECRET_C/);});
