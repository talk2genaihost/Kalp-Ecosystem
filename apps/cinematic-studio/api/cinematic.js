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
  const has=id=>ids.includes(id);
  const meeting=has("RAM_001")&&has("HANUMAN_001")&&/(meet|meeting|encounter|milte|milan|भेंट|मिलन|मुलाकात|हनुमान|hanuman)/i.test(objective+" "+title);
  if(meeting){
    return [
      {frame_id:"F01",title:"The Encounter",perspective:"AUDIENCE",purpose:"Establish Ram and Hanuman meeting for the first time.",emotion:"Anticipation",action:"Ram and Hanuman see each other across the forest path.",dialogue:null,camera:"35mm extreme wide, slow push-in"},
      {frame_id:"F02",title:"Hanuman Recognizes Ram",perspective:"HANUMAN_001",purpose:"Reveal Hanuman's first-person perception of Ram.",emotion:"Recognition → Devotion",action:"Hanuman pauses, studies Ram and respectfully approaches.",dialogue:"आप कौन हैं, प्रभु?",camera:"85mm close-up, gentle push-in"},
      {frame_id:"F03",title:"Ram Sees Hanuman",perspective:"RAM_001",purpose:"Show Ram's perception of Hanuman's sincerity and strength.",emotion:"Curiosity → Trust",action:"Ram looks into Hanuman's eyes and welcomes him.",dialogue:"तुम्हारे शब्दों में सच्चाई है।",camera:"50mm Ram OTS"},
      {frame_id:"F04",title:"The Introduction",perspective:"SHARED",purpose:"Establish the first direct exchange between Ram and Hanuman.",emotion:"Warmth",action:"Hanuman introduces himself while Ram listens.",dialogue:"मैं हनुमान हूँ। आपकी सेवा ही मेरा सौभाग्य होगा।",camera:"50mm two-shot, slow lateral dolly"},
      {frame_id:"F05",title:"A Bond Begins",perspective:"HANUMAN_001",purpose:"Show the emotional beginning of their bond.",emotion:"Devotion → Resolve",action:"Hanuman bows; Ram raises him with affection.",dialogue:"उठो हनुमान। आज से हम साथ हैं।",camera:"65mm intimate medium shot"},
      {frame_id:"F06",title:"The Mission",perspective:"RAM_001",purpose:"Connect the meeting to the larger mission.",emotion:"Purpose",action:"Ram explains that Sita must be found.",dialogue:"हमें सीता की खोज करनी है।",camera:"50mm over-shoulder"},
      {frame_id:"F07",title:"Hanuman's Vow",perspective:"HANUMAN_001",purpose:"Establish Hanuman's commitment to Ram.",emotion:"Absolute Devotion",action:"Hanuman accepts the mission with unwavering confidence.",dialogue:"प्रभु, आपका कार्य ही मेरा जीवन है।",camera:"35mm low-angle hero push-in"},
      {frame_id:"F08",title:"The Journey Begins",perspective:"AUDIENCE",purpose:"Pay off the meeting and launch the next story movement.",emotion:"Hope → Determination",action:"Ram and Hanuman walk together into the forest.",dialogue:"चलो, हनुमान।",camera:"35mm wide, slow pull-back"}
    ];
  }
  const names=ids.map(id=>id.replace("_001","")).join(" and ");
  return Array.from({length:8},(_,i)=>({
    frame_id:"F0"+(i+1),
    title:["Establishing the Scene","First Perception","Character Response","The Exchange","Rising Purpose","Decision","Commitment","The Next Move"][i],
    perspective:i===0||i===7?"AUDIENCE":ids[i%ids.length],
    purpose:"Advance the scene described by the creator.",
    emotion:["Anticipation","Awareness","Curiosity","Connection","Tension","Decision","Resolve","Determination"][i],
    action:i===0?names+" enter the scene.":i===7?names+" move into the next story beat.":names+" respond to the developing situation.",
    dialogue:null,
    camera:["35mm extreme wide","85mm close-up","50mm OTS","50mm two-shot","65mm medium","35mm low angle","50mm push-in","35mm wide pull-back"][i]
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