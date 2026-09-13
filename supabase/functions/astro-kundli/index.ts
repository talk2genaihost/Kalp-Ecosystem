import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { calculateKalpLagna } from "./kalp-lagna.ts";

type R = Record<string, unknown>;
const corsHeaders = {"Access-Control-Allow-Origin":"https://talk2genaihost.github.io","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { ...corsHeaders, "Content-Type":"application/json" } });
const obj = (x: unknown): R => x && typeof x === "object" && !Array.isArray(x) ? x as R : {};
const arr = (x: unknown): unknown[] => Array.isArray(x) ? x : [];
const scalar = (x: unknown): string | number | null => { if (typeof x === "string" || typeof x === "number") return String(x).trim() || null; const r=obj(x); for (const k of ["name","vedicName","vedic_name","label","value","sign","rashi","title","zodiac","ascSign"]) { const v=r[k]; if (typeof v === "string" || typeof v === "number") { const s=String(v).trim(); if (s) return s; } } return null; };
const norm = (x: unknown) => String(x ?? "").toLowerCase().replace(/[ _-]/g, "");
function planetByName(planets: unknown[], names: string[]): R { const target=names.map(norm); return obj(planets.find(p=>target.includes(norm(obj(p).name))||target.includes(norm(obj(p).planet)))); }
function firstValue(root:R, keys:string[]): string|null { for(const key of keys){ const v=scalar(root[key]); if(v) return String(v); } return null; }
function dashaPeriods(raw:R): unknown[] { const d=obj(raw.dasha); for(const candidate of [raw.allPeriods,raw.all_periods,raw.dashaPeriods,raw.dasha_periods,d.allPeriods,d.all_periods,d.periods]) if(Array.isArray(candidate)) return candidate; return []; }
function currentDasha(periods:unknown[], raw:R): {mahadasha:string|null; antardasha:string|null; pratyantardasha:string|null} {
  const d=obj(raw.dasha);
  const direct={mahadasha:scalar(d.current??d.mahadasha),antardasha:scalar(d.sub??d.antardasha),pratyantardasha:scalar(d.pratyantar??d.pratyantardasha)};
  if(direct.mahadasha) return direct;
  const now=Date.now();
  for(const item of periods){ const p=obj(item); const start=Date.parse(String(p.start??p.startDate??"")); const end=Date.parse(String(p.end??p.endDate??"")); if(Number.isFinite(start)&&Number.isFinite(end)&&now>=start&&now<=end) return {mahadasha:scalar(p.maha??p.Maha??p.mahadasha??p.lord??p.name),antardasha:null,pratyantardasha:null}; }
  const first=obj(periods[0]); return {mahadasha:scalar(first.maha??first.Maha??first.mahadasha??first.lord??first.name),antardasha:null,pratyantardasha:null};
}
function nakshatraFromMoon(moon:R): {name:string|null;pada:number|null;lord:string|null;source:string} {
  const degree=Number(moon.degree); const sign=String(moon.sign??"");
  const signIndex=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"].indexOf(sign);
  if(!Number.isFinite(degree)||signIndex<0) return {name:null,pada:null,lord:null,source:"UNAVAILABLE"};
  const longitude=signIndex*30+degree; const span=13+20/60; const index=Math.floor(longitude/span);
  const names=["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
  const lords=["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
  const name=names[index]??null; const within=name?longitude-index*span:0; const pada=name?Math.min(4,Math.floor(within/(span/4))+1):null;
  return {name,pada,lord:name?lords[index%9]:null,source:name?"KALP_CALCULATED":"UNAVAILABLE"};
}

// OpenKundali's chart response supplies sidereal Sun/Moon longitudes but its
// documented chart payload does not expose the five Panchanga fields or a
// Manglik flag. KALP therefore derives these fields strictly from the
// provider-supplied chart positions and keeps them explicitly CALCULATED.
function panchangaFromPlanets(sun:R, moon:R): {tithi:string|null; karana:string|null; yoga:string|null; source:string} {
  const signs=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const sunSign=signs.indexOf(String(sun.sign??"")); const moonSign=signs.indexOf(String(moon.sign??""));
  const sunDegree=Number(sun.degree), moonDegree=Number(moon.degree);
  if(sunSign<0||moonSign<0||!Number.isFinite(sunDegree)||!Number.isFinite(moonDegree)) return {tithi:null,karana:null,yoga:null,source:"UNAVAILABLE"};
  const sunLongitude=sunSign*30+sunDegree; const moonLongitude=moonSign*30+moonDegree;
  const elongation=(moonLongitude-sunLongitude+360)%360;
  const tithiIndex=Math.floor(elongation/12);
  const tithiNames=["Shukla Pratipada","Shukla Dwitiya","Shukla Tritiya","Shukla Chaturthi","Shukla Panchami","Shukla Shashthi","Shukla Saptami","Shukla Ashtami","Shukla Navami","Shukla Dashami","Shukla Ekadashi","Shukla Dwadashi","Shukla Trayodashi","Shukla Chaturdashi","Purnima","Krishna Pratipada","Krishna Dwitiya","Krishna Tritiya","Krishna Chaturthi","Krishna Panchami","Krishna Shashthi","Krishna Saptami","Krishna Ashtami","Krishna Navami","Krishna Dashami","Krishna Ekadashi","Krishna Dwadashi","Krishna Trayodashi","Krishna Chaturdashi","Amavasya"];
  const yogaNames=["Vishkambha","Priti","Ayushman","Saubhagya","Shobhana","Atiganda","Sukarma","Dhriti","Shula","Ganda","Vriddhi","Dhruva","Vyaghata","Harshana","Vajra","Siddhi","Vyatipata","Variyana","Parigha","Shiva","Siddha","Sadhya","Shubha","Shukla","Brahma","Indra","Vaidhriti"];
  const yogaIndex=Math.floor(((sunLongitude+moonLongitude)%360)/(360/27));
  const karanaNames=["Kimstughna","Bava","Balava","Kaulava","Taitila","Gara","Vanija","Vishti"];
  const halfIndex=Math.floor(elongation/6);
  let karana:string;
  if(halfIndex===0) karana=karanaNames[0];
  else if(halfIndex===57) karana="Shakuni";
  else if(halfIndex===58) karana="Chatushpada";
  else if(halfIndex===59) karana="Naga";
  else karana=karanaNames[1+((halfIndex-1)%7)];
  return {tithi:tithiNames[tithiIndex]??null,karana,yoga:yogaNames[yogaIndex]??null,source:"KALP_CALCULATED"};
}

function mangalDoshaFromChart(mars:R, moon:R, kalpLagna:ReturnType<typeof calculateKalpLagna>): {value:string|null; source:string} {
  const signs=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const marsSign=signs.indexOf(String(mars.sign??"")); const moonSign=signs.indexOf(String(moon.sign??""));
  const lagnaSign=Number(kalpLagna.signIndex);
  if(marsSign<0||moonSign<0||!Number.isFinite(lagnaSign)) return {value:null,source:"UNAVAILABLE"};
  const from=(base:number)=>((marsSign-base+12)%12)+1;
  // KALP uses the conventional Janma-Kundli Manglik test from Lagna and Moon.
  // Venus-based variants are not silently mixed into the canonical flag.
  const fromLagna=from(lagnaSign), fromMoon=from(moonSign);
  const dosha=[1,4,7,8,12].includes(fromLagna)||[1,4,7,8,12].includes(fromMoon);
  return {value:dosha?"Present":"Not Present",source:"KALP_CALCULATED"};
}

function adaptOpenKundali(raw:unknown, kalpLagna:ReturnType<typeof calculateKalpLagna>){
 const root=obj(raw); const data=obj(root.data) && Object.keys(obj(root.data)).length ? obj(root.data) : root;
 const planets=arr(data.planets); const moon=planetByName(planets,["Moon","Chandra"]); const sun=planetByName(planets,["Sun","Surya","Ravi"]); const mars=planetByName(planets,["Mars","Mangal","Kuja"]);
 const moonSign=firstValue(moon,["sign","rashi","zodiac"]); const sunSign=firstValue(sun,["sign","rashi","zodiac"]);
 const nak=nakshatraFromMoon(moon); const panchanga=panchangaFromPlanets(sun,moon); const mangal=mangalDoshaFromChart(mars,moon,kalpLagna); const periods=dashaPeriods(data); const dash=currentDasha(periods,data);
 const yogas=arr(data.yogas).length?arr(data.yogas):arr(data.yogaDetails);
 const providerMangal=firstValue(data,["mangalDosha","manglik","manglikDosha","mangal_dosha"]);
 const providerTithi=firstValue(data,["tithi","tithiName"]), providerKarana=firstValue(data,["karana","karanaName"]), providerYoga=firstValue(data,["yoga","yogaName"]);
 return {data,planets,moonSign,sunSign,nakshatra:nak.name,nakshatraPada:nak.pada,nakshatraLord:nak.lord,tithi:providerTithi??panchanga.tithi,karana:providerKarana??panchanga.karana,yoga:providerYoga??panchanga.yoga,mangalDosha:providerMangal??mangal.value,dasha:dash,dashaPeriods:periods,yogaDetails:yogas,nakshatraSource:nak.source,panchangaSource:providerTithi||providerKarana||providerYoga?"PROVIDER":panchanga.source,mangalSource:providerMangal?"PROVIDER":mangal.source};
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST") return json({status:"ERROR",code:"METHOD_NOT_ALLOWED"},405);
 let b:R; try { b=await req.json(); } catch { return json({status:"ERROR",code:"INVALID_JSON"},400); }
 const {datetime,coordinates,birthPlace,timezoneOffsetMinutes=330}=b;
 if(typeof datetime!=="string"||typeof coordinates!=="string") return json({status:"ERROR",code:"INVALID_BIRTH_DETAILS"},400);
 let kalpLagna:ReturnType<typeof calculateKalpLagna>; try { kalpLagna=calculateKalpLagna(datetime,coordinates,Number(timezoneOffsetMinutes)); } catch(error) { return json({status:"ERROR",code:"KALP_CALCULATION_FAILED",detail:error instanceof Error?error.message:"UNKNOWN"},502); }
 const [lat,lon]=coordinates.split(",").map(Number); const [date,timeWithZone]=datetime.split("T"); const time=(timeWithZone??"").slice(0,5);
 const qs=new URLSearchParams({date,time,lat:String(lat),lon:String(lon)}); if(typeof b.name==="string") qs.set("name",b.name);
 try {
   const r=await fetch(`https://openkundali.com/api/v1/chart?${qs.toString()}`,{headers:{Accept:"application/json"}});
   const raw=await r.text(); let providerResponse:unknown; try { providerResponse=raw?JSON.parse(raw):null; } catch { providerResponse={raw:raw.slice(0,2000)}; }
   if(!r.ok) return json({status:"PARTIAL_SUCCESS",provider:"openkundali",sourceStatus:"PARTIAL",providerStage:"CHART",providerStatus:r.status,providerResponse,kalpLagna,requested:{datetime,coordinates,birthPlace,timezoneOffsetMinutes:Number(timezoneOffsetMinutes)}});
   const a=adaptOpenKundali(providerResponse,kalpLagna);
   const evidence={lagna:"CALCULATED",moonSign:a.moonSign?"PROVIDER":"UNAVAILABLE",sunSign:a.sunSign?"PROVIDER":"UNAVAILABLE",nakshatra:a.nakshatra?(a.nakshatraSource==="PROVIDER"?"PROVIDER":"CALCULATED"):"UNAVAILABLE",nakshatraPada:a.nakshatraPada?(a.nakshatraSource==="PROVIDER"?"PROVIDER":"CALCULATED"):"UNAVAILABLE",nakshatraLord:a.nakshatraLord?(a.nakshatraSource==="PROVIDER"?"PROVIDER":"CALCULATED"):"UNAVAILABLE",tithi:a.tithi?(a.panchangaSource==="PROVIDER"?"PROVIDER":"CALCULATED"):"UNAVAILABLE",karana:a.karana?(a.panchangaSource==="PROVIDER"?"PROVIDER":"CALCULATED"):"UNAVAILABLE",yoga:a.yoga?(a.panchangaSource==="PROVIDER"?"PROVIDER":"CALCULATED"):"UNAVAILABLE",dasha:a.dasha.mahadasha?"PROVIDER":"UNAVAILABLE",dashaPeriods:a.dashaPeriods.length?"PROVIDER":"UNAVAILABLE",mangalDosha:a.mangalDosha?(a.mangalSource==="PROVIDER"?"PROVIDER":"CALCULATED"):"UNAVAILABLE",yogaDetails:a.yogaDetails.length?"PROVIDER":"UNAVAILABLE"};
   const moduleStatus={chart:r.ok?"PROVIDER":`UNAVAILABLE_${r.status}`,lagna:"KALP_CALCULATED",panchanga:a.panchangaSource,mangalDosha:a.mangalSource}; const hasProviderEvidence=Object.values(evidence).some(v=>v==="PROVIDER");
   const canonical={birthPlace:typeof birthPlace==="string"?birthPlace:null,lagna:kalpLagna,providerLagna:scalar(obj(a.data).ascSign??obj(a.data).ascendant),moonSign:a.moonSign,sunSign:a.sunSign,nakshatra:a.nakshatra,nakshatraPada:a.nakshatraPada,nakshatraLord:a.nakshatraLord,tithi:a.tithi,karana:a.karana,yoga:a.yoga,mangalDosha:a.mangalDosha,dasha:a.dasha.mahadasha?{name:a.dasha.mahadasha,mahadasha:a.dasha.mahadasha,antardasha:a.dasha.antardasha,pratyantardasha:a.dasha.pratyantardasha}:null,dashaPeriods:a.dashaPeriods,yogaDetails:a.yogaDetails,yoga_details:a.yogaDetails,nakshatra_details:a.nakshatra?{nakshatra:{name:a.nakshatra},pada:a.nakshatraPada,lord:{name:a.nakshatraLord}}:undefined,provider:"openkundali",sourceStatus:hasProviderEvidence?"PROVIDER":"PARTIAL",resultType:"chart",evidence,moduleStatus};
   return json({status:hasProviderEvidence?"SUCCESS":"PARTIAL_SUCCESS",provider:"openkundali",calculationSystem:"vedic",resultType:"chart",sourceStatus:canonical.sourceStatus,requested:{datetime,coordinates,birthPlace:typeof birthPlace==="string"?birthPlace:null,timezoneOffsetMinutes:Number(timezoneOffsetMinutes)},data:{...obj(a.data),...canonical},adapter:{name:"openkundali-specific + kalp-calculation",version:"1.3",model:"KALP-KUNDLI-CANONICAL-v1",modules:moduleStatus,mappedFields:evidence,note:"OpenKundali is the active provider. Lagna is independently calculated by KALP. Panchanga and Manglik fields are calculated from OpenKundali-supplied sidereal chart positions when the provider chart payload does not expose those fields; provider-supplied values take precedence when present."},supplementary:{openKundali:providerResponse}});
 } catch(error) { return json({status:"PARTIAL_SUCCESS",provider:"openkundali",sourceStatus:"PARTIAL",providerStage:"EDGE_RUNTIME",error:error instanceof Error?error.message:"PROVIDER_UNAVAILABLE",kalpLagna,requested:{datetime,coordinates,birthPlace,timezoneOffsetMinutes:Number(timezoneOffsetMinutes)}}); }
});
