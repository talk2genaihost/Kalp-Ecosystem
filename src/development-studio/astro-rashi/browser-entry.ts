import { createAstroRashiRuntime } from "./runtime.js";
import { unavailableCalculationProvider } from "./demo-provider.js";
import { createLiveHoroscopeProvider, fetchLiveHoroscopes, SIGN_MAP } from "./live-horoscope-provider.js";
import { rashis } from "./localization.js";
import { renderGeminiForPayload } from "./kalp-gemini-entry.js";
import { deriveCanonicalEvidence } from "./kalp-derived-evidence.js";
import type { Locale, Rashi } from "./domain.js";

const liveProvider = createLiveHoroscopeProvider();
const runtime = createAstroRashiRuntime(liveProvider, unavailableCalculationProvider);
const KUNDLI_ENDPOINT = "https://cfwrgalgscieddkcrtde.supabase.co/functions/v1/astro-kundli";
const SUPABASE_URL = "https://cfwrgalgscieddkcrtde.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const locale: Locale = "hi-IN";
void deriveCanonicalEvidence;
let selectedRashi: Rashi = rashis[0];
let accessToken: string | null = null;
let liveStatus = "हिंदी दैनिक संदेश लोड हो रहा है…";
const hindiFallback: Record<string, string> = {
  mesha: "आज पहल करने, काम को गति देने और स्पष्ट निर्णय लेने का दिन है। जल्दबाज़ी के बजाय एकाग्रता बनाए रखें।",
  vrishabha: "आज स्थिरता और धैर्य से काम लेना लाभकारी रहेगा। जरूरी कामों को प्राथमिकता देकर धीरे-धीरे आगे बढ़ें।",
  mithuna: "आज संवाद और सीखने की क्षमता मजबूत रहेगी। महत्वपूर्ण बातों को स्पष्ट शब्दों में रखें और अनावश्यक उलझन से बचें।",
  karka: "आज भावनाओं के साथ व्यावहारिक सोच का संतुलन रखें। परिवार और काम दोनों में शांत संवाद मदद करेगा।",
  simha: "आज आत्मविश्वास के साथ जिम्मेदारी निभाने का अवसर है। अपनी बात दृढ़ता से रखें, लेकिन दूसरों की राय भी सुनें।",
  kanya: "आज योजना, अनुशासन और छोटे विवरणों पर ध्यान देना उपयोगी रहेगा। अधूरे काम पूरे करने पर विशेष ध्यान दें।",
  tula: "आज सहयोग और संतुलन से काम आगे बढ़ेगा। किसी महत्वपूर्ण निर्णय में दोनों पक्षों को ध्यान से समझें।",
  vrishchika: "आज गहराई से सोचने और जरूरी काम पर ध्यान केंद्रित करने का समय है। प्रतिक्रिया देने से पहले स्थिति को समझें।",
  dhanu: "आज नई दिशा सीखने और आगे बढ़ने की प्रेरणा मिल सकती है। लक्ष्य स्पष्ट रखें और कदम व्यावहारिक रखें।",
  makara: "आज अनुशासन और निरंतर प्रयास आपकी ताकत रहेंगे। प्राथमिकताओं पर टिके रहें और परिणाम के लिए धैर्य रखें।",
  kumbha: "आज नए विचारों को व्यवस्थित करके उपयोगी दिशा देना बेहतर रहेगा। स्वतंत्र सोच के साथ जिम्मेदार निर्णय लें।",
  meena: "आज संवेदनशीलता और कल्पनाशीलता को व्यावहारिक योजना से जोड़ें। आराम और जरूरी काम के बीच संतुलन बनाए रखें।"
};
function isHindiText(value: string): boolean {
  const devanagari = (value.match(/[\u0900-\u097F]/g) ?? []).length;
  const latin = (value.match(/[A-Za-z]/g) ?? []).length;
  return devanagari >= 12 && devanagari >= latin;
}
function getHindiDailySummary(rashiId: string): string {
  const candidate = runtime.weekly(rashiId as Rashi["id"], locale).summary?.trim() ?? "";
  return isHindiText(candidate) ? candidate : hindiFallback[rashiId] ?? "आज धैर्य, स्पष्टता और संतुलित प्रयास पर ध्यान दें।";
}
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" })[character] ?? character);
}

function publishKundliPayload(payload: unknown): void {
  const answer = $("answer");
  answer.className = "notice kundli-result";
  answer.hidden = false;
  answer.innerHTML = `<h3>KALP Kundli</h3><p>Canonical chart data प्राप्त हुआ है। नीचे का दृश्य केवल KALP-KUNDLI-CANONICAL-v1 से render होता है।</p><details><summary>पूरा प्रदाता डेटा देखें</summary><pre class="kundli-json">${escapeHtml(JSON.stringify(payload, null, 2))}</pre></details>`;
  renderGeminiForPayload(payload, answer);
}

async function getAccessToken(): Promise<string> {
  if (accessToken) return accessToken;
  if (!SUPABASE_ANON_KEY) throw new Error("Supabase browser key is not configured in this build.");
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (!response.ok) throw new Error(`Authentication failed (${response.status}).`);
  const body = await response.json() as { access_token?: string };
  if (!body.access_token) throw new Error("Authentication did not return an access token.");
  accessToken = body.access_token;
  return accessToken;
}

function renderRashis(): void {
  const grid = $("rashiGrid");
  grid.innerHTML = "";
  rashis.forEach((rashi, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rashi";
    button.setAttribute("aria-pressed", String(rashi.id === selectedRashi.id));
    button.innerHTML = `<span class="rashi-symbol">${rashi.symbol}</span><span class="rashi-name">${rashi.names[locale]}</span><span class="rashi-index">${index + 1} / 12</span>`;
    button.addEventListener("click", () => { selectedRashi = rashi; renderRashis(); renderDaily(); });
    grid.appendChild(button);
  });
}

function renderDaily(): void {
  const summary = getHindiDailySummary(selectedRashi.id);
  $("selectedRashiLabel").textContent = `${selectedRashi.names[locale]} — चयनित राशि`;
  $("selectedRashiHint").textContent = "हिंदी में दैनिक संदेश";
  $("dailyHeroTitle").textContent = `आज का संदेश — ${selectedRashi.names[locale]}`;
  $("dailyHeroText").textContent = summary;
  $("dailyHeroStatus").textContent = liveStatus.includes("लाइव") ? "● लाइव हिंदी" : "हिंदी संदेश";
}

async function loadLive(): Promise<void> {
  try {
    const result = await fetchLiveHoroscopes(locale);
    for (const rashi of rashis) {
      const value = result.values.get(SIGN_MAP[rashi.id]);
      if (value?.trim()) liveProvider.setSummary(rashi.id, value.trim());
    }
    liveStatus = "लाइव हिंदी दैनिक संदेश · Sigastra";
    renderDaily();
  } catch (error) {
    liveStatus = "लाइव संदेश अभी उपलब्ध नहीं है; हिंदी संदेश दिखाया जा रहा है।";
    renderDaily();
    console.error(error);
  }
}

function bind(): void {
  document.getElementById("language")?.remove();
  const form = $("birthForm");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = $("askButton") as HTMLButtonElement;
    const answer = $("answer");
    const birthDate = $("birthDate") as HTMLInputElement;
    const birthTime = $("birthTime") as HTMLInputElement;
    const latitudeInput = $("latitude") as HTMLInputElement;
    const longitudeInput = $("longitude") as HTMLInputElement;
    const birthPlaceInput = $("birthPlace") as HTMLInputElement;
    button.disabled = true;
    answer.hidden = false;
    answer.className = "notice";
    answer.textContent = "कुंडली डेटा प्राप्त किया जा रहा है…";
    try {
      const token = await getAccessToken();
      const response = await fetch(KUNDLI_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          datetime: `${birthDate.value}T${birthTime.value}:00+05:30`,
          coordinates: `${latitudeInput.value},${longitudeInput.value}`,
          birthPlace: birthPlaceInput.value.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error ?? `Provider request failed (${response.status}).`);
      publishKundliPayload(payload);
    } catch (error) {
      answer.className = "notice";
      answer.textContent = error instanceof Error ? error.message : "कुंडली डेटा प्राप्त नहीं हो सका।";
    } finally {
      button.disabled = false;
    }
  });
  renderRashis();
  renderDaily();
  void loadLive();
}

bind();
