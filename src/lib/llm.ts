/**
 * Wrapper minimal untuk Gemini API (REST, tanpa SDK tambahan).
 *
 * Aktif jika environment variable `GEMINI_API_KEY` terisi. Kalau tidak,
 * chatbot tetap jalan via rule-based dan grading esai akan return null.
 *
 * Dokumen: https://ai.google.dev/api/generate-content
 */

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export function isLlmEnabled(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

export function llmModel(): string {
  return process.env.GEMINI_MODEL || "gemini-2.5-flash";
}

type GenerateArgs = {
  systemInstruction: string;
  userMessage: string;
  temperature?: number;
  maxOutputTokens?: number;
  /** Jika diset, paksa output JSON sesuai schema. */
  responseSchema?: Record<string, unknown>;
  /** Untuk Gemini 2.5+: nonaktifkan thinking agar respons cepat & tak menghabiskan token. */
  disableThinking?: boolean;
};

export type GenerateResult = {
  text: string;
  blocked: boolean;
  json?: unknown;
};

/** Panggil generateContent endpoint Gemini. Throw jika error jaringan/auth. */
export async function generateContent(args: GenerateArgs): Promise<GenerateResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY belum diset");

  const model = llmModel();
  const generationConfig: Record<string, unknown> = {
    temperature: args.temperature ?? 0.4,
    maxOutputTokens: args.maxOutputTokens ?? 2048,
  };
  if (args.responseSchema) {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = args.responseSchema;
  }
  // Gemini 2.5+ default thinking. Untuk grading yang butuh JSON cepat,
  // matikan agar respons tidak terpotong oleh thinking tokens.
  if (args.disableThinking) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: args.systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: args.userMessage }] }],
    generationConfig,
  };

  const url = `${API_BASE}/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Gemini API ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
    promptFeedback?: { blockReason?: string };
  };

  if (data.promptFeedback?.blockReason) {
    return { text: "[Permintaan diblokir oleh filter keamanan]", blocked: true };
  }

  const cand = data.candidates?.[0];
  if (cand?.finishReason === "SAFETY") {
    return {
      text: "Maaf, saya tidak dapat menjawab pertanyaan ini karena memuat konten yang tidak sesuai filter keamanan.",
      blocked: true,
    };
  }
  if (cand?.finishReason === "MAX_TOKENS") {
    // Bisa jadi thinking habis budget. Tetap kembalikan partial text + tandai blocked
    // agar caller bisa fallback.
    const partial = cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    if (partial.length < 10) {
      return { text: "[Respons terpotong oleh batas token]", blocked: true };
    }
  }

  const text = cand?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  let json: unknown = undefined;
  if (args.responseSchema) {
    try {
      json = JSON.parse(text);
    } catch {
      /* biarkan undefined */
    }
  }
  return { text, blocked: false, json };
}
