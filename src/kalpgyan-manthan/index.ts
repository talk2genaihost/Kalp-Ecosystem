import type { DiscoursePlan, KnowledgePack, ProductionRequest, ProductionResult, SpeakerStyle, VoiceProfile } from "../../contracts/kalpgyan-manthan-v01.js";

export const SPEAKER_STYLES: SpeakerStyle[] = [
  { id: "neutral-philosopher", label: "Neutral Philosopher", writingDNA: ["clear","reflective"], performanceDNA: ["measured","warm"] },
  { id: "zen-inspired", label: "Zen-inspired", writingDNA: ["minimal","paradoxical"], performanceDNA: ["slow","spacious"] },
  { id: "sufi-inspired", label: "Sufi-inspired", writingDNA: ["metaphorical","story-led"], performanceDNA: ["poetic","warm"] },
  { id: "vedantic-inspired", label: "Vedantic-inspired", writingDNA: ["inquiry","consciousness"], performanceDNA: ["calm","deliberate"] },
  { id: "modern-spiritual", label: "Modern Spiritual", writingDNA: ["conversational","practical"], performanceDNA: ["intimate","dynamic"] },
  { id: "socratic", label: "Socratic", writingDNA: ["question-led","analytical"], performanceDNA: ["precise","measured"] },
  { id: "storyteller", label: "Storyteller", writingDNA: ["narrative","vivid"], performanceDNA: ["expressive","rhythmic"] },
  { id: "academic", label: "Academic", writingDNA: ["structured","evidence-aware"], performanceDNA: ["formal","clear"] },
  { id: "motivational", label: "Motivational", writingDNA: ["action-oriented","repetitive"], performanceDNA: ["energetic","direct"] },
  { id: "custom", label: "Custom", writingDNA: [], performanceDNA: [] },
];

export function buildKnowledgePack(bookId: string, themes: string[], concepts: string[] = []): KnowledgePack {
  return { bookId, themes, concepts, stories: [], sourceAnchors: [] };
}

export function planDiscourse(topic: string, durationMinutes: 15 | 20): DiscoursePlan {
  const total = durationMinutes * 60;
  const sectionSeconds = Math.floor(total / 6);
  return { title: topic, topic, durationMinutes, sections: ["Opening","Core idea","Deepening","Example","Modern application","Reflection"].map(title => ({ title, targetSeconds: sectionSeconds })) };
}

export function validateVoiceForProduction(voice: VoiceProfile): string[] {
  const errors: string[] = [];
  if (voice.rightsStatus === "restricted") errors.push("Voice is restricted.");
  if (voice.kind === "authorized-clone" && voice.rightsStatus !== "verified-authorized") errors.push("Authorized clone requires verified authorization.");
  return errors;
}

export function createProduction(req: ProductionRequest, voice: VoiceProfile): ProductionResult {
  const reasons = validateVoiceForProduction(voice);
  if (reasons.length) return { productionId: crypto.randomUUID(), status: "blocked", script: "", chapters: [], qa: { passed: false, reasons } };
  const plan = planDiscourse(req.topic, req.durationMinutes);
  const script = plan.sections.map(s => "## " + s.title + "\n\n[Generated discourse segment for " + req.speakerStyleId + "]").join("\n\n");
  return { productionId: crypto.randomUUID(), status: "ready", script, chapters: plan.sections.map(s => s.title), audio: { provider: voice.provider ?? "kalp", format: "mp3" }, qa: { passed: true, reasons: [] } };
}
