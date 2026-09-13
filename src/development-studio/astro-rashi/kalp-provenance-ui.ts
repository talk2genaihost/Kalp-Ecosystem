type Obj = Record<string, unknown>;

function obj(value: unknown): Obj {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
}
function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  const record = obj(value);
  for (const key of ["value", "name", "label", "sign", "rashi"]) if (record[key] !== undefined) return text(record[key]);
  return "—";
}
function sourceMeta(status: unknown, value: unknown): { label: string; detail: string; cls: string } {
  if (status === "PROVIDER") return { label: "OpenKundali · Provider", detail: "प्रदाता से प्राप्त", cls: "provider" };
  if (status === "CALCULATED") return { label: "KALP · Calculated", detail: "KALP द्वारा गणना", cls: "calculated" };
  if (status === "PARTIAL") return { label: "Partial Evidence", detail: "आंशिक प्रमाण", cls: "partial" };
  if (value === null || value === undefined || value === "") return { label: "Unavailable", detail: "डेटा उपलब्ध नहीं", cls: "unavailable" };
  return { label: "Unattributed", detail: "स्रोत स्पष्ट नहीं", cls: "unavailable" };
}

const FIELD_LABELS: Record<string, string> = {
  lagna: "लग्न", moonSign: "चंद्र राशि", nakshatra: "नक्षत्र", nakshatraPada: "नक्षत्र पाद", nakshatraLord: "नक्षत्र स्वामी",
  tithi: "तिथि", yoga: "योग", karana: "करण", sunSign: "सूर्य राशि", mangalDosha: "मंगल दोष", dasha: "दशा",
};

function evidenceFor(data: Obj, field: string): string | undefined {
  const evidence = obj(data.evidence);
  const value = evidence[field];
  return typeof value === "string" ? value : undefined;
}

function render(answer: HTMLElement): void {
  if (answer.querySelector(".kalp-provenance-panel")) return;
  const json = answer.querySelector(".kundli-json");
  if (!json) return;
  let payload: Obj;
  try { payload = JSON.parse(json.textContent ?? "{}") as Obj; } catch { return; }
  const data = obj(payload.data);
  const fields = Object.entries(FIELD_LABELS).map(([key, label]) => {
    const value = data[key];
    const meta = sourceMeta(evidenceFor(data, key), value);
    return `<div class="kalp-provenance-row"><div><strong>${label}</strong><span>${text(value)}</span></div><div class="kalp-provenance-source ${meta.cls}" title="${meta.detail}"><i></i><span>${meta.label}</span></div></div>`;
  }).join("");
  const panel = document.createElement("section");
  panel.className = "kalp-provenance-panel";
  panel.innerHTML = `<div class="kalp-provenance-header"><div><span class="kalp-provenance-eyebrow">KALP · Evidence Provenance</span><h3>इस जानकारी का स्रोत</h3><p>हर मुख्य कुंडली तथ्य के साथ दिखाया गया है कि वह प्रदाता से आया है, KALP ने गणना किया है, या उपलब्ध नहीं है।</p></div><button type="button" class="kalp-provenance-toggle" aria-expanded="true">छिपाएँ</button></div><div class="kalp-provenance-legend"><span class="provider"><i></i>OpenKundali · Provider</span><span class="calculated"><i></i>KALP · Calculated</span><span class="unavailable"><i></i>Unavailable</span></div><div class="kalp-provenance-grid">${fields}</div>`;
  const details = answer.querySelector("details");
  if (details) answer.insertBefore(panel, details); else answer.insertBefore(panel, answer.firstChild);
  const toggle = panel.querySelector(".kalp-provenance-toggle") as HTMLButtonElement | null;
  const grid = panel.querySelector(".kalp-provenance-grid") as HTMLElement | null;
  const legend = panel.querySelector(".kalp-provenance-legend") as HTMLElement | null;
  toggle?.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded)); toggle.textContent = expanded ? "दिखाएँ" : "छिपाएँ";
    if (grid) grid.hidden = expanded;
    if (legend) legend.hidden = expanded;
  });
}

function ensureStyles(): void {
  if (document.getElementById("kalp-provenance-styles")) return;
  const style = document.createElement("style"); style.id = "kalp-provenance-styles";
  style.textContent = `.kalp-provenance-panel{margin-top:16px;padding:16px;border:1px solid #cbd5e1;border-radius:14px;background:#fff}.kalp-provenance-header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.kalp-provenance-header h3{margin:2px 0 4px}.kalp-provenance-header p{margin:0;color:#64748b;font-size:.86rem}.kalp-provenance-eyebrow{font-size:.7rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#475569}.kalp-provenance-toggle{background:#fff;color:#312e81;border-color:#c4b5fd;padding:6px 9px}.kalp-provenance-legend{display:flex;flex-wrap:wrap;gap:12px;margin:13px 0 9px;padding:9px 11px;border-radius:10px;background:#f8fafc;font-size:.78rem}.kalp-provenance-legend span,.kalp-provenance-source{display:inline-flex;align-items:center;gap:6px}.kalp-provenance-legend i,.kalp-provenance-source i{width:8px;height:8px;border-radius:50%;display:inline-block;background:#94a3b8}.kalp-provenance-legend .provider i,.kalp-provenance-source.provider i{background:#2563eb}.kalp-provenance-legend .calculated i,.kalp-provenance-source.calculated i{background:#7c3aed}.kalp-provenance-legend .unavailable i,.kalp-provenance-source.unavailable i{background:#94a3b8}.kalp-provenance-legend .partial i,.kalp-provenance-source.partial i{background:#d97706}.kalp-provenance-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.kalp-provenance-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc}.kalp-provenance-row>div:first-child{display:grid;gap:2px;min-width:0}.kalp-provenance-row strong{font-size:.82rem}.kalp-provenance-row>div:first-child span{overflow-wrap:anywhere}.kalp-provenance-source{font-size:.7rem;font-weight:700;white-space:nowrap;color:#475569}.kalp-provenance-source.provider{color:#1d4ed8}.kalp-provenance-source.calculated{color:#6d28d9}.kalp-provenance-source.unavailable{color:#64748b}@media(max-width:700px){.kalp-provenance-grid{grid-template-columns:1fr}.kalp-provenance-header{align-items:flex-start}}`;
  document.head.appendChild(style);
}

ensureStyles();
const answer = document.getElementById("answer");
if (answer) {
  const observer = new MutationObserver(() => render(answer));
  observer.observe(answer, { childList: true, subtree: true });
  render(answer);
}
