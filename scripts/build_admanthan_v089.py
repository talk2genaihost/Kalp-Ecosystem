from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "admanthan-dashboard" / "admanthan_browser.py"
GATE = ROOT / "docs" / "admanthan-dashboard" / "semantic_fit_gate.py"
TREND_INTEGRATION = ROOT / "scripts" / "admanthan_trend_integration.py"
TREND_REPOSITORY = ROOT / "docs" / "admanthan-dashboard" / "trend_repository.json"
OUT = Path(os.environ.get("KALP_V089_OUT", str(SOURCE)))

source = SOURCE.read_text(encoding="utf-8")
gate = GATE.read_text(encoding="utf-8")
trend_integration = TREND_INTEGRATION.read_text(encoding="utf-8")
trend_repository = TREND_REPOSITORY.read_text(encoding="utf-8")

if "0.8.8-effect-necessity-shot-fit" not in source:
    raise SystemExit("Expected v0.8.8 source baseline not found")
if 'def evaluate_effect(' not in gate:
    raise SystemExit("Semantic gate contract missing")
if 'def choose_effects(' not in source:
    raise SystemExit("choose_effects() missing from v0.8.8 source")
if 'KALP_TREND_REPOSITORY_ID = "ADMAN-TR-2026-001"' not in trend_integration:
    raise SystemExit("Trend integration contract missing")
if '"repository_id":"ADMAN-TR-2026-001"' not in trend_repository:
    raise SystemExit("Trend repository identity missing")

marker = "\ndef execute("
execute_pos = source.find(marker)
if execute_pos < 0:
    raise SystemExit("execute() insertion point not found")

choose_start = source.find("def choose_effects(")
if choose_start < 0 or choose_start >= execute_pos:
    raise SystemExit("choose_effects block not found")

prefix = source[:choose_start]
base_choose = source[choose_start:execute_pos]
rest = source[execute_pos:]

integration = f'''\n# KALP v0.8.9 — Semantic Production Fit Gate\n{gate}\n\n# Preserve the complete v0.8.8 selector before overriding the entry point.\n# v0.8.8 choose_effects() returns (selected, diagnostics), so v0.8.9\n# preserves that public contract and enriches the diagnostics tuple.\n_KALP_V088_CHOOSE_EFFECTS = choose_effects\nKALP_V089_SEMANTIC_INTEGRATED = True\nVERSION = "0.8.9-semantic-production-fit"\n\ndef choose_effects(rows, scene, limit=3):\n    semantic_rows = []\n    semantic_diagnostics = []\n    counts = {{"DIRECT": 0, "SUPPORTING": 0, "INCOMPATIBLE": 0}}\n\n    for row in rows or []:\n        fit = evaluate_effect(scene, row)\n        semantic_diagnostics.append(fit)\n        state = fit.get("compatibility")\n        if state in counts:\n            counts[state] += 1\n        if state == "DIRECT":\n            semantic_rows.append(row)\n\n    # SUPPORTING fits are diagnostic-only. They must never cause an effect\n    # to be selected, and no padding is introduced when DIRECT fits are absent.\n    selected, shot_fit_diagnostics = _KALP_V088_CHOOSE_EFFECTS(semantic_rows, scene, limit)\n    diagnostics = {{\n        **(shot_fit_diagnostics or {{}}),\n        "semantic_fit_stage": "EXECUTED",\n        "semantic_fit_version": VERSION,\n        "semantic_fit_counts": counts,\n        "semantic_fit_diagnostics": semantic_diagnostics,\n        "semantic_fit_direct_rows": len(semantic_rows),\n    }}\n    return selected, diagnostics\n'''

rebuilt = prefix + base_choose + integration + rest + "\n\n" + trend_integration + "\n"
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(rebuilt, encoding="utf-8")

check = OUT.read_text(encoding="utf-8")
required = [
    'VERSION = "0.8.9-semantic-production-fit"',
    'KALP_V089_SEMANTIC_INTEGRATED = True',
    'KALP_TREND_REPOSITORY_ID = "ADMAN-TR-2026-001"',
    'def _load_trend_repository():',
    'def select_trends(',
    'trend_intelligence',
    'selected_trend_ids',
    'KALP_V089_BASE_EXECUTE = execute',
]
missing = [x for x in required if x not in check]
if missing:
    raise SystemExit("Build proof missing: " + ", ".join(missing))
print("Built", OUT)
