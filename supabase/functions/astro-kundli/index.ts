import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { calculateKalpLagna } from "./kalp-lagna.ts";

type R = Record<string, unknown>;
const corsHeaders = {"Access-Control-Allow-Origin":"https://talk2genaihost.github.io","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { ...corsHeaders, "Content-Type":"application/json" } });
const obj = (x: unknown): R => x && typeof x === "object" && !Array.isArray(x) ? x as R : {};
const pp = (x: unknown): R => obj(obj(x).data);
const first = (x: unknown) => Array.isArray(x) && x.length ? x[0] : x;
const scalar = (x: unknown): string | number | null => { if (typeof x === "string" || typeof x === "number") return String(x).trim() || null; const r=obj(x); for (const k of ["name","vedicName","vedic_name","label","value","sign","rashi","title","zodiac"]) { const v=r[k]; if (typeof v === "string" || typeof v === "number") { const s=String(v).trim(); if (s) return s; } } return null; };
const providerStatus = (r: {ok:boolean,status:number}) => r.ok ? "PROVIDER" : `UNAVAILABLE_${r.status || "NETWORK"}`;
async function providerFetch(url:string, token:string) { try { const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`}}); const raw=await r.text(); let data:unknown=null; try { data=raw?JSON.parse(raw):null; } catch { data={raw:raw.slice(0,1000)}; } return {ok:r.ok,status:r.status,data}; } catch (error) { return {ok:false,status:0,data:{error:error instanceof Error?error.message:"NETWORK_ERROR"}}; } }
function adaptBirth(raw:unknown){const d=pp(raw); const nak=obj(d.nakshatra); return {moonSign:scalar(d.chandraRasi??d.chandra_rasi??d.moonSign??d.moon_sign),sunSign:scalar(d.sooryaRasi??d.soorya_rasi??d.sunSign??d.sun_sign),zodiac:scalar(d.zodiac),nakshatra:scalar(d.nakshatra),nakshatraPada:scalar(nak.pada??nak.nakshatraPada??d.nakshatra_pada??d.pada),nakshatraLord:scalar(nak.lord??nak.planet??d.nakshatra_lord),raw:d};}
function adaptPanchang(raw:unknown){const d=pp(raw);return {tithi:scalar(first(d.tithi)),karana:scalar(first(d.karana)),yoga:scalar(first(d.yoga)),raw:d};}
function adaptDasha(raw:unknown){const d=pp(raw);const periods=Array.isArray(d.dashaPeriods)?d.dashaPeriods:Array.isArray(d.dasha_periods)?d.dasha_periods:Array.isArray(d.periods)?d.periods:[];return {current:scalar(periods[0]??d.current??d.currentDasha??d.current_dasha),periods,raw:d};}
function adaptMangal(raw:unknown){const d=pp(raw); return {mangalDosha:scalar(d.mangalDosha??d.mangal_dosha??d.result??d.status??d.name),raw:d};}
function adaptYoga(raw:unknown){const d=pp(raw); const yogas=Array.isArray(d.yogas)?d.yogas:Array.isArray(d.yogaDetails)?d.yogaDetails:Array.isArray(d.yoga_details)?d.yoga_details:[]; return {yogas,raw:d};}
function adaptKundli(raw:unknown){const d=pp(raw);return {lagna:scalar(d.lagna??d.ascendant??d.rising_sign),raw:d};}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST") return json({status:"ERROR",code:"METHOD_NOT_ALLOWED"},405);
 const id=Deno.env.get("PROKERALA_CLIENT_ID"),secret=Deno.env.get("PROKERALA_CLIENT_SECRET");
 if(!id||!secret) return json({status:"ERROR",code:"PROVIDER_CREDENTIALS_MISSING"},500);
 let b:R; try { b=await req.json(); } catch { return json({status:"ERROR",code:"INVALID_JSON"},400); }
 const {datetime,coordinates,ayanamsa=1,birthPlace,timezoneOffsetMinutes=330}=b;
 if(typeof datetime!=="string"||typeof coordinates!=="string") return json({status:"ERROR",code:"INVALID_BIRTH_DETAILS"},400);
 let kalpLagna:ReturnType<typeof calculateKalpLagna>; try { kalpLagna=calculateKalpLagna(datetime,coordinates,Number(timezoneOffsetMinutes)); } catch(error) { return json({status:"ERROR",code:"KALP_CALCULATION_FAILED",detail:error instanceof Error?error.message:"UNKNOWN"},502); }
 try {
  const tr=await fetch("https://api.prokerala.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"client_credentials",client_id:id,client_secret:secret})});
  const tokenRaw=await tr.text(); let td:R={}; try { td=tokenRaw?obj(JSON.parse(tokenRaw)):{}; } catch { td={raw:tokenRaw.slice(0,1000)}; }
  if(!tr.ok||typeof td.access_token!=="string") return json({status:"PARTIAL_SUCCESS",provider:"prokerala",sourceStatus:"PARTIAL",providerStage:"AUTH",providerStatus:tr.status,providerResponse:td,kalpLagna,requested:{datetime,coordinates,ayanamsa,birthPlace,timezoneOffsetMinutes:Number(timezoneOffsetMinutes)}});
  const p=new URLSearchParams({ayanamsa:String(ayanamsa),coordinates,datetime}),token=td.access_token as string;
  // Module isolation: a failure in one Prokerala product must never prevent the others from being queried.
  const [kAdvanced,kBasic,birth,panchang,dasha,mangal,yoga]=await Promise.all([
    providerFetch(`https://api.prokerala.com/v2/astrology/kundli?${p.toString()}&result_type=advanced&la=hi`,token),
    providerFetch(`https://api.prokerala.com/v2/astrology/kundli?${p.toString()}&result_type=basic&la=hi`,token),
    providerFetch(`https://api.prokerala.com/v2/astrology/birth-details?${p.toString()}&result_type=basic&la=hi`,token),
    providerFetch(`https://api.prokerala.com/v2/astrology/panchang?${p.toString()}&result_type=basic&la=hi`,token),
    providerFetch(`https://api.prokerala.com/v2/astrology/dasha-periods?${p.toString()}&la=hi`,token),
    providerFetch(`https://api.prokerala.com/v2/astrology/mangal-dosha?${p.toString()}&result_type=basic&la=hi`,token),
    providerFetch(`https://api.prokerala.com/v2/astrology/yoga-details?${p.toString()}&la=hi`,token)
  ]);
  const k=adaptKundli(kAdvanced.ok?kAdvanced.data:kBasic.ok?kBasic.data:null);
  const birthA=adaptBirth(birth.data),pan=adaptPanchang(panchang.data),dash=adaptDasha(dasha.data),mang=adaptMangal(mangal.data),yog=adaptYoga(yoga.data);
  const providerLagna=k.lagna;
  const tithi=pan.tithi;
  const karana=pan.karana;
  const yogaName=pan.yoga;
  const dashaName=dash.current;
  const moduleStatus={
    kundliAdvanced:providerStatus(kAdvanced),
    kundliBasic:providerStatus(kBasic),
    birthDetails:providerStatus(birth),
    panchang:providerStatus(panchang),
    dashaPeriods:providerStatus(dasha),
    mangalDosha:providerStatus(mangal),
    yogaDetails:providerStatus(yoga),
    lagna:"KALP_CALCULATED"
  };
  const evidence={
    lagna:"CALCULATED",
    moonSign:birthA.moonSign?"PROVIDER":"UNAVAILABLE",
    sunSign:birthA.sunSign?"PROVIDER":"UNAVAILABLE",
    nakshatra:birthA.nakshatra?"PROVIDER":"UNAVAILABLE",
    nakshatraPada:birthA.nakshatraPada?"PROVIDER":"UNAVAILABLE",
    nakshatraLord:birthA.nakshatraLord?"PROVIDER":"UNAVAILABLE",
    tithi:tithi?"PROVIDER":"UNAVAILABLE",
    karana:karana?"PROVIDER":"UNAVAILABLE",
    yoga:yogaName?"PROVIDER":"UNAVAILABLE",
    dasha:dashaName?"PROVIDER":"UNAVAILABLE",
    dashaPeriods:dash.periods.length?"PROVIDER":"UNAVAILABLE",
    mangalDosha:mang.mangalDosha?"PROVIDER":"UNAVAILABLE",
    yogaDetails:yog.yogas.length?"PROVIDER":"UNAVAILABLE"
  };
  const hasProviderEvidence=Object.values(evidence).some(v=>v==="PROVIDER");
  const canonical={
    birthPlace:typeof birthPlace==="string"?birthPlace:null,
    lagna:kalpLagna,
    providerLagna,
    moonSign:birthA.moonSign,
    sunSign:birthA.sunSign,
    nakshatra:birthA.nakshatra,
    nakshatraPada:birthA.nakshatraPada,
    nakshatraLord:birthA.nakshatraLord,
    tithi,karana,yoga:yogaName,
    mangalDosha:mang.mangalDosha,
    dasha:dashaName?{mahadasha:dashaName,antardasha:null,pratyantardasha:null}:null,
    dashaPeriods:dash.periods,
    yogaDetails:yog.yogas,
    provider:"prokerala",
    sourceStatus:hasProviderEvidence?"PROVIDER":"PARTIAL",
    resultType:"module-isolated",
    evidence,
    moduleStatus
  };
  return json({status:hasProviderEvidence?"SUCCESS":"PARTIAL_SUCCESS",provider:"prokerala",calculationSystem:"vedic",resultType:"module-isolated",sourceStatus:canonical.sourceStatus,requested:{datetime,coordinates,ayanamsa,birthPlace:typeof birthPlace==="string"?birthPlace:null,timezoneOffsetMinutes:Number(timezoneOffsetMinutes)},data:{...obj(kAdvanced.ok?kAdvanced.data:kBasic.data),...canonical},adapter:{name:"prokerala-specific + kalp-calculation",version:"1.4",model:"KALP-KUNDLI-CANONICAL-v1",modules:moduleStatus,mappedFields:evidence,note:"Kundli, Birth Details, Panchang, Dasha, Mangal Dosha and Yoga Details are isolated at module level. Lagna is calculated by KALP from the supplied birth instant and coordinates; provider facts remain separately attributed to Prokerala."},supplementary:{kundliAdvanced:pp(kAdvanced.data),kundliBasic:pp(kBasic.data),birthDetails:birthA.raw,panchang:pan.raw,dashaPeriods:dash.raw,mangalDosha:mang.raw,yogaDetails:yog.raw}});
 } catch(error) { return json({status:"PARTIAL_SUCCESS",provider:"prokerala",sourceStatus:"PARTIAL",providerStage:"EDGE_RUNTIME",error:error instanceof Error?error.message:"PROVIDER_UNAVAILABLE",kalpLagna,requested:{datetime,coordinates,ayanamsa,birthPlace,timezoneOffsetMinutes:Number(timezoneOffsetMinutes)}}); }
});
