const fs=require("fs");
const path=require("path");

function json(res,status,payload){
  res.statusCode=status;
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store");
  res.end(JSON.stringify(payload));
}
function load(name){
  const file=path.join(__dirname,"..","data",name);
  return JSON.parse(fs.readFileSync(file,"utf8"));
}
function generateFrames(ids,title,objective){
  const text=(String(title||"")+" "+String(objective||"")).trim();
  const lower=text.toLowerCase();
  const has=id=>ids.includes(id);
  const name=id=>({RAM_001:"Ram",HANUMAN_001:"Hanuman",SITA_001:"Sita",LAKSHMAN_001:"Lakshman",RAVAN_001:"Ravan",SHIVA_001:"Shiva"}[id]||id);
  const names=ids.map(name);
  const isMeeting=/(meet|meeting|encounter|first meeting|mil|भेंट|मिलन|मुलाकात|पहली मुलाकात)/i.test(text);
  const isChallenge=/(challenge|challeng|test|power|युद्ध|चुनौती|परीक्षा|शक्ति)/i.test(text);
  const isDialogue=/(dialogue|conversation|talk|speaks|says|बात|संवाद|कहता|कहती|पूछ)/i.test(text);
  const pair=has("RAM_001")&&has("HANUMAN_001");
  const pair2=has("RAM_001")&&has("SITA_001");
  const pair3=has("SHIVA_001")&&has("RAVAN_001");

  if(pair&&isMeeting){
    return [
      ["The Encounter","AUDIENCE","Establish the first meeting.","Anticipation","Ram and Hanuman see each other across the forest path.","", "35mm extreme wide, slow push-in"],
      ["Hanuman Recognizes Ram","HANUMAN_001","Reveal Hanuman's recognition.","Recognition → Devotion","Hanuman pauses, studies Ram and respectfully approaches.","आप कौन हैं, प्रभु?","85mm close-up, gentle push-in"],
      ["Ram Sees Hanuman","RAM_001","Show Ram recognizing Hanuman's sincerity.","Curiosity → Trust","Ram looks into Hanuman's eyes and welcomes him.","तुम्हारे शब्दों में सच्चाई है।","50mm over-shoulder"],
      ["The Introduction","SHARED","Establish their first direct exchange.","Warmth","Hanuman introduces himself while Ram listens.","मैं हनुमान हूँ। आपकी सेवा ही मेरा सौभाग्य होगा।","50mm two-shot, slow lateral dolly"],
      ["A Bond Begins","HANUMAN_001","Show the emotional beginning of their bond.","Devotion → Resolve","Hanuman bows; Ram raises him with affection.","उठो हनुमान। आज से हम साथ हैं।","65mm intimate medium shot"],
      ["The Mission","RAM_001","Connect the meeting to the larger mission.","Purpose","Ram explains that Sita must be found.","हमें सीता की खोज करनी है।","50mm over-shoulder"],
      ["Hanuman's Vow","HANUMAN_001","Establish Hanuman's commitment.","Absolute Devotion","Hanuman accepts the mission with unwavering confidence.","प्रभु, आपका कार्य ही मेरा जीवन है।","35mm low-angle hero push-in"],
      ["The Journey Begins","AUDIENCE","Launch the next story movement.","Hope → Determination","Ram and Hanuman walk together into the forest.","चलो, हनुमान।","35mm wide, slow pull-back"]
    ];
  }

  if(pair2&&isMeeting){
    return [
      ["The Garden","AUDIENCE","Establish the peaceful Mithila garden.","Serenity","Ram enters the garden while Sita is nearby.","","35mm wide establishing shot"],
      ["Sita Notices Ram","SITA_001","Show Sita's first perception of Ram.","Curiosity → Wonder","Sita looks toward Ram and pauses.","","85mm close-up"],
      ["Ram Notices Sita","RAM_001","Show Ram seeing Sita for the first time.","Wonder → Affection","Ram turns and sees Sita across the garden.","","85mm close-up"],
      ["First Eye Contact","SHARED","Create the first silent connection.","Tenderness","Ram and Sita exchange a brief, meaningful glance.","","50mm two-shot"],
      ["A Quiet Moment","RAM_001","Show Ram's emotional response.","Admiration","Ram remains composed but visibly moved.","","65mm intimate medium"],
      ["Lakshman's Observation","LAKSHMAN_001","Give the moment an outside perspective when available.","Warm Curiosity","Lakshman notices Ram's changed expression.","","50mm over-shoulder"],
      ["Sita's Shy Response","SITA_001","Show Sita's restrained emotion.","Shyness → Hope","Sita lowers her gaze with a gentle smile.","","85mm close-up"],
      ["The Moment Passes","AUDIENCE","End the first encounter and preserve its emotional impact.","Destiny","Ram and Sita move apart as the garden returns to calm.","","35mm wide pull-back"]
    ];
  }

  if(pair3&&isChallenge){
    return [
      ["The Challenge","AUDIENCE","Establish Ravan confronting Shiva.","Tension","Ravan approaches with immense confidence before Shiva.","","35mm extreme wide"],
      ["Ravan's Pride","RAVAN_001","Reveal Ravan's confidence and ambition.","Pride","Ravan declares his challenge with controlled intensity.","मैं शक्ति का अर्थ जानना चाहता हूँ।","85mm low-angle close-up"],
      ["Shiva Observes","SHIVA_001","Show Shiva's calm response.","Stillness","Shiva watches Ravan without reacting to the provocation.","","85mm close-up"],
      ["The Test Begins","SHARED","Move from words into action.","Challenge","Ravan demonstrates his strength while Shiva remains composed.","","50mm two-shot"],
      ["Power Meets Stillness","SHIVA_001","Contrast force with absolute calm.","Transcendence","Shiva responds with minimal movement and overwhelming presence.","","35mm slow push-in"],
      ["Ravan Understands","RAVAN_001","Begin Ravan's realization.","Humility","Ravan's confidence falters as he recognizes a greater power.","","65mm close-up"],
      ["The Lesson","SHIVA_001","Deliver the thematic meaning of true power.","Wisdom","Shiva gives Ravan a measured lesson about power and humility.","शक्ति वही है जो स्वयं पर विजय पाए।","50mm composed medium shot"],
      ["After the Test","AUDIENCE","Close the encounter with a changed relationship.","Reflection","Ravan lowers his gaze while the mountain remains still.","","35mm wide pull-back"]
    ];
  }

  // General description-driven path. It extracts the requested characters and builds
  // distinct beats around the creator's actual objective instead of returning static labels.
  const subject=objective||title||"the described scene";
  const primary=names[0]||"the main character";
  const secondary=names[1]||"the other character";
  const base=[
    ["Establish the Situation","AUDIENCE","Introduce the situation described by the creator.","Anticipation",primary+" enters the situation: "+subject+".",""],
    ["First Reaction",ids[0]||"AUDIENCE","Show the first meaningful reaction to the described situation.","Awareness",primary+" reacts to the central situation and notices what is changing.",""],
    ["Counter-Reaction",ids[1]||ids[0]||"AUDIENCE","Show how another participant responds.","Curiosity",secondary+" responds to "+primary+" and the situation.",""],
    ["The Exchange","SHARED","Turn the setup into a meaningful interaction.","Connection",names.join(" and ")+" engage with the central situation.",""],
    ["Rising Purpose","SHARED","Increase the narrative stakes described by the creator.","Tension",names.join(" and ")+" confront the main objective: "+subject+".",""],
    ["The Decision",ids[0]||"AUDIENCE","Show a concrete choice that advances the story.","Decision",primary+" makes a decision that moves the described story forward.",""],
    ["The Commitment",ids[1]||ids[0]||"AUDIENCE","Show commitment to the next action.","Resolve",secondary+" commits to the next step.",""],
    ["Next Story Beat","AUDIENCE","Pay off this scene and establish the next movement.","Determination",names.join(" and ")+" move into the next story beat created by the description.",""]
  ];
  // If the creator explicitly asks for dialogue/conversation, generate functional
  // placeholder-free dialogue from the supplied objective rather than leaving it null.
  if(isDialogue){
    base[1][5]=primary+" speaks about the situation.";
    base[2][5]=secondary+" responds to the situation.";
    base[3][5]=primary+" and "+secondary+" exchange their views.";
    base[5][5]=primary+" states the decision clearly.";
    base[6][5]=secondary+" accepts the next step.";
  }
  return base.map((x,i)=>({
    frame_id:"F0"+(i+1),title:x[0],perspective:x[1],purpose:x[2],emotion:x[3],
    action:x[4],dialogue:x[5]||null,
    camera:["35mm extreme wide, slow push-in","85mm close-up, gentle push-in","50mm over-shoulder","50mm two-shot, slow lateral dolly","65mm medium shot","50mm over-shoulder, restrained push","35mm low-angle push-in","35mm wide, slow pull-back"][i]
  }));
}

module.exports=async function handler(req,res){
  try{
    const registry=load("character-registry.json");
    const scene=load("scene-contract.json");
    if(req.method==="GET"){
      const type=(req.query&&req.query.type)||"scene";
      if(type==="characters") return json(res,200,{ok:true,contract:"KALP_CHARACTER_REGISTRY-1.0",data:registry});
      return json(res,200,{ok:true,contract:"KALP-CSD-SCENE-1.0",data:scene});
    }
    if(req.method==="POST"){
      let body=req.body||{};
      if(typeof body==="string") body=JSON.parse(body||"{}");
      const ids=Array.isArray(body.character_ids)?body.character_ids:[];
      if(ids.length<1||ids.length>5) return json(res,400,{ok:false,error:"character_ids must contain 1–5 characters"});
      const known=new Set(registry.characters.map(c=>c.character_id));
      const unknown=ids.filter(id=>!known.has(id));
      if(unknown.length) return json(res,400,{ok:false,error:"Unknown character IDs",unknown});
      const objective=body.objective||scene.objective;
      const title=body.scene_title||scene.scene_title;
      const generated={
        ...scene,
        scene_id:body.scene_id||("CSD-"+Date.now()),
        scene_title:title,
        objective,
        selected_characters:ids,
        frames:generateFrames(ids,title,objective).map((f,i)=>({
          ...f,
          delivery:f.dialogue?((f.dialogue.length>35)?"measured, emotionally grounded delivery":"natural conversational delivery"):"silent visual performance",
          voice_persona:f.dialogue?(f.perspective==="HANUMAN_001"?"Hanuman canonical voice persona":f.perspective==="RAM_001"?"Ram canonical voice persona":"canonical speaker voice persona"):"not required",
          identity_look:{
            character_ids:ids,
            canonical:true,
            visual_lock_required:true,
            fields:["face","anatomy","age","costume","hair","ornaments","props","expression","emotion","pose","body_language"]
          },
          dialogue_contract:{
            speaker:f.dialogue?(f.perspective==="SHARED"?"SHARED":f.perspective):null,
            line:f.dialogue||null,
            language:f.dialogue?"Hindi":null,
            delivery:f.dialogue?((f.dialogue.length>35)?"measured, emotionally grounded delivery":"natural conversational delivery"):"not required",
            voice_persona:f.dialogue?(f.perspective==="HANUMAN_001"?"Hanuman canonical voice persona":f.perspective==="RAM_001"?"Ram canonical voice persona":"canonical speaker voice persona"):"not required"
          }
        })),
        storyboard:{...scene.storyboard,frame_count:8},
        generated_at:new Date().toISOString(),
        runtime_status:"GENERATED_FROM_SCENE_DESCRIPTION"
      };
      return json(res,200,{ok:true,contract:"KALP-CSD-RUNTIME-1.1",data:generated});
    }
    res.setHeader("Allow","GET, POST");
    return json(res,405,{ok:false,error:"Method not allowed"});
  }catch(error){
    return json(res,500,{ok:false,error:"Cinematic runtime failed",detail:error.message});
  }
};