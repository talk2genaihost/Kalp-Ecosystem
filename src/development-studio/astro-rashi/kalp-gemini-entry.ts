import { buildEvidenceContext, validateInterpretation, type EvidenceContext } from "./kalp-evidence-gate.ts";

const SUPABASE_URL = "https://cfwrgalgscieddkcrtde.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const GATEWAY_ENDPOINT = `${SUPABASE_URL}/functions/v1/kalp-intelligence-gateway`;

type Interpretation = Record<string, unknown> & {
  summary?: string;
  chartSynthesis?: string[];
  personality?: string[];
  planetaryAnalysis?: string[];
  houseAnalysis?: string[];
  career?: string[];
  relationships?: string[];
  finance?: string[];
  dasha?: string[];
  dashaTimeline?: string[];
  nakshatra?: string[];
  yogas?: string[];
  yogaAnalysis?: string[];
  strengths?: string[];
  cautions?: string[];
  focus?: string[];
  guidance?: string[];
};

function escapeHtml(value: string): string { return value.replace(/[&<>\"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c] ?? c)); }
function asList(value: unknown): string[] { return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string" && v.trim().length > 0) : []; }

function ensurePersonalFields(): void {
  const form = document.getElementById("birthForm");
  if (!form || form.querySelector("#birthName")) return;
  const grid = document.createElement("div"); grid.className = "formgrid";
  grid.innerHTML = `<label><span>नाम / Name</span><input id="birthName" type="text" required autocomplete="name" placeholder="जैसे Gaurav"></label><label><span>लिंग / Sex</span><select id="birthSex" required><option value="">चुनें / Select</option><option value="male">पुरुष / Male</option><option value="female">महिला / Female</option><option value="other">अन्य / Other</option></select></label>`;
  form.insertBefore(grid, form.firstElementChild);
}
function ensureStyles(): void {
  if (document.getElementById("kalp-gemini-styles")) return;
  const style = document.createElement("style"); style.id = "kalp-gemini-styles";
  style.textContent = `.kalp-gemini-interpretation{margin-top:16px;padding:18px;border:1px solid #c4b5fd;border-radius:16px;background:linear-gradient(180deg,#faf5ff 0%,#fff 100%);box-shadow:0 5px 18px #0f172a0b}.kalp-gemini-header{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px}.kalp-gemini-header h3{margin:2px 0 0}.kalp-gemini-eyebrow{font-size:.72rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7c3aed}.kalp-gemini-badge{font-size:.72rem;font-weight:700;padding:5px 8px;border-radius:999px;background:#ede9fe;color:#6d28d9;white-space:nowrap}.kalp-gemini-summary{font-size:1rem;margin:10px 0 16px}.kalp-gemini-sections{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.kalp-gemini-section{padding:12px;background:#fff;border:1px solid #e2e8f0;border-radius:12px}.kalp-gemini-section h4{margin:0 0 7px;font-size:.94rem;color:#312e81}.kalp-gemini-section ul{margin:0;padding-left:19px}.kalp-gemini-section li{margin:4px 0}.kalp-gemini-interpretation>small{display:block;margin-top:14px;color:#64748b}.kalp-gemini-loading{background:#f8fafc;border-color:#cbd5e1}@media(max-width:700px){.kalp-gemini-sections{grid-template-columns:1fr}.kalp-gemini-header{align-items:flex-start}}`;
  document.head.appendChild(style);
}
async function token(): Promise<string> {
  if (!SUPABASE_ANON_KEY) throw new Error("KALP Gemini bridge is not configured in this build.");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {method:"POST",headers:{apikey:SUPABASE_ANON_KEY,"Content-Type":"application/json"},body:JSON.stringify({})});
  if (!response.ok) throw new Error(`KALP Gateway authentication failed (${response.status}).`);
  const body = await response.json() as {access_token?:string};
  if (!body.access_token) throw new Error("KALP Gateway authentication did not return an access token.");
  return body.access_token;
}
function evidencePrompt(e: EvidenceContext): string { return [
  "EVIDENCE GATE — HARD CONSTRAINT.", `Provider: ${e.provider}`, `Canonical model: ${e.model}`,
  `Field evidence status: ${JSON.stringify(e.statuses)}`, `Evidence-safe facts ONLY: ${JSON.stringify(e.facts)}`,
  `Unavailable fields: ${JSON.stringify(e.unavailable)}`, "Rules:", ...e.rules.map((r)=>`- ${r}`),
  "The Evidence-safe facts are the complete factual boundary. Do not use, reconstruct, calculate, or infer facts outside them.",
].join("\n"); }

async function interpret(payload: unknown): Promise<Interpretation> {
  const root = payload as Record<string, unknown>, evidence = buildEvidenceContext(payload), requested = root.requested ?? {};
  const name = (document.getElementById("birthName") as HTMLInputElement | null)?.value.trim() ?? "";
  const sex = (document.getElementById("birthSex") as HTMLSelectElement | null)?.value ?? "";
  const prompt = [
    "You are KALP's Full Kundli Intelligence layer. Produce a structured, evidence-gated Vedic chart interpretation from the supplied canonical evidence.",
    "First synthesize the whole supplied chart. Then analyze only the dimensions for which evidence exists: planetary records, supplied houses/KP houses, supplied Dashas and periods, supplied Nakshatra, supplied yogas, and supplied Shadbala.",
    "A planet's sign or degree alone does NOT authorize house, aspect, conjunction, dignity, lordship, placement, or event claims. House claims require supplied houses or KP houses. Strength claims require supplied Shadbala.",
    "Do not derive new yogas. Discuss only supplied yogaDetails. Do not derive Tithi, Karana, Mangal Dosha, houses, aspects, or Dasha subperiods from other facts.",
    "Use cautious, non-deterministic language: 'संकेत मिलते हैं', 'संभावना हो सकती है', 'प्रवृत्ति दिखाई देती है'. Astrology is not scientific certainty.",
    "No medical diagnosis/treatment, deterministic predictions, legal advice, or guaranteed financial outcomes. Finance may discuss behavioral tendencies only. Relationships may discuss communication/tendencies only.",
    "Return JSON only with exactly these keys: summary, chartSynthesis, personality, planetaryAnalysis, houseAnalysis, career, relationships, finance, dasha, dashaTimeline, nakshatra, yogas, yogaAnalysis, strengths, cautions, focus, guidance. summary is a string; every other key is string[].",
    "Write natural conversational Hindi. Use 2-4 useful bullets per supported section; return an empty array when the evidence does not support that section. Never compensate for missing evidence with generic astrology.",
    evidencePrompt(e), `Person details: ${JSON.stringify({name,sex})}`, `Requested birth context: ${JSON.stringify(requested)}`,
  ].join("\n\n");
  const response = await fetch(GATEWAY_ENDPOINT,{method:"POST",headers:{Authorization:`Bearer ${await token()}`,apikey:SUPABASE_ANON_KEY ?? "","Content-Type":"application/json"},body:JSON.stringify({provider:"gemini",gemini_models:["gemini-3.8-flash","gemini-3.7-flash","gemini-2.5-flash"],prompt})});
  const body = await response.json() as {output?:string;message?:string;attempts?:unknown[]};
  if (!response.ok || !body.output) throw new Error(body.message ?? `KALP Gemini request failed (${response.status}).`);
  let parsed: Interpretation; try { parsed = JSON.parse(body.output) as Interpretation; } catch { throw new Error("KALP Evidence Gate rejected the Gemini response because it was not valid JSON."); }
  const validation = validateInterpretation(parsed,evidence); if (!validation.ok) throw new Error(`KALP Evidence Gate rejected unsupported Gemini claims: ${validation.violations.join("; ")}`);
  return parsed;
}
function listSection(title:string,items:string[]):string { return items.length ? `<div class="kalp-gemini-section"><h4>${escapeHtml(title)}</h4><ul>${items.map((x)=>`<li>${escapeHtml(x)}</li>`).join("")}</ul></div>` : ""; }
function render(value:Interpretation,answer:HTMLElement):void {
  const section=document.createElement("section"); section.className="kalp-gemini-interpretation";
  section.innerHTML=`<div class="kalp-gemini-header"><div><span class="kalp-gemini-eyebrow">KALP · Full Kundli Intelligence</span><h3>विस्तृत वैदिक कुंडली विश्लेषण</h3></div><span class="kalp-gemini-badge">Evidence Gated</span></div><p class="kalp-gemini-summary">${escapeHtml(value.summary ?? "पर्याप्त evidence के बिना समग्र व्याख्या उपलब्ध नहीं है।")}</p><div class="kalp-gemini-sections">${listSection("चार्ट का समग्र संश्लेषण",asList(value.chartSynthesis))}${listSection("व्यक्तित्व और स्वभाव",asList(value.personality))}${listSection("ग्रह विश्लेषण",asList(value.planetaryAnalysis))}${listSection("भाव / हाउस विश्लेषण",asList(value.houseAnalysis))}${listSection("करियर और कार्यशैली",asList(value.career))}${listSection("रिश्ते और संचार",asList(value.relationships))}${listSection("धन और वित्तीय प्रवृत्तियाँ",asList(value.finance))}${listSection("दशा के संकेत",asList(value.dasha))}${listSection("दशा क्रम / Timeline",asList(value.dashaTimeline))}${listSection("नक्षत्र के संकेत",asList(value.nakshatra))}${listSection("योग",asList(value.yogas))}${listSection("योग विश्लेषण",asList(value.yogaAnalysis))}${listSection("मुख्य शक्तियाँ",asList(value.strengths))}${listSection("सावधानियाँ",asList(value.cautions))}${listSection("अभी ध्यान देने के क्षेत्र",asList(value.focus))}${listSection("व्यावहारिक मार्गदर्शन",asList(value.guidance))}</div><small>यह विश्लेषण केवल KALP-KUNDLI-CANONICAL-v1 के evidence-gated chart facts पर आधारित AI interpretation है; इसे निश्चित भविष्यवाणी या पेशेवर सलाह न माना जाए।</small>`;
  const details=answer.querySelector("details"); if(details) answer.insertBefore(section,details); else answer.insertBefore(section,answer.firstChild);
}
function process(answer:HTMLElement):void {
  if(answer.dataset.kalpGeminiProcessed==="true") return; const json=answer.querySelector(".kundli-json"); if(!json) return;
  let payload:unknown; try{payload=JSON.parse(json.textContent??"{}");}catch{return;}
  answer.dataset.kalpGeminiProcessed="true"; const loading=document.createElement("section"); loading.className="kalp-gemini-interpretation kalp-gemini-loading"; loading.innerHTML=`<h3>Full Kundli Intelligence</h3><p>Evidence-gated chart intelligence तैयार की जा रही है…</p>`; const details=answer.querySelector("details"); if(details) answer.insertBefore(loading,details); else answer.insertBefore(loading,answer.firstChild);
  void interpret(payload).then((result)=>{loading.remove();render(result,answer);}).catch((error)=>{loading.innerHTML=`<h3>Full Kundli Intelligence</h3><p>${escapeHtml(error instanceof Error?error.message:"KALP Evidence Gate ने व्याख्या उपलब्ध नहीं कराई।")}</p>`;});
}
ensurePersonalFields(); ensureStyles(); const answer=document.getElementById("answer"); if(answer){const observer=new MutationObserver(()=>process(answer));observer.observe(answer,{childList:true,subtree:true});process(answer);}
