import { extractBookText } from "./book.js";
import { generateDiscourse } from "./providers/gemini.js";
import { synthesizeSpeech } from "./providers/google-tts.js";
import { persistMp3 } from "./audio.js";
import { AI_AWAAZ_PROVIDER_ID, createAiAwaazAdapter } from "./providers/ai-awaaz.js";
export { AI_AWAAZ_PROVIDER_ID, createAiAwaazAdapter } from "./providers/ai-awaaz.js";

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

function qaScript(script: string, durationMinutes: 15 | 20): string[] {
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  const target = durationMinutes === 20 ? 2600 : 1950;
  const tolerance = target * 0.25;
  const reasons = [`script words: ${words}`, `target: ${target} ± ${Math.round(tolerance)}`];
  if (Math.abs(words - target) > tolerance) reasons.push("Discourse duration estimate is outside the governed ±25% word-count band.");
  return reasons;
}

export async function createProduction(req: ProductionRequest, voice: VoiceProfile): Promise<ProductionResult> {
  const reasons = validateVoiceForProduction(voice);
  if (reasons.length) return { productionId: crypto.randomUUID(), status: "blocked", script: "", chapters: [], qa: { passed: false, reasons } };
  const productionId = crypto.randomUUID();
  if (voice.provider === AI_AWAAZ_PROVIDER_ID) return { productionId, status: "blocked", script: "", chapters: [], qa: { passed: false, reasons: ["AI Awaaz provider execution is gated until AWAAZ-02 API contract validation and AWAAZ-03 controlled connectivity pass."] } };
  if (!req.book.sourceRef) return { productionId, status: "blocked", script: "", chapters: [], qa: { passed: false, reasons: ["book.sourceRef is required for real production."] } };

  try {
    const sourceText = await extractBookText(req.book.sourceRef);
    if (sourceText.length < 200) throw new Error("Book intake returned too little source text for governed discourse generation.");
    const knowledge = buildKnowledgePack(req.book.bookId, req.topic.split(",").map(x => x.trim()).filter(Boolean));
    const style = SPEAKER_STYLES.find(s => s.id === req.speakerStyleId);
    if (!style) throw new Error(`Unknown speaker style: ${req.speakerStyleId}`);

    const script = await generateDiscourse({
      sourceText,
      topic: req.topic,
      language: req.book.language,
      durationMinutes: req.durationMinutes,
      style: `${style.label}; writing DNA: ${style.writingDNA.join(", ")}; performance DNA: ${style.performanceDNA.join(", ")}`
    });
    const plan = planDiscourse(req.topic, req.durationMinutes);
    const qaReasons = qaScript(script, req.durationMinutes);
    if (qaReasons.some(x => x.startsWith("Discourse duration estimate is"))) throw new Error(qaReasons[qaReasons.length - 1]);

    const audio = await synthesizeSpeech(script, req.book.language === "hi" ? "hi-IN" : req.book.language);
    const artifact = await persistMp3(productionId, audio.audioBase64);

    return {
      productionId,
      status: "ready",
      script,
      chapters: plan.sections.map(s => s.title),
      audio: { provider: voice.provider ?? "google-cloud-tts", format: "mp3" },
      qa: { passed: true, reasons: [...qaReasons, `Audio artifact: ${artifact.path} (${artifact.bytes} bytes)`, "Provenance: sourceRef retained at intake boundary"] }
    };
  } catch (error) {
    return { productionId, status: "blocked", script: "", chapters: [], qa: { passed: false, reasons: [error instanceof Error ? error.message : "Production failed."] } };
  }
}
