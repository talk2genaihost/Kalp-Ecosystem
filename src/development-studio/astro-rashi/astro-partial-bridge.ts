type Obj = Record<string, unknown>;
const ENDPOINT = "https://cfwrgalgscieddkcrtde.supabase.co/functions/v1/astro-kundli";
const GATEWAY = "https://cfwrgalgscieddkcrtde.supabase.co/functions/v1/kalp-intelligence-gateway";
const originalFetch = window.fetch.bind(window);
let lastPartial = false;

function escapeHtml(value: string): string {
  return value.replace(/[&<>\"']/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"})[c] ?? c);
}
function patchPayload(payload: Obj): Obj {
  if (payload.status !== "PARTIAL_SUCCESS") return payload;
  const kalp = payload.kalpLagna;
  const data = payload.data && typeof payload.data === "object" ? { ...(payload.data as Obj) } : {};
  if (kalp && typeof kalp === "object") data.lagna = kalp;
  data.__kalpPartial = true;
  data.__providerStatus = payload.providerStatus ?? null;
  data.__providerStage = payload.providerStage ?? null;
  return { ...payload, status: "SUCCESS", sourceStatus: "PARTIAL", data };
}
window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url.startsWith(GATEWAY) && lastPartial) {
    return new Response(JSON.stringify({ message: "Gemini interpretation is paused because provider data is partial." }), { status: 409, headers: { "Content-Type": "application/json" } });
  }
  const response = await originalFetch(input, init);
  if (!url.startsWith(ENDPOINT)) return response;
  const clone = response.clone();
  let body: unknown;
  try { body = await clone.json(); } catch { lastPartial = false; return response; }
  if (!body || typeof body !== "object") { lastPartial = false; return response; }
  if ((body as Obj).status !== "PARTIAL_SUCCESS") { lastPartial = false; return response; }
  lastPartial = true;
  const patched = patchPayload(body as Obj);
  return new Response(JSON.stringify(patched), { status: 200, headers: new Headers({ "Content-Type": "application/json" }) });
};

function renderPartialNotice(answer: HTMLElement): void {
  if (!lastPartial || answer.querySelector(".kalp-partial-notice")) return;
  const json = answer.querySelector(".kundli-json");
  let payload: Obj = {};
  try { payload = JSON.parse(json?.textContent ?? "{}") as Obj; } catch { return; }
  const data = payload.data && typeof payload.data === "object" ? payload.data as Obj : {};
  const lagna = data.lagna && typeof data.lagna === "object" ? data.lagna as Obj : {};
  const notice = document.createElement("section");
  notice.className = "kalp-partial-notice";
  notice.style.cssText = "margin-top:14px;padding:12px;border:1px solid #f59e0b;border-radius:12px;background:#fffbeb";
  const status = payload.providerStatus ?? data.__providerStatus ?? "अनुपलब्ध";
  const stage = payload.providerStage ?? data.__providerStage ?? "PROVIDER";
  notice.innerHTML = `<strong>स्रोत स्थिति: आंशिक</strong><p style="margin:6px 0">लग्न KALP ने स्वतंत्र रूप से गणना किया है; अन्य प्रदाता तथ्य अभी उपलब्ध नहीं हैं।</p><div><b>KALP Lagna:</b> ${escapeHtml(String(lagna.value ?? "उपलब्ध नहीं"))}${lagna.degreeText ? ` · ${escapeHtml(String(lagna.degreeText))}` : ""}</div><div style="margin-top:4px;font-size:.85rem;color:#92400e">Provider stage: ${escapeHtml(String(stage))} · Status: ${escapeHtml(String(status))}</div>`;
  const details = answer.querySelector("details");
  if (details) answer.insertBefore(notice, details); else answer.appendChild(notice);
}
const answer = document.getElementById("answer");
if (answer) {
  const observer = new MutationObserver(() => {
    renderPartialNotice(answer);
    if (lastPartial) answer.querySelectorAll(".kalp-gemini-interpretation").forEach((node) => node.remove());
  });
  observer.observe(answer, { childList: true, subtree: true });
}
