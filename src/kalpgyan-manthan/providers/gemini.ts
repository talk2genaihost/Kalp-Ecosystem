export async function generateDiscourse(input: { sourceText: string; topic: string; language: string; durationMinutes: 15 | 20; style: string }): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required for model-backed discourse generation.");

  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const prompt = `Create an original ${input.durationMinutes}-minute ${input.language} discourse from the supplied book material.
Topic: ${input.topic}
Style: ${input.style}
Requirements: synthesize and transform the source into an original discourse; do not imitate a named person's identity or voice; preserve important source attribution; do not invent quotations. Target approximately ${input.durationMinutes === 20 ? 2600 : 1950} words.

BOOK MATERIAL:
${input.sourceText.slice(0, 120000)}`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!response.ok) throw new Error(`Gemini generation failed: HTTP ${response.status}`);
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = data.candidates?.[0]?.content?.parts?.map(p => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned no discourse text.");
  return text;
}