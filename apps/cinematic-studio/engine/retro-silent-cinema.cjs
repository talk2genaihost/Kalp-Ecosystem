"use strict";
const GENRES=["auto","mythological","historical","romance","comedy","horror-mystery","action-adventure","drama","advertisement","documentary"];
const FORMATS=["short-film","feature-film","social-reel","advertisement","scene-recreation"];
const RATIOS=["4:3","16:9","9:16"];
const STYLES={
 "authentic-1920s-indian":{era:"1920s Indian silent-film period language",photo:"monochrome orthochromatic-inspired photography, restrained highlights and deep readable shadows",acting:"expressive theatrical gestures and legible facial acting, emotionally clear without parody",camera:"locked-off theatrical compositions and measured reframing",texture:"archival silver-gelatin look, organic grain, gate weave, occasional dust and restrained flicker",transitions:["straight cut","iris-in","iris-out","slow dissolve"]},
 "indian-mythological":{era:"early Indian mythological silent cinema",photo:"monochrome studio photography, sculptural light, painted-backdrop depth and luminous highlights",acting:"formal mythological gestures, dignified mudras, expressive eyes and controlled devotional emotion",camera:"frontal tableau compositions, symmetrical staging and measured close-ups",texture:"archival monochrome print, gentle gate weave, visible grain and occasional dust",transitions:["iris-in","iris-out","straight cut","slow dissolve"]},
 "expressionist-1920s":{era:"1920s expressionist silent-film language",photo:"high-contrast monochrome, sculpted shadows, graphic silhouettes and chiaroscuro",acting:"stylized but emotionally readable physical acting and precise gesture",camera:"geometric compositions, deep perspective and dramatic locked frames",texture:"high-contrast archival print, film grain, gate weave, scratches and flicker",transitions:["straight cut","iris","hard fade","slow dissolve"]}
};
const BEATS=[
["opening-image","Opening Image","Establish the world, time, place and visual tone."],
["setup","The Setup","Make the central situation immediately understandable."],
["inciting-event","The Inciting Event","Show the event that changes the situation."],
["reaction","The Reaction","Communicate the emotional consequence without spoken dialogue."],
["decision","The Decision","Show a choice that advances the story."],
["escalation","Rising Action","Increase stakes and visual momentum."],
["climax","The Climax","Deliver the central confrontation, reveal or payoff."],
["resolution","Resolution","Resolve the immediate beat and leave a memorable final image."]
];
function clean(v,n){return String(v==null?"":v).replace(/\u0000/g,"").trim().slice(0,n);}
function detectGenre(t,g){if(g&&g!=="auto")return g;const s=t.toLowerCase();if(/\b(ad|advert|brand|product|campaign|commercial|rice)\b/.test(s))return"advertisement";if(/\b(horror|ghost|haunt|mystery|murder|suspense)\b/.test(s))return"horror-mystery";if(/\b(comedy|funny|comic|humou?r|slapstick)\b/.test(s))return"comedy";if(/\b(romance|love|wedding|relationship)\b/.test(s))return"romance";if(/\b(battle|fight|war|chase|adventure|mission|action)\b/.test(s))return"action-adventure";if(/\b(ramayana|mahabharata|purana|myth|deity|god|goddess|hanuman|shiva|krishna|rama|ram)\b/.test(s))return"mythological";if(/\b(history|historical|emperor|kingdom|freedom|independence|revolution)\b/.test(s))return"historical";if(/\b(documentary|biography|real event|true story)\b/.test(s))return"documentary";return"drama";}
function makeScene(beat,i,request,title,genre,profile,ratio,characters){
 const name=characters[0]||"the principal subject", other=characters[1]||"the surrounding world";
 const actions=[
 "A composed establishing tableau introduces the setting and central subject.",
 name+" is introduced in the context of "+request+".",
 "A clear visual event interrupts the established order and draws the subject's attention.",
 name+" reacts through eye movement, facial expression, hands and posture.",
 name+" makes a visible decision and commits through a decisive physical action.",
 name+" and "+other+" confront the changing situation; blocking and distance make the stakes visible.",
 "The central conflict reaches its strongest visual moment in a clear, readable tableau.",
 "Show the consequence of "+request+" and end on a composed image of "+name+"."
 ];
 const cards={"opening-image":"A STORY UNFOLDS","inciting-event":"BUT FATE HAD OTHER PLANS...","decision":"A DECISION MUST BE MADE","climax":"THE MOMENT OF TRUTH","resolution":"AND SO THE STORY CONTINUES..."};
 const intertitle=genre==="advertisement"?(i===0?"A NEW DISCOVERY":i===7?"A BETTER WAY FOR EVERY DAY":null):(cards[beat[0]]||null);
 const camera=i===0?"static establishing tableau, deep stage-like composition":i===3?"measured medium close-up for readable expression":i===6?"dramatic locked-off wide tableau":i===7?"static final tableau, hold for emotional landing":"locked-off medium-wide composition with deliberate theatrical blocking";
 const prompt="Create a single cinematic frame for "+title+". Story brief: "+request+". Scene beat: "+beat[1]+". Purpose: "+beat[2]+". Visible action: "+actions[i]+" Period: "+profile.era+". Photography: "+profile.photo+". Performance: "+profile.acting+". Camera: "+camera+". Aspect ratio: "+ratio+". Texture: "+profile.texture+". Silent cinema only: monochrome, no audible dialogue, no lip-sync, no modern props or typography. Preserve recurring character face, age, anatomy, costume, hair, ornaments and props across shots. Communicate action visually.";
 return {frame_id:"F"+String(i+1).padStart(2,"0"),beat_id:beat[0],title:beat[1],narrative_purpose:beat[2],visual_action:actions[i],performance_direction:profile.acting,camera,transition_in:i===0?"fade-in":profile.transitions[i%profile.transitions.length],transition_out:profile.transitions[(i+1)%profile.transitions.length],intertitle:intertitle?{card_id:"IT"+String(i+1).padStart(2,"0"),text:intertitle,treatment:"period intertitle typography, centered white lettering on black, subtle print wear",placement:"before-scene",purpose:beat[2]}:null,audio:{dialogue:"none",music:i===6?"dramatic piano/orchestral climax cue":i===7?"resolved piano cadence":"period piano-led instrumental accompaniment",sound_effects:"optional restrained foley; no synchronized speech"},visual_prompt:prompt,negative_constraints:["No colour or modern colour grading","No contemporary props or typography unless story-required","No audible dialogue, voiceover or lip-sync","No identity or costume drift","No modern drone shots, whip pans or glossy CGI"]};
}
function createSilentCinemaPlan(p){
 const request=clean(p&&(p.request||p.prompt||p.story),8000);
 if(request.length<12)throw Object.assign(new Error("Please provide a story or creative request of at least 12 characters."),{statusCode:400});
 const genreIn=clean(p.genre||"auto",40).toLowerCase(),format=clean(p.format||"short-film",40).toLowerCase(),ratio=clean(p.aspect_ratio||"4:3",8),style=clean(p.style||"authentic-1920s-indian",48);
 if(!GENRES.includes(genreIn))throw Object.assign(new Error("Unsupported genre."),{statusCode:400});
 if(!FORMATS.includes(format))throw Object.assign(new Error("Unsupported production format."),{statusCode:400});
 if(!RATIOS.includes(ratio))throw Object.assign(new Error("Unsupported aspect ratio."),{statusCode:400});
 if(!STYLES[style])throw Object.assign(new Error("Unsupported silent-film style."),{statusCode:400});
 const genre=detectGenre(request,genreIn),profile=STYLES[style],title=clean(p.title,100)||request.split(/[.!?\n]/)[0].slice(0,64);
 const characters=(Array.isArray(p.characters)?p.characters:[]).slice(0,12).map((c,i)=>clean(typeof c==="string"?c:c&&c.name,80)).filter(Boolean);
 const scenes=BEATS.map((b,i)=>makeScene(b,i,request,title,genre,profile,ratio,characters));
 const cards=scenes.filter(s=>s.intertitle).map(s=>s.intertitle);
 return {module:"KALP-CINE-RSCE-001",engine:"KALP Retro Silent Cinema Engine",version:"1.0.0",job_id:"RSCE-"+Date.now().toString(36).toUpperCase(),status:"BLUEPRINT_READY",execution_note:"This engine creates a provider-neutral production blueprint. Image/video rendering is a separate downstream provider operation.",input:{request,title,genre,format,aspect_ratio:ratio,style,characters},transformation:{era:profile.era,cinema_language:"silent-era visual storytelling",colour:"monochrome",dialogue_mode:"visual-performance-and-intertitles",voiceover:"disabled-by-default",acting:profile.acting,cinematography:profile.camera,texture:profile.texture,transitions:profile.transitions,audio_policy:"period-style instrumental score; optional restrained foley; no synchronized speech"},continuity:{character_identity_lock:true,costume_and_props_lock:true,location_and_spatial_continuity:true,scene_order_lock:true,character_registry:characters.map((name,i)=>({id:"CHAR_"+String(i+1).padStart(2,"0"),name,lock_fields:["face","age","anatomy","costume","hair","ornaments","props"]}))},production:{scene_count:scenes.length,scenes,intertitle_cards:cards,asset_requirements:["character-reference-sheets","location-and-prop-reference-sheets","scene-stills","intertitle-cards","instrumental-score"],edit_instructions:{frame_rate_feel:"subtle hand-cranked cadence; avoid distracting jerkiness",film_wear:"consistent restrained grain, gate weave, dust and occasional scratches",pacing:"hold expressive gestures long enough to read; use intertitles sparingly",export_aspect_ratio:ratio,export_colour:"monochrome"}},validation:{request_preserved:true,genre_detected:genre,silent_cinema_rules:["no synchronized dialogue","no default voiceover","monochrome image language","period-appropriate acting and camera grammar","intertitles only for essential narrative information"],continuity_required:true,renderer_ready:false,renderer_readiness_reason:"Blueprint and prompts are prepared; provider dispatch and rendered asset validation are not yet connected."},created_at:new Date().toISOString()};
}
module.exports={createSilentCinemaPlan,detectGenre,PROFILES:STYLES};
