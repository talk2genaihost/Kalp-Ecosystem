export type DurationMinutes = 15 | 20;
export type SpeakerStyleId = "neutral-philosopher" | "zen-inspired" | "sufi-inspired" | "vedantic-inspired" | "modern-spiritual" | "socratic" | "storyteller" | "academic" | "motivational" | "custom";
export type VoiceKind = "kalp-original" | "authorized-clone" | "provider-voice";

export interface BookInput { bookId: string; title: string; language: string; sourceRef?: string; }
export interface KnowledgePack { bookId: string; themes: string[]; concepts: string[]; stories: string[]; sourceAnchors: string[]; }
export interface DiscoursePlan { title: string; topic: string; durationMinutes: DurationMinutes; sections: Array<{ title: string; targetSeconds: number }>; }
export interface SpeakerStyle { id: SpeakerStyleId; label: string; writingDNA: string[]; performanceDNA: string[]; }
export interface VoiceProfile { voiceId: string; label: string; kind: VoiceKind; language: string; provider?: string; rightsStatus: "internal" | "verified-authorized" | "restricted"; }
export interface ProductionRequest { book: BookInput; topic: string; durationMinutes: DurationMinutes; speakerStyleId: SpeakerStyleId; voiceId: string; }
export interface ProductionResult { productionId: string; status: "ready" | "blocked"; script: string; chapters: string[]; audio?: { provider: string; format: "mp3" | "wav" }; qa: { passed: boolean; reasons: string[] }; }
