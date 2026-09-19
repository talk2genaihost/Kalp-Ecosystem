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
type DailyGuidance = {
  luckyColor: string;
  luckyNumber: string;
  luckyTime: string;
  focus: string;
  work: string;
  money: string;
  relationships: string;
  caution: string;
  mantra: string;
};

const dailyGuidance: Record<Rashi["id"], DailyGuidance> = {
  mesha: { luckyColor:"लाल", luckyNumber:"9", luckyTime:"सुबह 9:00–10:30", focus:"पहल और स्पष्ट निर्णय", work:"एक महत्वपूर्ण काम पहले पूरा करें।", money:"जल्दबाज़ी के खर्च से बचें।", relationships:"सीधी लेकिन शांत बातचीत रखें।", caution:"आवेग में निर्णय न लें।", mantra:"मैं ऊर्जा को सही दिशा देता हूँ।" },
  vrishabha: { luckyColor:"हरा", luckyNumber:"6", luckyTime:"सुबह 10:00–11:30", focus:"स्थिरता और प्राथमिकता", work:"रूटीन और लंबित काम व्यवस्थित करें।", money:"बजट और जरूरी खर्च पर ध्यान दें।", relationships:"धैर्य से सुनना लाभकारी रहेगा।", caution:"जिद या अनावश्यक देरी से बचें।", mantra:"मैं धैर्य से स्थिर प्रगति करता हूँ।" },
  mithuna: { luckyColor:"हरा", luckyNumber:"5", luckyTime:"सुबह 11:00–12:30", focus:"संवाद और सीखना", work:"विचार स्पष्ट रखें और नई जानकारी अपनाएँ।", money:"खरीद या निवेश से पहले जानकारी जाँचें।", relationships:"स्पष्ट शब्द गलतफहमी कम करेंगे।", caution:"एक साथ बहुत काम न लें।", mantra:"मेरी स्पष्टता मेरी प्रगति है।" },
  karka: { luckyColor:"सफेद", luckyNumber:"2", luckyTime:"सुबह 8:30–10:00", focus:"भावनात्मक संतुलन", work:"महत्वपूर्ण काम शांत वातावरण में करें।", money:"परिवार से जुड़े खर्च सोच-समझकर करें।", relationships:"सहानुभूति के साथ अपनी बात रखें।", caution:"भावना में आकर प्रतिक्रिया न दें।", mantra:"मैं शांत रहकर सही चुनाव करता हूँ।" },
  simha: { luckyColor:"सुनहरा", luckyNumber:"1", luckyTime:"सुबह 9:30–11:00", focus:"आत्मविश्वास और नेतृत्व", work:"जिम्मेदारी लेकर काम को दिशा दें।", money:"प्रतिष्ठा से अधिक वास्तविक जरूरत को प्राथमिकता दें।", relationships:"नेतृत्व के साथ दूसरों की राय भी सुनें।", caution:"अहं या कठोरता से बचें।", mantra:"मैं आत्मविश्वास से नेतृत्व करता हूँ।" },
  kanya: { luckyColor:"हरा", luckyNumber:"5", luckyTime:"सुबह 8:00–9:30", focus:"योजना और विवरण", work:"सूची बनाकर छोटे चरणों में काम करें।", money:"हिसाब-किताब और दस्तावेज जाँचें।", relationships:"छोटी बातों को बड़ा बनाने से बचें।", caution:"अतिविश्लेषण से निर्णय न रोकें।", mantra:"व्यवस्था मुझे स्पष्टता देती है।" },
  tula: { luckyColor:"नीला", luckyNumber:"6", luckyTime:"दोपहर 12:00–1:30", focus:"संतुलन और सहयोग", work:"साझेदारी वाले काम आगे बढ़ाएँ।", money:"साझा वित्तीय निर्णय में स्पष्टता रखें।", relationships:"समझौते से पहले अपनी जरूरत स्पष्ट करें।", caution:"सबको खुश करने की कोशिश न करें।", mantra:"संतुलन में मेरी शक्ति है।" },
  vrishchika: { luckyColor:"गहरा लाल", luckyNumber:"9", luckyTime:"दोपहर 1:00–2:30", focus:"एकाग्रता और गहराई", work:"एक कठिन काम पर पूरा ध्यान दें।", money:"गोपनीय या बड़े वित्तीय फैसले जाँचकर लें।", relationships:"विश्वास और पारदर्शिता बनाए रखें।", caution:"संदेह को तथ्य का विकल्प न बनने दें।", mantra:"मैं गहराई से समझकर आगे बढ़ता हूँ।" },
  dhanu: { luckyColor:"पीला", luckyNumber:"3", luckyTime:"सुबह 7:30–9:00", focus:"दिशा और विस्तार", work:"नई सीख या अवसर को व्यावहारिक योजना से जोड़ें।", money:"बड़े लक्ष्य के साथ खर्च की सीमा तय करें।", relationships:"खुलकर बात करें, पर वादा सोचकर करें।", caution:"अति-आशावाद से बचें।", mantra:"मैं सीखकर आगे बढ़ता हूँ।" },
  makara: { luckyColor:"नीला", luckyNumber:"8", luckyTime:"सुबह 8:30–10:00", focus:"अनुशासन और निरंतरता", work:"दीर्घकालिक लक्ष्य का एक ठोस कदम पूरा करें।", money:"बचत और आवश्यक खर्च को प्राथमिकता दें।", relationships:"काम के बीच अपने लोगों के लिए समय रखें।", caution:"हर जिम्मेदारी अकेले न उठाएँ।", mantra:"निरंतर प्रयास मेरी ताकत है।" },
  kumbha: { luckyColor:"बैंगनी", luckyNumber:"8", luckyTime:"दोपहर 2:00–3:30", focus:"नए विचार और उपयोगी बदलाव", work:"नई तकनीक या तरीका आज़माने का अच्छा समय है।", money:"नए अवसर में तथ्य और जोखिम दोनों देखें।", relationships:"अपनी स्वतंत्रता के साथ दूसरे की जरूरत समझें।", caution:"बहुत दूर की योजना में वर्तमान न भूलें।", mantra:"नया विचार, जिम्मेदार कदम।" },
  meena: { luckyColor:"पीला", luckyNumber:"3", luckyTime:"सुबह 9:00–10:30", focus:"अंतर्ज्ञान और व्यावहारिकता", work:"रचनात्मक विचार को स्पष्ट कार्ययोजना दें।", money:"भावनात्मक खरीद से बचें।", relationships:"संवेदनशीलता को स्पष्ट संवाद से जोड़ें।", caution:"थकान को नजरअंदाज न करें।", mantra:"मैं संवेदना और समझ से आगे बढ़ता हूँ।" }
};

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

function renderDailyGuidance(): void {
  const g = dailyGuidance[selectedRashi.id];
  $("luckyColor").textContent = g.luckyColor;
  $("luckyNumber").textContent = g.luckyNumber;
  $("luckyTime").textContent = g.luckyTime;
  $("dailyFocus").textContent = g.focus;
  $("workGuidance").textContent = g.work;
  $("moneyGuidance").textContent = g.money;
  $("relationshipGuidance").textContent = g.relationships;
  $("dailyCaution").textContent = g.caution;
  $("dailyMantra").textContent = g.mantra;
}

function renderDaily(): void {
  const summary = getHindiDailySummary(selectedRashi.id);
  $("selectedRashiLabel").textContent = `${selectedRashi.names[locale]} — चयनित राशि`;
  $("selectedRashiHint").textContent = "हिंदी में दैनिक संदेश";
  $("dailyHeroTitle").textContent = `आज का संदेश — ${selectedRashi.names[locale]}`;
  $("dailyHeroText").textContent = summary;
  $("dailyHeroStatus").textContent = liveStatus.includes("लाइव") ? "● लाइव हिंदी" : "हिंदी संदेश";
  renderDailyGuidance();
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
