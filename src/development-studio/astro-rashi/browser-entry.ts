import { createAstroRashiRuntime } from "./runtime.js";
import { unavailableCalculationProvider } from "./demo-provider.js";
import { createLiveHoroscopeProvider, fetchLiveHoroscopes, SIGN_MAP } from "./live-horoscope-provider.js";
import { rashis } from "./localization.js";
import { renderGeminiForPayload } from "./kalp-gemini-entry.js";
import type { Locale, Rashi } from "./domain.js";

const liveProvider = createLiveHoroscopeProvider();
const runtime = createAstroRashiRuntime(liveProvider, unavailableCalculationProvider);
const KUNDLI_ENDPOINT = "https://cfwrgalgscieddkcrtde.supabase.co/functions/v1/astro-kundli";
const SUPABASE_URL = "https://cfwrgalgscieddkcrtde.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const locale: Locale = "hi-IN";
let selectedRashi: Rashi = rashis[0];
let accessToken: string | null = null;
let liveStatus = "Loading live daily horoscope…";
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
  const content = runtime.weekly(selectedRashi.id, locale);
  const summary = content.summary?.trim() || "इस राशि के लिए दैनिक संदेश अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद पुनः प्रयास करें।";
  $("selectedName").textContent = selectedRashi.names[locale];
  $("weeklyText").textContent = summary;
  $("selectedRashiLabel").textContent = `${selectedRashi.names[locale]} — चयनित राशि`;
  $("selectedRashiHint").textContent = liveStatus;
}

async function loadLive(): Promise<void> {
  try {
    const result = await fetchLiveHoroscopes(locale);
    for (const rashi of rashis) {
      const value = result.values.get(SIGN_MAP[rashi.id]);
      if (value?.trim()) liveProvider.setSummary(rashi.id, value.trim());
    }
    liveStatus = "Live daily horoscope · Powered by Sigastra";
    renderDaily();
  } catch (error) {
    liveStatus = "Live horoscope unavailable right now. Please retry later.";
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
