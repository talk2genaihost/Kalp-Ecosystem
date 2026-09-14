"""Minimal regression checks for KALP AdManthan v0.8.9."""

from semantic_fit_gate import evaluate_effect, filter_effects


SCENE = {
    "story_purpose": "Show a medium close-up of a completed handwritten word on paper.",
    "visual_direction": "Hand holds an erasable pen above the paper.",
    "vo": "A word is written on the page.",
}


def test_macro_button_is_semantically_wrong():
    result = evaluate_effect(SCENE, {
        "Shortcut": "/macro_button",
        "Capability": "Macro control detail",
        "Primary Use / Intent": "Button / switch detail",
        "Scene Recipe": "Macro push on button",
        "Visual / Execution Notes": "Button/switch",
        "Ad Role": "Product demo",
        "Google-Ads Alignment": "Attention",
    })
    assert result["compatibility"] == "INCOMPATIBLE"
    assert result["stage"] == "SEMANTIC_FIT"


def test_wrong_macro_is_not_selected_to_fill_limit():
    result = filter_effects(SCENE, [
        {"Shortcut": "/macro_button", "Primary Use / Intent": "Button / switch detail"},
        {"Shortcut": "/macro_logo", "Primary Use / Intent": "Logo detail"},
    ])
    assert result["selected_count"] == 0
    assert result["padded"] is False


if __name__ == "__main__":
    test_macro_button_is_semantically_wrong()
    test_wrong_macro_is_not_selected_to_fill_limit()
    print("PASS: v0.8.9 semantic fit regression checks")
