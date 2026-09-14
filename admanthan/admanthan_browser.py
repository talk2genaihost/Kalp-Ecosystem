import json
import re

VERSION='0.8.8-effect-necessity-shot-fit'
CLAIM_TERMS=['thermal','tip','retractable','refillable','waterproof','washable','smudge-proof','quick-dry','fast-drying','non-toxic','durable','leak-proof','shavings','residue','cartridge','eraser mechanism','lasts','long-lasting','writes smoothly','smooth writing','dries instantly','instant drying','erases completely','erases cleanly','without tearing','without shavings','zero residue','no residue','trace-free','without a trace','best','number one','#1','better than','faster than','more durable','guaranteed']
SAFE_REPLACEMENTS=[('zero residue','the erased mark'),('no residue','the erased mark'),('without a trace','the erased mark'),('trace-free','the erased mark'),('erases completely','erases'),('erases cleanly','erases'),('cleanly','away'),('instantly','then'),('instant','simple'),('seamless','continuous'),('premium',''),('perfect',''),('smooth','')]
OBJECT_CONTEXT_TERMS=['pen tip','tip of the pen','pen-tip','tip pressing','tip pressing on paper','pen tip pressing','tip writes','tip of an erasable pen']
def norm(v): return str(v or '').lower()
def sanitize_text(v,g):
    text=str(v or ''); low=norm(g)
    for term,repl in SAFE_REPLACEMENTS:
        if term in norm(text) and term not in low: text=text.replace(term,repl)
    return ' '.join(text.split())
def claim_term_is_property(term,text):
    low=norm(text)
    if term!='tip': return term in low
    props=['thermal tip','retractable tip','replaceable tip','durable tip','special tip','erasable tip','advanced tip','fine tip','micro tip','felt tip','metal tip','rubber tip','tip technology','tip mechanism']
    return any(p in low for p in props) and not any(p in low for p in OBJECT_CONTEXT_TERMS)
def fallback(brief):
    brand=brief.get('brand') or 'आपका ब्रांड'; product=brief.get('product') or 'यह प्रोडक्ट'; audience=brief.get('audience') or 'आज की पीढ़ी'; cta=brief.get('cta') or 'जानिए अधिक'
    return [audience+', अपनी रोज़मर्रा की दुनिया में एक ऐसी पसंद पर ध्यान दीजिए जो अलग महसूस हो।',product+' उस अनुभव को बेहतर बनाने का एक तरीका है।','जब लिखते हुए कोई गलती हो, तो उसे मिटाकर आगे बढ़िए।','अपने विचारों को फिर से लिखते हुए कहानी को आगे ले जाइए।',brand+' आपके लिखने के अनुभव को आपके लिए प्रासंगिक बनाने की कोशिश करता है।',brand+' — '+cta+'।']
def claim_guard(brief,scenes):
    intent=brief.get('intent_model') or {}; facts=intent.get('user_stated_facts') or {}; research=brief.get('research_context') or {}; verified=research.get('verified_facts') or []
    grounding=norm(json.dumps({'facts':facts,'product':intent.get('product'),'category':intent.get('category'),'verified':verified},ensure_ascii=False)); violations=[]
    for i,s in enumerate(scenes,1):
        text=' '.join([str(s.get('vo') or ''),str(s.get('visual_direction') or ''),str(s.get('on_screen') or '')])
        for term in CLAIM_TERMS:
            if claim_term_is_property(term,text) and term not in grounding: violations.append({'scene':i,'term':term,'reason':'Unsupported product claim/property.'})
    return {'status':'PASS' if not violations else 'BLOCKED','evidence_policy':'USER_STATED_FACTS + VERIFIED_FACTS_ONLY','violation_count':len(violations),'violations':violations}

def scene_profile(scene):
    text=' '.join([scene.get('story_purpose',''),scene.get('visual_direction',''),scene.get('vo',''),scene.get('sound_direction',''),scene.get('on_screen','')]); low=norm(text)
    def anyof(xs): return any(x in low for x in xs)
    actions=[]
    if anyof(['product','pen','erasable','प्रोडक्ट','पेन']): actions+=['product_demo']
    if anyof(['write','writing','scrib','pen moves','pen tip moves','लिख','कलम','स्याही']): actions+=['writing','product_demo']
    if anyof(['erase','erasing','rub','remove','मिट','रगड़','erase mark']): actions+=['erasing','product_demo']
    if anyof(['reveal','unveil','open','pack','box','unbox','खुल']): actions+=['reveal']
    if anyof(['rotate','spin','360','turntable']): actions+=['product_rotation']
    if anyof(['macro','extreme close-up','extreme close up','macro detail','मैक्रो']): actions+=['macro_detail']
    elif anyof(['close-up','close up','detail shot','product detail','नज़दीक','डिटेल']): actions+=['close_up']
    if anyof(['hero','logo','brand lockup','final frame','cta']): actions+=['hero_brand']
    if anyof(['hand','finger','हाथ','उंगली']): actions+=['hand_interaction']
    if anyof(['paper','sheet','page','desk','कागज','पन्ना']): actions+=['paper_context']
    if anyof(['camera','dolly','push in','pull out','orbit','crane','lens','कैमरा']): actions+=['camera_motion']
    if anyof(['transition','cut','match cut','whip','कट']): actions+=['edit_transition']
    if anyof(['sound','music','voice','sfx','whoosh','foley','आवाज़','संगीत']): actions+=['audio']
    return {'actions':list(dict.fromkeys(actions or ['general_story'])),'low':low}

def effect_profile(row):
    text=' '.join(norm(row.get(k)) for k in ['Shortcut','Capability','Primary Use / Intent','Scene Recipe','Visual / Execution Notes','Ad Role','Google-Ads Alignment'])
    sc=norm(row.get('Shortcut')); cap=norm(row.get('Capability'))
    p={'family':'unknown','functions':set(),'roles':set(),'tokens':set(),'hard':set()}
    if sc.startswith('/macro_'): p['family']='macro'; p['functions']|={'macro_detail','optical'}
    elif sc.startswith(('/dolly','/truck','/pedestal','/crane','/orbit','/arc','/pan','/tilt','/push','/pull','/tracking','/handheld')): p['family']='camera'; p['functions'].add('camera_motion')
    elif sc.startswith(('/hero_','/low_','/ultra_low','/top_','/overhead','/profile','/rear','/front')) or 'angle' in sc or 'perspective' in cap: p['family']='camera'; p['functions'].add('camera_angle')
    elif sc.startswith(('/wide_','/tele_','/shallow_','/deep_','/anamorphic','/fisheye')): p['family']='optical'; p['functions'].add('optical')
    elif sc.startswith(('/front_view','/rear_view','/left_view','/right_view','/three_quarter','/top_view','/bottom_view','/detail_view')): p['family']='product'; p['functions'].add('product_coverage')
    elif sc.startswith(('/turntable','/spin','/slide_product','/product_','/transform')): p['family']='product_motion'; p['functions'].add('product_motion')
    elif sc.startswith(('/brand_','/product_name','/one_claim','/typography','/text_')): p['family']='graphics'; p['functions'].add('graphics')
    elif sc.startswith(('/softbox','/hard_light','/rim_light','/backlight','/gobo','/shadow','/highlight')): p['family']='lighting'; p['functions'].add('lighting')
    elif sc.startswith(('/dust','/mist','/fog','/smoke','/spark','/particle','/glow','/light_streak')): p['family']='vfx'; p['functions'].add('atmosphere_vfx')
    elif sc.startswith(('/glass','/mirror','/wet','/fabric','/paper','/wood','/metal','/stone','/water')): p['family']='material_environment'; p['functions'].add('surface_environment')
    elif sc.startswith(('/match_cut','/whip','/zoom_transition','/speed_ramp','/freeze','/time_')): p['family']='edit'; p['functions'].add('edit_transition')
    elif sc.startswith(('/whoosh','/swoosh','/hit','/riser','/sting','/ambient','/foley','/voiceover')): p['family']='audio'; p['functions'].add('audio')
    if any(x in text for x in ['branding','brand recognition','logo']): p['roles'].add('branding')
    if any(x in text for x in ['attention','hook','punctuation']): p['roles'].add('attention')
    if any(x in text for x in ['connection','lifestyle','context']): p['roles'].add('connection')
    if any(x in text for x in ['direction','message','claim']): p['roles'].add('message')
    if any(x in text for x in ['product','demo','coverage','reveal','feature']): p['roles'].add('product_demo')
    p['tokens']=set(re.findall(r'[a-z]+',text))
    if p['family'] in {'material_environment','vfx'}: p['hard']|={'writing','erasing','hand_interaction'}
    if p['family']=='graphics': p['hard']|={'writing','erasing','hand_interaction','product_motion'}
    return p

def classify_scene(scene): return scene_profile(scene)
def classify_effect(row): return effect_profile(row)

def choose_effects(rows,scene,limit=3):
    sp=classify_scene(scene); actions=set(sp['actions']); candidates=[]; rejected=[]
    explicit_camera='camera_motion' in actions; explicit_macro='macro_detail' in actions; explicit_close='close_up' in actions; explicit_edit='edit_transition' in actions; explicit_audio='audio' in actions; explicit_hero='hero_brand' in actions; explicit_paper='paper_context' in actions
    physical=actions & {'writing','erasing','hand_interaction'}
    low=sp['low']
    explicit_angle=any(t in low for t in ['left view','right view','rear view','front view','top view','bottom view','three-quarter','three quarter','underside','silhouette','multi-angle','multiple angles','coverage angle'])
    explicit_product_motion=any(t in low for t in ['product rotation','product rotates','product spins','spin the product','turntable','360 product','transform the product','product transform'])
    explicit_sfx=any(t in low for t in ['sfx','sound effect','foley','erase sound','pen sound','rub sound','scratch sound','whoosh'])
    for row in rows or []:
        ep=classify_effect(row); funcs=ep['functions']; family=ep['family']; compatibility='INCOMPATIBLE'; score=0; necessity=0; reasons=[]; fit='NONE'
        # DIRECT MATCH is strict: the library function must satisfy an explicit production requirement.
        if explicit_hero:
            if 'branding' in ep['roles'] and funcs & {'graphics','product_coverage','camera_motion','lighting'}: compatibility='DIRECT MATCH'; score=8; necessity=4; fit='hero_brand'
        elif explicit_macro:
            if 'macro_detail' in funcs: compatibility='DIRECT MATCH'; score=9; necessity=5; fit='macro_shot'; reasons.append('explicit macro-detail requirement')
            elif funcs & {'optical','camera_motion'}: compatibility='SUPPORTING MATCH'; score=4; necessity=2; fit='macro_support'; reasons.append('camera/optical technique can support macro framing')
        elif explicit_close:
            if 'macro_detail' in funcs: compatibility='SUPPORTING MATCH'; score=6; necessity=3; fit='close_up_support'; reasons.append('macro technique materially supports close-up framing')
            elif 'optical' in funcs: compatibility='SUPPORTING MATCH'; score=5; necessity=2; fit='close_up_support'; reasons.append('optical technique supports close-up framing')
            elif explicit_camera and 'camera_motion' in funcs: compatibility='DIRECT MATCH'; score=8; necessity=4; fit='camera_motion'
        elif physical:
            if explicit_camera and 'camera_motion' in funcs: compatibility='DIRECT MATCH'; score=8; necessity=4; fit='camera_motion'; reasons.append('explicit camera-direction requirement')
            elif explicit_angle and 'product_coverage' in funcs: compatibility='DIRECT MATCH'; score=9; necessity=5; fit='product_coverage'; reasons.append('explicit product-angle/coverage requirement')
            elif explicit_product_motion and 'product_motion' in funcs: compatibility='DIRECT MATCH'; score=9; necessity=5; fit='product_motion'; reasons.append('explicit product-motion requirement')
            elif family=='audio' and explicit_sfx: compatibility='DIRECT MATCH'; score=8; necessity=4; fit='action_sfx'; reasons.append('explicit production sound requirement')
            elif family in {'lighting','optical','camera','macro'}: compatibility='SUPPORTING MATCH'; score=4; necessity=1; fit='physical_action_support'; reasons.append('possible supporting production technique only')
        elif explicit_edit and 'edit_transition' in funcs: compatibility='DIRECT MATCH'; score=8; necessity=4; fit='edit_transition'
        elif explicit_audio and 'audio' in funcs and explicit_sfx: compatibility='DIRECT MATCH'; score=8; necessity=4; fit='audio'
        elif explicit_paper and any(t in ep['tokens'] for t in ['paper','sheet','page','desk']): compatibility='SUPPORTING MATCH'; score=3; necessity=1; fit='paper_context'; reasons.append('paper context only')
        elif 'product_demo' in actions and funcs & {'macro_detail','optical','camera_motion'}:
            compatibility='SUPPORTING MATCH'; score=3; necessity=1; fit='product_presentation_support'; reasons.append('generic product-presentation support only')
        # VO/music presence alone never establishes effect necessity.
        if family=='audio' and not explicit_sfx:
            compatibility='INCOMPATIBLE'; score=0; necessity=0; reasons=[]
        # Product-motion effects require an explicit production instruction; a hand turning a product is not enough.
        if family=='product_motion' and not explicit_product_motion:
            compatibility='INCOMPATIBLE'; score=0; necessity=0; reasons=[]
        # Product coverage requires an explicit coverage/angle requirement; close-up is not product-angle coverage.
        if family=='product' and not explicit_angle:
            compatibility='INCOMPATIBLE'; score=0; necessity=0; reasons=[]
        # Decorative families are never selected merely because the scene contains a physical action.
        if physical and family in {'vfx','material_environment','graphics'}:
            compatibility='INCOMPATIBLE'; score=0; necessity=0; reasons=[]
        if compatibility=='INCOMPATIBLE':
            rejected.append({'shortcut':row.get('Shortcut'),'stage':'SHOT_FIT','compatibility':'INCOMPATIBLE','reason':'No explicit production requirement or sufficiently necessary shot fit.'}); continue
        keyword_hits=len(ep['tokens'] & set(re.findall(r'[a-z]+',low))); score+=min(keyword_hits,1)
        # Supporting compatibility alone is not sufficient. It must clear a higher necessity bar.
        necessity_score=necessity*2 + (1 if keyword_hits else 0)
        if compatibility=='SUPPORTING MATCH' and necessity_score<6:
            rejected.append({'shortcut':row.get('Shortcut'),'stage':'NECESSITY','compatibility':compatibility,'reason':'Supporting match lacks sufficient production necessity; supporting compatibility alone cannot trigger selection.','necessity_score':necessity_score}); continue
        if compatibility=='DIRECT MATCH' and necessity_score<7:
            rejected.append({'shortcut':row.get('Shortcut'),'stage':'NECESSITY','compatibility':compatibility,'reason':'Direct match did not clear production necessity threshold.','necessity_score':necessity_score}); continue
        candidates.append({'row':row,'score':score,'necessity':necessity,'necessity_score':necessity_score,'reasons':reasons,'family':family,'functions':sorted(funcs),'compatibility':compatibility,'shot_fit':fit})
    candidates.sort(key=lambda x:(-x['necessity_score'],-x['score'],x['family'],str(x['row'].get('Shortcut') or '')))
    selected=[]; used_families=set(); used=set()
    for c in candidates:
        key=str(c['row'].get('Shortcut') or '')
        if key in used: continue
        penalty=1 if c['family'] in used_families else 0
        c['repetition_penalty']=penalty
        c['effective_score']=c['necessity_score']-penalty
        if c['effective_score']>=7:
            selected.append(c); used.add(key); used_families.add(c['family'])
        if len(selected)>=limit: break
    selected.sort(key=lambda x:(-x['effective_score'],-x['necessity_score'],str(x['row'].get('Shortcut') or '')))
    diagnostics={'scene_actions':sorted(actions),'candidate_count':len(candidates),'rejected_count':len(rejected),'selected_count':len(selected),'repetition_penalty_applied':any(c.get('repetition_penalty',0)>0 for c in selected),'compatibility_counts':{'DIRECT MATCH':sum(c['compatibility']=='DIRECT MATCH' for c in candidates),'SUPPORTING MATCH':sum(c['compatibility']=='SUPPORTING MATCH' for c in candidates),'INCOMPATIBLE':len(rejected)},'shot_fit_gate':'DIRECT MATCH requires explicit production need; SUPPORTING MATCH requires necessity threshold; no padding.','rejections':rejected[:40]}
    return selected,diagnostics

# KALP v0.8.9 — Semantic Production Fit Gate
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


# Preserve the complete v0.8.8 selector before overriding the entry point.
# v0.8.8 choose_effects() returns (selected, diagnostics), so v0.8.9
# preserves that public contract and enriches the diagnostics tuple.
_KALP_V088_CHOOSE_EFFECTS = choose_effects
KALP_V089_SEMANTIC_INTEGRATED = True
VERSION = "0.8.9-semantic-production-fit"

def choose_effects(rows, scene, limit=3):
    semantic_rows = []
    semantic_diagnostics = []
    counts = {"DIRECT": 0, "SUPPORTING": 0, "INCOMPATIBLE": 0}

    for row in rows or []:
        fit = evaluate_effect(scene, row)
        semantic_diagnostics.append(fit)
        state = fit.get("compatibility")
        if state in counts:
            counts[state] += 1
        if state == "DIRECT":
            semantic_rows.append(row)

    # SUPPORTING fits are diagnostic-only. They must never cause an effect
    # to be selected, and no padding is introduced when DIRECT fits are absent.
    selected, shot_fit_diagnostics = _KALP_V088_CHOOSE_EFFECTS(semantic_rows, scene, limit)
    diagnostics = {
        **(shot_fit_diagnostics or {}),
        "semantic_fit_stage": "EXECUTED",
        "semantic_fit_version": VERSION,
        "semantic_fit_counts": counts,
        "semantic_fit_diagnostics": semantic_diagnostics,
        "semantic_fit_direct_rows": len(semantic_rows),
    }
    return selected, diagnostics

def execute(rows,brief):
    ai=brief.get('ai_direction') or {}; ai_scenes=ai.get('scenes') if isinstance(ai.get('scenes'),list) and len(ai.get('scenes'))==6 else None
    intent=brief.get('intent_model') or {}; facts=intent.get('user_stated_facts') or {}; research=brief.get('research_context') or {}; verified=research.get('verified_facts') or []
    grounding=json.dumps({'facts':facts,'product':intent.get('product'),'category':intent.get('category'),'verified':verified},ensure_ascii=False); fb=fallback(brief); working=[]
    for i in range(6):
        src=ai_scenes[i] if ai_scenes and isinstance(ai_scenes[i],dict) else {}
        working.append({'story_purpose':str(src.get('story_purpose') or src.get('purpose') or 'Develop the advertising story.'),'visual_direction':sanitize_text(src.get('visual_direction') or '',grounding),'vo':sanitize_text(src.get('vo') or fb[i],grounding),'sound_direction':str(src.get('sound_direction') or ''),'on_screen':sanitize_text(src.get('on_screen') or '',grounding)})
    guard=claim_guard(brief,working); out=[]
    for i,scene in enumerate(working):
        chosen,diag=choose_effects(rows,scene,3); effects=[]
        for c in chosen:
            r=c['row']; effects.append({'shortcut':r.get('Shortcut'),'capability':r.get('Capability'),'intent':r.get('Primary Use / Intent'),'application':r.get('Scene Recipe'),'sheet':r.get('sheet',''),'semantic_score':c['score'],'effective_score':c['effective_score'],'effect_family':c['family'],'effect_functions':c['functions'],'compatibility':c['compatibility'],'selection_reasons':c['reasons'],'shot_fit':c['shot_fit'],'necessity_score':c['necessity_score']})
        missing=[]
        if len(effects)<3: missing.append('No additional production-relevant library effect passed the v0.8.8 necessity and shot-fit gate; no padding applied.')
        relevance='HIGH' if effects and effects[0]['effective_score']>=9 else ('MEDIUM' if effects else 'LOW')
        gate='PASS' if effects else 'PASS_WITH_LIMITED_EFFECTS'
        out.append({'scene':i+1,'timecode':str(i*2.5)+'-'+str((i+1)*2.5)+'s','story_purpose':scene['story_purpose'],'visual_direction':scene['visual_direction'],'effects':effects,'missing_effects':missing,'effect_diagnostics':diag,'effect_quality_gate':{'status':gate,'selected_count':len(effects),'allowed_range':'0-3','padding_applied':False},'vo':scene['vo'],'sound_direction':scene['sound_direction'],'sound':[],'on_screen':scene['on_screen'],'effect_status':'NECESSITY AND SHOT-FIT PASSED' if effects else 'NO EFFECT PASSED QUALITY GATE','effect_relevance':relevance,'claim_guard_status':'BLOCKED' if guard['status']=='BLOCKED' else 'PASS'})
    objective=brief.get('objective') or 'Brand Awareness'; strategy={'objective':objective,'tone':brief.get('tone') or 'Cinematic','audience':brief.get('audience') or '','key_message':ai.get('key_message') or brief.get('message') or objective,'creative_route':ai.get('creative_route') or 'Audience-led brand story','narrative_arc':ai.get('narrative_arc') or 'Hook → need → product meaning → experience → brand recall → CTA','duration_seconds':15,'scene_count':6,'language':brief.get('language') or 'Hindi','cta':ai.get('cta') or brief.get('cta'),'brand':brief.get('brand') or '','product':brief.get('product') or '','research_informed':bool(research.get('verified_facts')),'research_retrieved':bool(brief.get('research_context')),'evidence_available':bool(research.get('verified_facts')),'ai_composed':bool(ai_scenes)}
    return {'engine':'KALP AdManthan Python Engine','version':VERSION,'execution':'Pyodide/WebAssembly','brand':brief.get('brand') or 'Brand','product':brief.get('product') or '','objective':objective,'duration_seconds':15,'scene_count':6,'library_count':len(rows or []),'strategy':strategy,'continuous_vo':' '.join(s['vo'] for s in out),'script_mode':'AI-composed six-beat continuous VO with deterministic evidence-safe normalization','claim_guard':guard,'release_status':'HOLD_FOR_CLAIM_REVIEW' if guard['status']=='BLOCKED' else 'RELEASE_ELIGIBLE','scenes':out,'production_package':{'format':'15-second advertisement','aspect_ratio':'16:9','scene_count':6,'deliverables':['AI intent model','research context','claim and evidence guard','final objective','strategy','AI six-beat continuous VO','storyboard','quality-gated effect selections','effect diagnostics','sound design','production manifest'],'cta':ai.get('cta') or brief.get('cta'),'engine_status':'EXECUTED','brief_driven':True,'research_informed':bool(research.get('verified_facts')),'research_retrieved':bool(brief.get('research_context')),'evidence_available':bool(research.get('verified_facts')),'ai_composed':bool(ai_scenes),'raw_intent_excluded_from_creative':True}}
def generate(rows,brand,product,objective='Brand Awareness'): return execute(rows,{'brand':brand,'product':product,'objective':objective})