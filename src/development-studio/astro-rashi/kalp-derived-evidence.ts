export type DerivedEvidence = {
  planetHouseMappings: Array<Record<string, unknown>>;
  aspects: Array<Record<string, unknown>>;
  lordships: Array<Record<string, unknown>>;
  derivedYogas: Array<Record<string, unknown>>;
  rules: string[];
};

type Obj = Record<string, unknown>;

const SIGN_INDEX: Record<string, number> = {
  aries:0,mesha:0,
  taurus:1,vrishabha:1,
  gemini:2,mithuna:2,
  cancer:3,karka:3,
  leo:4,simha:4,
  virgo:5,kanya:5,
  libra:6,tula:6,
  scorpio:7,vrishchika:7,
  sagittarius:8,dhanu:8,
  capricorn:9,makara:9,
  aquarius:10,kumbha:10,
  pisces:11,meena:11,
};

const LORD: Record<string,string> = {
  aries:"Mars",taurus:"Venus",gemini:"Mercury",cancer:"Moon",leo:"Sun",
  virgo:"Mercury",libra:"Venus",scorpio:"Mars",sagittarius:"Jupiter",
  capricorn:"Saturn",aquarius:"Saturn",pisces:"Jupiter",
};

const PLANET_KEYS = ["Sun","Moon","Mars","Mercury","Jupiter","Venus","Saturn","Rahu","Ketu"];

function obj(value:unknown):Obj{return value&&typeof value==="object"&&!Array.isArray(value)?value as Obj:{}}
function norm(value:unknown):string{return String(value??"").trim().toLowerCase().replace(/[\s._-]/g,"")}
function planetName(value:unknown):string{
  const n=norm(value);
  const map:Record<string,string>={sun:"Sun",su:"Sun",surya:"Sun",moon:"Moon",mo:"Moon",chandra:"Moon",mars:"Mars",ma:"Mars",mangal:"Mars",mercury:"Mercury",me:"Mercury",budha:"Mercury",jupiter:"Jupiter",ju:"Jupiter",guru:"Jupiter",venus:"Venus",ve:"Venus",shukra:"Venus",saturn:"Saturn",sa:"Saturn",shani:"Saturn",rahu:"Rahu",ra:"Rahu",ketu:"Ketu",ke:"Ketu"};
  return map[n]??String(value??"");
}
function signName(value:unknown):string{return String(value??"").trim()}
function signIndex(value:unknown):number|undefined{
  const n=norm(value);
  if(n in SIGN_INDEX)return SIGN_INDEX[n];
  const m=n.match(/^(\d{1,2})$/);
  if(m){const i=Number(m[1])-1;return i>=0&&i<12?i:undefined}
  return undefined;
}
function longitude(planet:Obj):number|undefined{
  const si=signIndex(planet.sign??planet.rashi??planet.zodiac);
  const degree=Number(planet.degree);
  if(si===undefined||!Number.isFinite(degree)||degree<0||degree>=30)return undefined;
  return si*30+degree;
}
function rashiHouse(lagnaSign:unknown,planetSign:unknown):number|undefined{
  const l=signIndex(lagnaSign),p=signIndex(planetSign);
  if(l===undefined||p===undefined)return undefined;
  return ((p-l+12)%12)+1;
}
function kpHouse(longitudeValue:number,cusps:Array<{house:number;longitude:number}>):number|undefined{
  if(cusps.length<2)return undefined;
  const sorted=[...cusps].sort((a,b)=>a.house-b.house);
  for(const cusp of sorted){
    const next=sorted.find((x)=>x.house===cusp.house%12+1)??sorted[0];
    const start=((cusp.longitude%360)+360)%360;
    const end=((next.longitude%360)+360)%360;
    const inside=start<end?longitudeValue>=start&&longitudeValue<end:longitudeValue>=start||longitudeValue<end;
    if(inside)return cusp.house;
  }
  return undefined;
}
function asPlanets(data:Obj):Array<Obj>{
  const raw=Array.isArray(data.planets)?data.planets:[];
  return raw.map((x)=>obj(x)).map((p)=>({...p,name:planetName(p.name??p.planet??p.abbr)})).filter((p)=>PLANET_KEYS.includes(String(p.name)));
}
function asCusps(data:Obj):Array<{house:number;longitude:number}>{
  const raw=Array.isArray(data.kpHouses)?data.kpHouses:[];
  return raw.map((x)=>obj(x)).map((p)=>{
    const house=Number(p.house??p.number??p.id);
    const longitudeValue=Number(p.cuspDegree??p.cusp_degree??p.cuspLongitude??p.cusp_longitude??p.degree);
    return {house,longitude:longitudeValue};
  }).filter((x)=>Number.isInteger(x.house)&&x.house>=1&&x.house<=12&&Number.isFinite(x.longitude));
}
function aspectNumbers(name:string):number[]{
  if(name==="Mars")return[4,7,8];
  if(name==="Jupiter")return[5,7,9];
  if(name==="Saturn")return[3,7,10];
  return[7];
}
function targetHouse(sourceHouse:number,distance:number):number{return ((sourceHouse-1+distance-1)%12)+1}
function sameOrOpposite(a:number,b:number):boolean{return a===b||((a-b+12)%12===6)}
function houseLordMap(lagnaSign:unknown):Array<Record<string,unknown>>{
  const l=signIndex(lagnaSign);
  if(l===undefined)return[];
  return Array.from({length:12},(_,i)=>{
    const sign=(l+i)%12;
    const signLabel=Object.keys(SIGN_INDEX).find((k)=>SIGN_INDEX[k]===sign&&k[0]===k[0])??String(sign);
    const lord=LORD[Object.keys(LORD).find((k)=>SIGN_INDEX[k]===sign)??""]??"";
    return {house:i+1,signIndex:sign,lord,provenance:"KALP · Calculated",rule:"D1 whole-sign house lordship from Lagna"};
  });
}
function lordships(lagnaSign:unknown):Array<Record<string,unknown>>{
  const l=signIndex(lagnaSign);
  if(l===undefined)return[];
  const out=[];
  for(let house=1;house<=12;house++){
    const sign=(l+house-1)%12;
    const lord=Object.entries(SIGN_INDEX).find(([key,index])=>index===sign&&LORD[key]!==undefined)?.[0];
    const planet=lord?LORD[lord]:"";
    out.push({house,sign:lord??"",lord:planet,provenance:"KALP · Calculated",rule:"Classical sign lordship; D1 whole-sign framework"});
  }
  return out;
}
function derivedYogas(planets:Obj[],lagnaSign:unknown,aspects:Array<Record<string,unknown>>,lords:Array<Record<string,unknown>>,rashiHouseByPlanet:Map<string,number>):Array<Record<string,unknown>>{
  const byName=new Map(planets.map((p)=>[String(p.name),p]));
  const out:Array<Record<string,unknown>>=[];
  const sun=byName.get("Sun"),mercury=byName.get("Mercury"),moon=byName.get("Moon"),jupiter=byName.get("Jupiter");
  if(sun&&mercury&&signIndex(sun.sign)===signIndex(mercury.sign)){
    out.push({name:"Budhaditya Yoga",status:"PRESENT",basis:"Sun and Mercury occupy the same sign",participants:["Sun","Mercury"],provenance:"KALP · Calculated",caution:mercury.combust===true?"Mercury is recorded combust; formation and strength are separate questions.":undefined});
  }
  if(moon&&jupiter){
    const mh=signIndex(moon.sign),jh=signIndex(jupiter.sign);
    if(mh!==undefined&&jh!==undefined&&[1,4,7,10].includes(((jh-mh+12)%12)+1)){
      out.push({name:"Gajakesari Yoga",status:"PRESENT",basis:"Jupiter is in a kendra (1st/4th/7th/10th) from Moon by sign",participants:["Moon","Jupiter"],provenance:"KALP · Calculated"});
    }
  }
  const kendra=new Set([1,4,7,10]),trikona=new Set([1,5,9]);
  const houseLords=new Map<number,string>(lords.map((x)=>[Number(x.house),String(x.lord)]));
  for(const [kHouse,kLord] of houseLords){
    if(!kendra.has(kHouse))continue;
    for(const [tHouse,tLord] of houseLords){
      if(!trikona.has(tHouse)||tHouse===kHouse||kLord===tLord)continue;
      const kh=rashiHouseByPlanet.get(kLord),th=rashiHouseByPlanet.get(tLord);
      if(kh===undefined||th===undefined)continue;
      const same=kh===th;
      const mutual=aspects.some((a)=>a.from===kLord&&a.toHouse===th&&a.full===true)&&aspects.some((a)=>a.from===tLord&&a.toHouse===kh&&a.full===true);
      const exchange=signIndex(byName.get(kLord)?.sign)===signIndex(lordSignForHouse(tHouse,lagnaSign))&&signIndex(byName.get(tLord)?.sign)===signIndex(lordSignForHouse(kHouse,lagnaSign));
      if(same||mutual||exchange){
        out.push({name:"Raja Yoga",status:"PRESENT",basis:same?"Kendra and trikona lords share a house":mutual?"Kendra and trikona lords mutually aspect each other":"Kendra and trikona lords exchange signs",participants:[kLord,tLord],houses:[kHouse,tHouse],provenance:"KALP · Calculated"});
      }
    }
  }
  const unique=new Map<string,Record<string,unknown>>();
  for(const y of out)unique.set(JSON.stringify([y.name,y.participants,y.houses]),y);
  return [...unique.values()];
}
function lordSignForHouse(house:number,lagnaSign:unknown):string{
  const l=signIndex(lagnaSign);if(l===undefined)return"";
  const sign=(l+house-1)%12;
  const key=Object.keys(SIGN_INDEX).find((k)=>SIGN_INDEX[k]===sign&&LORD[k]!==undefined);
  return key??"";
}

export function deriveCanonicalEvidence(data:Obj):DerivedEvidence{
  const planets=asPlanets(data);
  const cusps=asCusps(data);
  const lagna=data.lagna;
  const mappings:Array<Record<string,unknown>>=[];
  const rashiHouseByPlanet=new Map<string,number>();
  for(const p of planets){
    const rh=rashiHouse(lagna,p.sign);
    const lon=longitude(p);
    const kh=lon===undefined?undefined:kpHouse(lon,cusps);
    if(rh!==undefined)rashiHouseByPlanet.set(String(p.name),rh);
    mappings.push({planet:p.name,sign:signName(p.sign),degree:p.degree,eclipticLongitude:lon,rashiHouse:rh,kpHouse:kh,provenance:"KALP · Calculated",rule:"D1 whole-sign house plus explicit KP cusp-boundary calculation",basis:kh===undefined?"Rashi house only":"Rashi house and supplied KP cusp boundaries"});
  }
  const aspects:Array<Record<string,unknown>>=[];
  for(const p of planets){
    const from=rashiHouseByPlanet.get(String(p.name));if(from===undefined)continue;
    for(const distance of aspectNumbers(String(p.name))){
      const toHouse=targetHouse(from,distance);
      aspects.push({from:p.name,fromHouse:from,aspectNumber:distance,toHouse,full:true,ruleSet:"PARASHARI_GRAHA_DRISHTI_V1",provenance:"KALP · Calculated"});
    }
  }
  const lords=lordships(lagna);
  const yogas=derivedYogas(planets,lagna,aspects,lords,rashiHouseByPlanet);
  return{planetHouseMappings:mappings,aspects,lordships:lords,derivedYogas:yogas,rules:[
    "Planet-to-house mapping is calculated from supplied planet sign/degree and Lagna; D1 rashiHouse uses whole-sign counting.",
    "KP house mapping uses the supplied KP cusp Degree values as circular cusp boundaries; cusp Longitude is retained as provider data but is not used when inconsistent with cusp Degree/sign.",
    "Parashari Graha Drishti v1: all listed grahas receive the 7th aspect; Mars also 4th/8th, Jupiter 5th/9th, Saturn 3rd/10th. Rahu/Ketu use only the universal 7th aspect in this version because node special aspects vary by tradition.",
    "House lordship is calculated from the Lagna sign and the classical sign-ruler table.",
    "Derived yogas are calculated only from explicit rule contracts; their presence does not by itself imply an outcome or strength.",
  ]};
}
