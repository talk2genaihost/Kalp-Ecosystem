# KALP Trend Intelligence v1 — runtime repository integration
# This module is appended to the generated v0.8.9 browser engine.
import json
import re

KALP_TREND_REPOSITORY_ID = "ADMAN-TR-2026-001"
KALP_TREND_REPOSITORY_VERSION = "2026.09.24"
_KALP_TREND_REPOSITORY_CACHE = None


def _load_trend_repository():
    global _KALP_TREND_REPOSITORY_CACHE
    if _KALP_TREND_REPOSITORY_CACHE is not None:
        return _KALP_TREND_REPOSITORY_CACHE
    try:
        from js import XMLHttpRequest
        xhr = XMLHttpRequest.new()
        xhr.open("GET", "./trend_repository.json", False)
        xhr.send()
        if int(xhr.status) < 200 or int(xhr.status) >= 300:
            raise RuntimeError("trend repository HTTP " + str(xhr.status))
        repo = json.loads(str(xhr.responseText))
        if repo.get("repository_id") != KALP_TREND_REPOSITORY_ID:
            raise RuntimeError("trend repository identity mismatch")
        if not repo.get("trends"):
            raise RuntimeError("trend repository contains no records")
        _KALP_TREND_REPOSITORY_CACHE = repo
        return repo
    except Exception as exc:
        return {"repository_id": KALP_TREND_REPOSITORY_ID, "version": KALP_TREND_REPOSITORY_VERSION, "status": "UNAVAILABLE", "trends": [], "load_error": str(exc)}


def _trend_context(brief, base):
    intent = brief.get("intent_model") or {}
    ai = brief.get("ai_direction") or {}
    parts = [brief.get(k) for k in ("brand", "product", "audience", "objective", "tone", "cta", "message", "language")]
    parts += [intent.get(k) for k in ("product", "category", "objective", "audience")]
    parts += [ai.get(k) for k in ("key_message", "creative_route", "narrative_arc")]
    for scene in (base.get("scenes") or []) + (ai.get("scenes") or []):
        if isinstance(scene, dict):
            parts += [scene.get(k) for k in ("story_purpose", "visual_direction", "vo", "sound_direction", "on_screen")]
    return " ".join(str(x or "") for x in parts).lower()


_TRIGGER_GROUPS = {
    "TR-001": ("short", "reel", "vertical", "mobile"),
    "TR-002": ("hook", "opening", "scroll"),
    "TR-003": ("ugc", "creator", "testimonial", "pov", "native"),
    "TR-004": ("creator", "micro creator", "nano creator"),
    "TR-005": ("hand", "hands", "faceless", "pen", "write", "erase", "product demo"),
    "TR-006": ("product", "demo", "write", "erase", "action"),
    "TR-007": ("on-screen", "overlay", "caption", "text"),
    "TR-008": ("sound", "voice", "vo", "music", "foley", "sfx"),
    "TR-009": ("native", "ugc", "creator", "social", "reels", "shorts"),
    "TR-010": ("shop", "commerce", "conversion", "catalog", "buy", "order"),
    "TR-011": ("whatsapp",),
    "TR-012": ("hindi", "hinglish", "local", "india", "bharat"),
    "TR-013": ("ai", "avatar", "synthetic", "generated"),
    "TR-014": ("ai", "generated", "synthetic", "avatar"),
    "TR-015": ("catalog", "product video", "product", "commerce"),
    "TR-016": ("variation", "variant", "a/b", "test", "multiple"),
    "TR-017": ("hook", "angle", "creator", "variation"),
    "TR-018": ("comment", "reply", "conversation"),
    "TR-019": ("before", "after", "rewrite", "erase", "transformation", "proof"),
    "TR-020": ("asmr", "tactile", "pen sound", "erasing sound", "foley"),
    "TR-021": ("trend", "culture", "timely", "current"),
    "TR-022": ("9:16", "16:9", "aspect", "placement", "format"),
    "TR-023": ("test", "measure", "outcome", "performance"),
    "TR-024": ("15", "20", "30", "short", "action"),
    "TR-025": ("shorts", "youtube", "60-second", "under 60"),
    "TR-026": ("creator", "partner", "collaboration"),
    "TR-027": ("ai", "optimization", "optimize", "creative"),
    "TR-028": ("mobile", "short", "reel", "shorts", "safe area", "on-screen"),
}


def select_trends(brief, base, limit=6):
    repo = _load_trend_repository()
    if repo.get("status") == "UNAVAILABLE":
        return {"repository_id": KALP_TREND_REPOSITORY_ID, "repository_version": KALP_TREND_REPOSITORY_VERSION, "query_status": "UNAVAILABLE", "selected_trend_ids": [], "selected_trends": [], "candidate_count": 0, "load_error": repo.get("load_error")}

    context = _trend_context(brief, base)
    ranked = []
    for rec in repo.get("trends", []):
        if str(rec.get("status", "")).lower() not in {"active", "watch"}:
            continue
        rid = rec.get("id")
        triggers = _TRIGGER_GROUPS.get(rid, ())
        hits = [x for x in triggers if x in context]
        score = len(hits) * 2
        if rid == "TR-007": score += 3
        if rid == "TR-028" and any(x in context for x in ("mobile", "short", "reel", "shorts")): score += 3
        if rid == "TR-024" and any(x in context for x in ("15", "short", "action")): score += 3
        searchable = " ".join(str(rec.get(k, "")) for k in ("name", "use", "treatment", "hook")).lower()
        score += min(len(set(re.findall(r"[a-z0-9]+", context)) & set(re.findall(r"[a-z0-9]+", searchable))), 2)
        if score <= 0:
            continue
        ranked.append({"trend_id": rid, "trend": rec.get("name"), "trend_type": rec.get("type"), "score": score, "reasons": hits, "evidence_strength": rec.get("evidence"), "source": rec.get("source"), "last_verified": rec.get("verified"), "status": rec.get("status"), "production_use": rec.get("use"), "creative_treatment": rec.get("treatment"), "hook_pattern": rec.get("hook"), "platform_market": rec.get("platform")})
    ranked.sort(key=lambda x: (-x["score"], x["trend_id"] or ""))
    selected = ranked[:limit]
    return {"repository_id": KALP_TREND_REPOSITORY_ID, "repository_version": KALP_TREND_REPOSITORY_VERSION, "query_status": "EXECUTED", "selection_method": "DETERMINISTIC_INTENT_AND_SCENE_MATCH", "selected_trend_ids": [x["trend_id"] for x in selected], "selected_trends": selected, "candidate_count": len(ranked), "context_excerpt": context[:500]}


_KALP_V089_BASE_EXECUTE = execute


def execute(rows, brief):
    base = _KALP_V089_BASE_EXECUTE(rows, brief)
    trend_intelligence = select_trends(brief, base)
    base["trend_intelligence"] = trend_intelligence
    package = base.setdefault("production_package", {})
    package["trend_repository"] = {"repository_id": trend_intelligence["repository_id"], "repository_version": trend_intelligence["repository_version"], "query_status": trend_intelligence["query_status"], "selected_trend_ids": trend_intelligence["selected_trend_ids"]}
    package["deliverables"] = list(package.get("deliverables") or [])
    if "trend intelligence / selected Trend IDs" not in package["deliverables"]:
        package["deliverables"].append("trend intelligence / selected Trend IDs")
    base["trend_ids"] = trend_intelligence["selected_trend_ids"]
    return base
