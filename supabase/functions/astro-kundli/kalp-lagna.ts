export type KalpLagna = {
  value: string;
  signIndex: number;
  longitude: number;
  degree: number;
  degreeText: string;
  source: "KALP_CALCULATED";
  calculationSystem: "SIDEREAL_LAHIRI";
  evidenceStatus: "CALCULATED";
  ayanamsa: number;
  julianDay: number;
};

const SIGNS = ["मेष","वृषभ","मिथुन","कर्क","सिंह","कन्या","तुला","वृश्चिक","धनु","मकर","कुंभ","मीन"];
function julianDayUtc(year:number,month:number,day:number,hour:number,minute:number,second=0):number{
  const y=month<=2?year-1:year; const m=month<=2?month+12:month;
  const A=Math.floor(y/100); const B=2-A+Math.floor(A/4);
  return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+day+B-1524.5+(hour+minute/60+second/3600)/24;
}
function parseLocalDateTime(value:string,offsetMinutes:number){
  const m=value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(?:([+-])(\d{2}):(\d{2}))?$/);
  if(!m) throw new Error("Invalid datetime; expected ISO local datetime");
  const year=+m[1],month=+m[2],day=+m[3],hour=+m[4],minute=+m[5],second=+(m[6]??0);
  const explicit=m[8]?((m[8]==="-"?-1:1)*(+m[9]*60+(+m[10]||0))):offsetMinutes;
  const utcMs=Date.UTC(year,month-1,day,hour,minute,second)-(explicit*60000);
  const d=new Date(utcMs);
  return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),hour:d.getUTCHours(),minute:d.getUTCMinutes(),second:d.getUTCSeconds(),jd:julianDayUtc(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate(),d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds())};
}
function norm360(x:number){return ((x%360)+360)%360;}
function gmstDegrees(jd:number){const T=(jd-2451545)/36525; return norm360(280.46061837+360.98564736629*(jd-2451545)+0.000387933*T*T-T*T*T/38710000);}
function obliquityDegrees(jd:number){const T=(jd-2451545)/36525; return 23.439291111-0.0130041667*T-1.63889e-7*T*T+5.03611e-7*T*T*T;}
function lahiriAyanamsa(jd:number){return 23.85709+(50.290966/3600)*((jd-2451545)/365.2425);}
export function calculateKalpLagna(datetime:string,coordinates:string,timezoneOffsetMinutes=330):KalpLagna{
  const [lat,lon]=coordinates.split(",").map(Number); if(!Number.isFinite(lat)||!Number.isFinite(lon)) throw new Error("Invalid coordinates");
  const p=parseLocalDateTime(datetime,timezoneOffsetMinutes); const ramc=norm360(gmstDegrees(p.jd)+lon); const eps=obliquityDegrees(p.jd); const phi=lat*Math.PI/180, r=ramc*Math.PI/180, e=eps*Math.PI/180;
  const tropical=norm360(Math.atan2(Math.cos(r),-(Math.sin(r)*Math.cos(e)+Math.tan(phi)*Math.sin(e)))*180/Math.PI);
  const sidereal=norm360(tropical-lahiriAyanamsa(p.jd)); const signIndex=Math.floor(sidereal/30); const degree=sidereal-signIndex*30;
  const d=Math.floor(degree), minutes=Math.round((degree-d)*60); const degreeText=`${minutes===60?d+1:d}° ${minutes===60?0:minutes}′`;
  return {value:SIGNS[signIndex],signIndex,longitude:sidereal,degree,degreeText,source:"KALP_CALCULATED",calculationSystem:"SIDEREAL_LAHIRI",evidenceStatus:"CALCULATED",ayanamsa:lahiriAyanamsa(p.jd),julianDay:p.jd};
}
