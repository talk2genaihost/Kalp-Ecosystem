export const AI_AWAAZ_PROVIDER_ID = "KALP-VOICE-AWAAZ-001" as const;

export type AiAwaazCapability =
  | "CAP-VOICE-TTS"
  | "CAP-VOICE-EMOTION"
  | "CAP-VOICE-CLONE"
  | "CAP-VOICE-MULTILINGUAL"
  | "CAP-VOICE-PITCH"
  | "CAP-VOICE-SPEED"
  | "CAP-VOICE-MP3";

export interface VoiceIntent {
  text: string;
  language: string;
  voiceId?: string;
  emotion?: string;
  pitch?: number;
  speed?: number;
  style?: string;
  format?: "mp3";
}

export interface VoiceAsset {
  providerId: typeof AI_AWAAZ_PROVIDER_ID;
  status: "ready" | "blocked";
  format: "mp3";
  mimeType: "audio/mpeg";
  audioBase64?: string;
  provenance: {
    provider: typeof AI_AWAAZ_PROVIDER_ID;
    capability: "CAP-VOICE-TTS";
  };
  error?: string;
}

export interface AiAwaazAdapter {
  descriptor(): {
    providerId: typeof AI_AWAAZ_PROVIDER_ID;
    name: "AI Awaaz";
    integrationStatus: "discovered" | "validated" | "active";
    capabilities: AiAwaazCapability[];
  };
  supports(capability: AiAwaazCapability): boolean;
  validateConfiguration(): { ready: boolean; missing: string[] };
  synthesize(intent: VoiceIntent): Promise<VoiceAsset>;
}

/**
 * AI Awaaz stays behind the canonical KALP voice boundary.
 * Its public API contract has not yet been validated, so live execution
 * remains deliberately gated.
 */
export function createAiAwaazAdapter(env: NodeJS.ProcessEnv = process.env): AiAwaazAdapter {
  const capabilities: AiAwaazCapability[] = [
    "CAP-VOICE-TTS",
    "CAP-VOICE-EMOTION",
    "CAP-VOICE-CLONE",
    "CAP-VOICE-MULTILINGUAL",
    "CAP-VOICE-PITCH",
    "CAP-VOICE-SPEED",
    "CAP-VOICE-MP3",
  ];

  return {
    descriptor() {
      return {
        providerId: AI_AWAAZ_PROVIDER_ID,
        name: "AI Awaaz",
        integrationStatus: "discovered",
        capabilities,
      };
    },

    supports(capability) {
      return capabilities.includes(capability);
    },

    validateConfiguration() {
      const missing: string[] = [];
      if (!env.AI_AWAAZ_API_KEY) missing.push("AI_AWAAZ_API_KEY");
      if (!env.AI_AWAAZ_API_BASE_URL) missing.push("AI_AWAAZ_API_BASE_URL");
      return { ready: missing.length === 0, missing };
    },

    async synthesize(intent) {
      if (!intent.text.trim()) {
        return {
          providerId: AI_AWAAZ_PROVIDER_ID,
          status: "blocked",
          format: "mp3",
          mimeType: "audio/mpeg",
          provenance: { provider: AI_AWAAZ_PROVIDER_ID, capability: "CAP-VOICE-TTS" },
          error: "TTS received empty text.",
        };
      }

      const configuration = this.validateConfiguration();
      if (!configuration.ready) {
        return {
          providerId: AI_AWAAZ_PROVIDER_ID,
          status: "blocked",
          format: "mp3",
          mimeType: "audio/mpeg",
          provenance: { provider: AI_AWAAZ_PROVIDER_ID, capability: "CAP-VOICE-TTS" },
          error: "AI Awaaz execution is not enabled until API configuration is validated: " + configuration.missing.join(", ") + ".",
        };
      }

      return {
        providerId: AI_AWAAZ_PROVIDER_ID,
        status: "blocked",
        format: "mp3",
        mimeType: "audio/mpeg",
        provenance: { provider: AI_AWAAZ_PROVIDER_ID, capability: "CAP-VOICE-TTS" },
        error: "AI Awaaz API contract is not yet validated; live execution is intentionally gated.",
      };
    },
  };
}
