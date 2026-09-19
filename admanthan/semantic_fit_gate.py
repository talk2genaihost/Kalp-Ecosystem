"""KALP AdManthan v0.8.9 — Semantic Production Fit Gate.

Provider-neutral, library-driven semantic fit layer. This module is intentionally
separate from the existing v0.8.8 browser engine until its integration is wired
and live-tested.
"""

import re

VERSION = "0.8.9-semantic-production-fit"


def norm(value):
    return str(value or "").strip().lower()


def tokens(value):
    return set(re.findall(r"[a-z]+", norm(value)))


def scene_intent(scene):
    text = " ".join(
        str(scene.get(k, ""))
        for k in ("story_purpose", "visual_direction", "vo", "sound_direction", "on_screen")
    )
    low = norm(text)
    intents = set()

    if any(x in low for x in ("write", "writing", "scrib", "pen moves", "pen tip", "लिख", "कलम", "स्याही")):
        intents.add("writing")
    if any(x in low for x in ("erase", "erasing", "rub", "remove", "मिट", "रगड़", "erase mark")):
        intents.add("erasing")
    if any(x in low for x in ("hand", "finger", "हाथ", "उंगली")):
        intents.add("hand_interaction")
    if any(x in low for x in ("paper", "sheet", "page", "desk", "कागज", "पन्ना")):
        intents.add("paper_context")
    if any(x in low for x in ("macro", "extreme close-up", "extreme close up", "macro detail", "मैक्रो")):
        intents.add("macro_detail")
    elif any(x in low for x in ("close-up", "close up", "detail shot", "product detail", "नज़दीक", "डिटेल")):
        intents.add("close_up")
    if any(x in low for x in ("hero", "logo", "brand lockup", "final frame", "cta")):
        intents.add("hero_brand")
    if any(x in low for x in ("camera", "dolly", "push in", "pull out", "orbit", "crane", "lens", "कैमरा")):
        intents.add("camera_motion")
    if any(x in low for x in ("left view", "right view", "rear view", "front view", "top view", "bottom view", "three-quarter", "three quarter", "coverage angle")):
        intents.add("explicit_angle")
    if any(x in low for x in ("product rotation", "product rotates", "product spins", "spin the product", "turntable", "360 product", "transform the product", "product transform")):
        intents.add("explicit_product_motion")
    if any(x in low for x in ("sfx", "sound effect", "foley", "erase sound", "pen sound", "rub sound", "scratch sound", "whoosh")):
        intents.add("explicit_sfx")
    if any(x in low for x in ("transition", "match cut", "whip", "cut")):
        intents.add("edit_transition")

    return {"intents": intents, "text": text, "low": low}


def effect_intent(row):
    text = " ".join(
        norm(row.get(k))
        for k in (
            "Shortcut", "Capability", "Primary Use / Intent", "Scene Recipe",
            "Visual / Execution Notes", "Ad Role", "Google-Ads Alignment",
        )
    )
    shortcut = norm(row.get("Shortcut"))
    capability = norm(row.get("Capability"))
    profile = {
        "shortcut": row.get("Shortcut"),
        "family": "unknown",
        "functions": set(),
        "intent_tokens": tokens(text),
        "text": text,
    }

    if shortcut.startswith("/macro_"):
        profile["family"] = "macro"
        profile["functions"].update(("macro_detail", "optical"))
    elif shortcut.startswith(("/dolly", "/truck", "/pedestal", "/crane", "/orbit", "/arc", "/pan", "/tilt", "/push", "/pull", "/tracking", "/handheld")):
        profile["family"] = "camera"
        profile["functions"].add("camera_motion")
    elif shortcut.startswith(("/hero_", "/low_", "/ultra_low", "/top_", "/overhead", "/profile", "/rear", "/front")) or "angle" in shortcut or "perspective" in capability:
        profile["family"] = "camera"
        profile["functions"].add("camera_angle")
    elif shortcut.startswith(("/wide_", "/tele_", "/shallow_", "/deep_", "/anamorphic", "/fisheye")):
        profile["family"] = "optical"
        profile["functions"].add("optical")
    elif shortcut.startswith(("/front_view", "/rear_view", "/left_view", "/right_view", "/three_quarter", "/top_view", "/bottom_view", "/detail_view")):
        profile["family"] = "product"
        profile["functions"].add("product_coverage")
    elif shortcut.startswith(("/turntable", "/spin", "/slide_product", "/product_", "/transform")):
        profile["family"] = "product_motion"
        profile["functions"].add("product_motion")
    elif shortcut.startswith(("/brand_", "/product_name", "/one_claim", "/typography", "/text_")):
        profile["family"] = "graphics"
        profile["functions"].add("graphics")
    elif shortcut.startswith(("/softbox", "/hard_light", "/rim_light", "/backlight", "/gobo", "/shadow", "/highlight")):
        profile["family"] = "lighting"
        profile["functions"].add("lighting")
    elif shortcut.startswith(("/dust", "/mist", "/fog", "/smoke", "/spark", "/particle", "/glow", "/light_streak")):
        profile["family"] = "vfx"
        profile["functions"].add("atmosphere_vfx")
    elif shortcut.startswith(("/glass", "/mirror", "/wet", "/fabric", "/paper", "/wood", "/metal", "/stone", "/water")):
        profile["family"] = "material_environment"
        profile["functions"].add("surface_environment")
    elif shortcut.startswith(("/match_cut", "/whip", "/zoom_transition", "/speed_ramp", "/freeze", "/time_")):
        profile["family"] = "edit"
        profile["functions"].add("edit_transition")
    elif shortcut.startswith(("/whoosh", "/swoosh", "/hit", "/riser", "/sting", "/ambient", "/foley", "/voiceover")):
        profile["family"] = "audio"
        profile["functions"].add("audio")

    return profile


def semantic_subject_fit(scene, effect):
    """Return DIRECT / SUPPORTING / INCOMPATIBLE semantic production fit.

    Family compatibility is deliberately insufficient. The shortcut's own
    production intent must match the scene's production requirement.
    """
    sp = scene_intent(scene)
    ep = effect_intent(effect)
    s = sp["intents"]
    e = ep["intent_tokens"]
    family = ep["family"]
    shortcut = ep["shortcut"] or ""

    # Explicit semantic disqualifiers for the failure observed in v0.8.8.
    if family == "macro" and shortcut == "/macro_button":
        if s & {"writing", "erasing", "paper_context", "hand_interaction", "close_up", "macro_detail"}:
            return {
                "compatibility": "INCOMPATIBLE",
                "reason": "Macro family is compatible with close framing, but this shortcut targets buttons/controls rather than handwriting or paper-writing detail.",
            }

    # Macro/detail: require subject-intent alignment, not just the macro family.
    if "macro_detail" in s or "close_up" in s:
        subject_terms = {
            "writing": {"write", "writing", "pen", "paper", "ink", "text", "handwriting", "tip"},
            "erasing": {"erase", "erasing", "rub", "paper", "mark", "ink"},
            "hand_interaction": {"hand", "finger", "touch", "grip", "interaction"},
            "paper_context": {"paper", "sheet", "page", "desk"},
        }
        relevant = set().union(*(subject_terms[k] for k in s if k in subject_terms))
        if family == "macro" and relevant:
            hits = len(e & relevant)
            if hits:
                return {"compatibility": "DIRECT", "reason": "Macro shortcut intent aligns with the scene's required subject/detail."}
            return {"compatibility": "INCOMPATIBLE", "reason": "Macro framing is relevant, but the shortcut's production subject does not match the scene detail."}

        if family == "optical":
            return {"compatibility": "SUPPORTING", "reason": "Optical technique can support framing, but does not itself define the scene subject/detail."}

    if "writing" in s or "erasing" in s or "hand_interaction" in s:
        if family == "product_motion":
            return {"compatibility": "INCOMPATIBLE", "reason": "Product-motion shortcut does not match a writing/erasing/hand-action requirement without explicit product-motion direction."}
        if family == "product":
            return {"compatibility": "INCOMPATIBLE", "reason": "Product coverage is not a semantic match for the required physical writing/erasing action."}
        if family in {"vfx", "material_environment", "graphics"}:
            return {"compatibility": "INCOMPATIBLE", "reason": "Decorative/material/graphics effect does not satisfy the physical production requirement."}
        if family in {"lighting", "camera", "optical"}:
            return {"compatibility": "SUPPORTING", "reason": "Technique may support the action, but does not directly perform the required production action."}

    if "explicit_angle" in s:
        if family == "product":
            return {"compatibility": "DIRECT", "reason": "Explicit product angle/coverage requirement matches product coverage."}
        return {"compatibility": "INCOMPATIBLE", "reason": "No matching product-angle/coverage function."}

    if "explicit_product_motion" in s:
        if family == "product_motion":
            return {"compatibility": "DIRECT", "reason": "Explicit product-motion requirement matches product-motion technique."}
        return {"compatibility": "INCOMPATIBLE", "reason": "No matching product-motion function."}

    if "explicit_sfx" in s:
        if family == "audio":
            return {"compatibility": "DIRECT", "reason": "Explicit production sound requirement matches audio effect."}
        return {"compatibility": "INCOMPATIBLE", "reason": "No matching production sound function."}

    if "edit_transition" in s:
        if family == "edit":
            return {"compatibility": "DIRECT", "reason": "Explicit edit/transition requirement matches edit technique."}
        return {"compatibility": "INCOMPATIBLE", "reason": "No matching edit/transition function."}

    if "hero_brand" in s:
        if family in {"graphics", "lighting", "camera", "product"} and any(t in e for t in ("brand", "branding", "logo", "product")):
            return {"compatibility": "DIRECT", "reason": "Brand/hero requirement matches the shortcut's production role."}

    return {"compatibility": "INCOMPATIBLE", "reason": "No semantic production requirement matched this shortcut."}


def evaluate_effect(scene, effect):
    fit = semantic_subject_fit(scene, effect)
    return {
        "shortcut": effect.get("Shortcut"),
        "stage": "SEMANTIC_FIT",
        "compatibility": fit["compatibility"],
        "reason": fit["reason"],
    }


def filter_effects(scene, rows, limit=3):
    """Select only semantically fit effects; never pad to the limit."""
    selected = []
    diagnostics = []
    for row in rows or []:
        result = evaluate_effect(scene, row)
        diagnostics.append(result)
        if result["compatibility"] == "DIRECT":
            selected.append(row)
        elif result["compatibility"] == "SUPPORTING":
            # Supporting fit is retained only as an auditable candidate. It is
            # never selected by this gate alone.
            continue
        if len(selected) >= limit:
            break

    return {"selected": selected, "diagnostics": diagnostics, "selected_count": len(selected), "padded": False}
