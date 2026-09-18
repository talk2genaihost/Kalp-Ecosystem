export async function synthesizeSpeech(text: string, languageCode = "hi-IN"): Promise<{ audioBase64: string; mimeType: string }> {
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_TTS_API_KEY is required for real TTS.");

  const voiceName = process.env.GOOGLE_TTS_VOICE ?? "hi-IN-Neural2-A";
  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode, name: voiceName },
      audioConfig: { audioEncoding: "MP3", speakingRate: Number(process.env.GOOGLE_TTS_RATE ?? "0.95") },
    }),
  });
  if (!response.ok) throw new Error(`Google TTS failed: HTTP ${response.status}`);
  const data = await response.json() as { audioContent?: string };
  if (!data.audioContent) throw new Error("Google TTS returned no audio.");
  return { audioBase64: data.audioContent, mimeType: "audio/mpeg" };
}