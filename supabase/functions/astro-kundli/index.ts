import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { calculateKalpLagna } from "./kalp-lagna.ts";

type R = Record<string, unknown>;
const corsHeaders = {"Access-Control-Allow-Origin":"https://talk2genaihost.github.io","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json = (x: unknown, status = 200) => new Response(JSON.stringify(x), { status, headers: { ...corsHeaders, "Content-Type":"application/json" } });
const obj = (x: unknown): R => x && typeof x === "object" && !Array.isArray(x) ? x as R : {};
const pp = (x: unknown): R => obj(obj(x).data);
const name = (x: unknown): string | null => { if (typeof x === "string" || typeof x === "number") return String(x).trim() || null; const r=obj(x); for (const k of ["name","vedicName","vedic_name","label","value","sign","rashi","title"]) { const v=r[k]; if (typeof v === "string" || typeof v === "number") { const s=String(v).trim(); if (s) return s; } } return null; };
const first = (x: unknown) => Array.isArray(x) && x.length ? x[0] : x;
const providerStatus = (r: {ok:boolean,status:number}) => r.ok ? "PROVIDER" : `UNAVAILABLE_${r.status || "NETWORK"}`;
async function providerFetch(url:string, token:string) { try { const r=await fetch(url,{headers:{Authorization:`Bearer ${token}`}}); const raw=await r.text(); let data:unknown=null; try { data=raw?JSON.parse(raw):null; } catch { data={raw:raw.slice(0,1000)}; } return {ok:r.ok,status:r.status,data}; } catch (error) { return {ok:false,status:0,data:{error:error instanceof Error?error.message:"NETWORK_ERROR"}}; } }
function adaptPanchang(raw:unknown){const d=pp(raw);return {tithi:name(first(d.tithi)),karana:name(first(d.karana)),yoga:name(first(d.yoga)),raw:d};}
function adaptDasha(raw:unknown){const d=pp(raw);const periods=Array.isArray(d.dashaPeriods)?d.dashaPeriods:Array.isArray(d.dasha_periods)?d.dasha_periods:Array.isArray(d.periods)?d.periods:[];return {current:name(periods[0]??d.current??d.currentDasha??d.current_dasha),periods,raw:d};}
function adaptKundli(raw:unknown){const d=pp(raw);return {lagna:name(d.lagna??d.ascendant??d.rising_sign),tithi:name(first(d.tithi)),karana:name(first(d.karana)),yoga:name(first(d.yoga)),dasha:name(d.dasha??d.dasha_period??d.current_dasha),raw:d};}
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
  const kraw=await providerFetch(`https://api.prokerala.com/v2/astrology/kundli?${p.toString()}&result_type=advanced&la=hi`,token);
  if(!kraw.ok) return json({status:"PARTIAL_SUCCESS",provider:"prokerala",sourceStatus:"PARTIAL",providerStage:"KUNDLI",providerStatus:kraw.status,providerResponse:kraw.data,kalpLagna,requested:{datetime,coordinates,ayanamsa,birthPlace,timezoneOffsetMinutes:Number(timezoneOffsetMinutes)}});
  const [bd,panraw,draw]=await Promise.all([providerFetch(`https://api.prokerala.com/v2/astrology/birth-details?${p.toString()}&result_type=advanced&la=hi`,token),providerFetch(`https://api.prokerala.com/v2/astrology/panchang?${p.toString()}&result_type=advanced&la=hi`,token),providerFetch(`https://api.prokerala.com/v2/astrology/dasha-periods?${p.toString()}&la=hi`,token)]);
  const primary=pp(kraw.data),k=adaptKundli(kraw.data),pan=adaptPanchang(panraw.data),dash=adaptDasha(draw.data);
  const providerLagna=k.lagna,tithi=pan.tithi??k.tithi,karana=pan.karana??k.karana,yoga=pan.yoga??k.yoga,dashaName=dash.current??k.dasha;
  const evidence={lagna:"CALCULATED",tithi:tithi?"PROVIDER":"UNAVAILABLE",karana:karana?"PROVIDER":"UNAVAILABLE",yoga:yoga?"PROVIDER":"UNAVAILABLE",dasha:dashaName?"PROVIDER":"UNAVAILABLE",dashaPeriods:dash.periods.length?"PROVIDER":"UNAVAILABLE"};
  const canonical={birthPlace:typeof birthPlace==="string"?birthPlace:null,lagna:kalpLagna,providerLagna,tithi,karana,yoga,dasha:dashaName?{mahadasha:dashaName,antardasha:null,pratyantardasha:null}:null,dashaPeriods:dash.periods,provider:"prokerala",sourceStatus:"PROVIDER",resultType:"advanced",evidence};
  return json({status:"SUCCESS",provider:"prokerala",calculationSystem:"vedic",resultType:"advanced",sourceStatus:"PROVIDER",requested:{datetime,coordinates,ayanamsa,birthPlace:typeof birthPlace==="string"?birthPlace:null,timezoneOffsetMinutes:Number(timezoneOffsetMinutes)},data:{...primary,...canonical},adapter:{name:"prokerala-specific + kalp-calculation",version:"1.3",model:"KALP-KUNDLI-CANONICAL-v1",modules:{kundli:"PROVIDER",birthDetails:providerStatus(bd),panchang:providerStatus(panraw),dashaPeriods:providerStatus(draw),lagna:"KALP_CALCULATED"},mappedFields:evidence,note:"Lagna is calculated by KALP from the supplied birth instant and coordinates; provider facts remain separately attributed to Prokerala."},supplementary:{birthDetails:pp(bd.data),panchang:pan.raw,dashaPeriods:dash.raw}});
 } catch(error) { return json({status:"PARTIAL_SUCCESS",provider:"prokerala",sourceStatus:"PARTIAL",providerStage:"EDGE_RUNTIME",error:error instanceof Error?error.message:"PROVIDER_UNAVAILABLE",kalpLagna,requested:{datetime,coordinates,ayanamsa,birthPlace,timezoneOffsetMinutes:Number(timezoneOffsetMinutes)}}); }
});
