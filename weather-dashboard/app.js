const CITIES=[
  {name:"Delhi",country:"India",latitude:28.6139,longitude:77.2090},
  {name:"London",country:"United Kingdom",latitude:51.5074,longitude:-0.1278},
  {name:"New York",country:"United States",latitude:40.7128,longitude:-74.0060},
  {name:"Tokyo",country:"Japan",latitude:35.6762,longitude:139.6503},
  {name:"Cairo",country:"Egypt",latitude:30.0444,longitude:31.2357},
  {name:"Sydney",country:"Australia",latitude:-33.8688,longitude:151.2093}
];

const FORECAST_URL="https://api.open-meteo.com/v1/forecast";
const CACHE_KEY="kalp-weather-flash-v2";
const dashboard=document.getElementById("dashboard");
const status=document.getElementById("status");
const refresh=document.getElementById("refresh");
const state=new Map();

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function getJson(url,attempt=0){
  const response=await fetch(url,{cache:"no-store"});
  if(response.ok)return response.json();
  if(response.status===429&&attempt<3){
    const retryAfter=Number(response.headers.get("Retry-After"));
    const delay=Number.isFinite(retryAfter)&&retryAfter>0
      ?Math.min(retryAfter*1000,15000)
      :Math.min(1000*(2**attempt),8000);
    await sleep(delay);
    return getJson(url,attempt+1);
  }
  throw new Error(`HTTP ${response.status}`);
}

function cacheRead(){
  try{
    const raw=localStorage.getItem(CACHE_KEY);
    if(!raw)return null;
    const parsed=JSON.parse(raw);
    return parsed?.cities?parsed:null;
  }catch{return null}
}

function cacheWrite(cities){
  try{
    localStorage.setItem(CACHE_KEY,JSON.stringify({savedAt:Date.now(),cities}));
  }catch{}
}

function localClock(tz){
  return new Intl.DateTimeFormat(undefined,{
    timeZone:tz,hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false
  }).format(new Date());
}

function render(){
  dashboard.innerHTML="";
  for(const city of CITIES){
    const s=state.get(city.name);
    if(!s)continue;
    const d=s.f.daily;
    const card=document.createElement("article");
    card.className="card";
    card.dataset.tz=s.f.timezone;
    card.innerHTML=`<div class="city">
      <div><h2>${s.g.name}</h2><div class="country">${s.g.country}</div></div>
      <div class="clock"><div class="time">${localClock(s.f.timezone)}</div><div class="tz">${s.f.timezone}</div></div>
    </div>
    <div class="forecast">${d.time.slice(0,6).map((date,i)=>`<div class="day">
      <div class="date">${new Date(date+"T12:00:00").toLocaleDateString(undefined,{weekday:"short",day:"numeric"})}</div>
      <div class="temp">${Math.round(d.temperature_2m_min[i])}° / ${Math.round(d.temperature_2m_max[i])}°</div>
      <div class="rain">${d.precipitation_probability_max[i]??"—"}% rain</div>
    </div>`).join("")}</div>`;
    dashboard.appendChild(card);
  }
}

function tick(){
  document.querySelectorAll(".card").forEach(card=>{
    const el=card.querySelector(".time");
    if(el)el.textContent=localClock(card.dataset.tz);
  });
}

async function loadFromNetwork(){
  const params=new URLSearchParams({
    latitude:CITIES.map(c=>c.latitude).join(","),
    longitude:CITIES.map(c=>c.longitude).join(","),
    daily:"weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    forecast_days:"6",
    timezone:"auto"
  });
  const results=await getJson(`${FORECAST_URL}?${params}`);
  return Array.isArray(results)?results:[results];
}

function applyForecasts(results){
  if(!Array.isArray(results)||results.length!==CITIES.length){
    throw new Error("Forecast provider returned an unexpected city count");
  }
  CITIES.forEach((city,i)=>{
    if(!results[i]?.daily?.time?.length)throw new Error(`Missing forecast for ${city.name}`);
    state.set(city.name,{g:city,f:results[i]});
  });
}

async function load(){
  status.textContent="Loading six cities…";
  refresh.disabled=true;
  const cached=cacheRead();
  try{
    const results=await loadFromNetwork();
    applyForecasts(results);
    cacheWrite(results);
    render();
    status.textContent=`Updated ${new Date().toLocaleTimeString()} · 6 cities · 6-day forecast · Live`;
  }catch(e){
    if(cached?.cities){
      try{
        applyForecasts(cached.cities);
        render();
        const age=Math.max(0,Math.round((Date.now()-(cached.savedAt||Date.now()))/60000));
        status.textContent=`Live provider unavailable (${e.message}) · showing cached forecast from ${age} min ago`;
      }catch{
        status.textContent=`Unable to load weather: ${e.message}`;
      }
    }else{
      status.textContent=`Unable to load weather: ${e.message}`;
    }
  }finally{
    refresh.disabled=false;
  }
}

refresh.addEventListener("click",load);
load();
setInterval(tick,1000);
setInterval(load,15*60*1000);
