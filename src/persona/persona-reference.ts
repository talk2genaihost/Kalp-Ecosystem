export interface Persona {
  id: string; name: string; role: string; capabilities: string[];
  authorityScope: string[]; speakingStyle?: string; languageStyle?: string;
  voiceProfile?: string; behaviorRules?: string[]; continuityLock?: boolean;
}
export const KALP_PERSONA_REFERENCE = [
 {id:"P001",name:"Gaurav Gaur",role:"PERSONA",capabilities:["podcast_host","podcast_guest"],authorityScope:["approved_persona_reference"],speakingStyle:"direct, analytical, conversational",languageStyle:"Hindi-English",voiceProfile:"VOICE_PROFILE_REQUIRED",behaviorRules:["ask clear questions","drive discussion","remain grounded"],continuityLock:true},
 {id:"P002",name:"Upasana Gaur",role:"PERSONA",capabilities:["podcast_host","podcast_guest"],authorityScope:["approved_persona_reference"],speakingStyle:"warm, narrative, reflective",languageStyle:"Hindi",voiceProfile:"VOICE_PROFILE_REQUIRED",behaviorRules:["story-led","empathetic"],continuityLock:true},
 {id:"P003",name:"Anuradha",role:"PERSONA",capabilities:["podcast_host","podcast_guest"],authorityScope:["approved_persona_reference"],speakingStyle:"story-mode conversational",languageStyle:"Hindi",voiceProfile:"VOICE_PROFILE_REQUIRED",behaviorRules:["maintain established persona behavior"],continuityLock:true},
 {id:"P004",name:"Kusum Sharma",role:"PERSONA",capabilities:["podcast_host","podcast_guest"],authorityScope:["approved_persona_reference"],speakingStyle:"warm, practical, nurturing",languageStyle:"Hindi",voiceProfile:"VOICE_PROFILE_REQUIRED",behaviorRules:["warmth","practical examples"],continuityLock:true},
 {id:"P005",name:"H.D. Sharma / Haridyal",role:"PERSONA",capabilities:["podcast_host","podcast_guest"],authorityScope:["approved_persona_reference"],speakingStyle:"confident, practical, grounded",languageStyle:"Hindi-Punjabi",voiceProfile:"VOICE_PROFILE_REQUIRED",behaviorRules:["Punjabi flavor where appropriate","remain grounded"],continuityLock:true},
 {id:"P006",name:"Ravi Dutt",role:"PERSONA",capabilities:["podcast_host","podcast_guest"],authorityScope:["approved_persona_reference"],speakingStyle:"conversational",languageStyle:"Hindi",voiceProfile:"VOICE_PROFILE_REQUIRED",behaviorRules:["maintain established persona behavior"],continuityLock:true}
] as const;
export class PersonaRegistry {
 private personas=new Map<string,Persona>();
 register(p:Persona){this.personas.set(p.id,p);}
 select(capability:string){return [...this.personas.values()].filter(p=>p.capabilities.includes(capability));}
 get(id:string){return this.personas.get(id);}
}
