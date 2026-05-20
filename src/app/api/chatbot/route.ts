import { NextResponse } from "next/server";
import { z } from "zod";
import { all, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { searchKb } from "@/lib/chatbot-rules";
import { isLlmEnabled, generateContent } from "@/lib/llm";

const Body = z.object({
  message: z.string().min(1).max(2000),
});

const SUGGESTIONS = [
  "Apa isi Pasal 27 UUD 1945?",
  "Jelaskan asas ius sanguinis dan ius soli",
  "Apa itu Demokrasi Pancasila?",
  "Apa itu Wawasan Nusantara?",
  "Sebutkan 9 nilai antikorupsi KPK",
  "Apa hak dan kewajiban warga negara?",
];

const FALLBACK =
  "Saya tidak menemukan informasi tentang ini di sumber yang tersedia (UUD 1945, UU Kewarganegaraan, materi RPS, atau bank pengetahuan PKn). " +
  "Silakan ajukan kembali dengan kata kunci yang lebih spesifik (mis. 'Pasal 27', 'Pancasila sila 3', 'ius sanguinis'), atau tanyakan langsung kepada dosen.";

const SYSTEM_INSTRUCTION = `
Anda adalah asisten pembelajaran mata kuliah Kewarganegaraan untuk mahasiswa S1 PGMI
(calon Guru Madrasah Ibtidaiyah). Peran Anda membantu mahasiswa memahami,
menganalisis, dan merefleksikan konsep kewarganegaraan agar kelak dapat menanamkan
nilai Pancasila dan kesadaran konstitusional kepada peserta didik.

ATURAN WAJIB:
1. Jawab dalam Bahasa Indonesia yang santun, akademis, jelas, dan mudah dipahami.
2. Selalu sebutkan rujukan resmi (UUD 1945 + nomor pasal, UU No. 12 Tahun 2006,
   Pancasila + sila yang relevan, Tap MPR, dsb.) di akhir penjelasan, dengan format
   "📖 Sumber: ...".
3. JANGAN mengarang pasal, ayat, nomor UU, atau data faktual. Jika tidak yakin,
   katakan jujur "Saya tidak memiliki kepastian sumber untuk hal tersebut" dan
   sarankan mahasiswa memeriksa dokumen resmi pemerintah.
4. JANGAN memberikan dukungan partisan kepada partai politik, calon, tokoh politik,
   atau kelompok tertentu. Bersikap netral dan berbasis data.
5. Untuk isu hukum/politik/SARA/HAM yang sensitif, sampaikan jawaban hati-hati
   berbasis sumber dan dorong mahasiswa untuk diskusi akademis.
6. Hubungkan dengan konteks calon guru MI: jika relevan, beri contoh konkret
   bagaimana konsep ini bisa diajarkan kepada peserta didik usia 7–12 tahun
   (aktivitas kelas, simulasi, diskusi nilai, studi kasus sederhana).
7. Tutup dengan satu pertanyaan reflektif singkat berformat "💭 Refleksi: ..."
   untuk mendorong berpikir kritis.
8. Tolak halus jika diminta mengerjakan seluruh tugas/esai mahasiswa. Bantu
   mereka menyusun kerangka berpikir, bukan menggantikan usaha akademik mereka.

Format jawaban:
- 3–6 kalimat untuk pertanyaan konsep umum.
- Lebih rinci untuk pertanyaan teknis spesifik (Pasal X ayat Y, dsb.)
- Selalu akhiri dengan "📖 Sumber: ..." dan "💭 Refleksi: ...".
`;

export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pesan tidak valid" }, { status: 400 });
  }
  const { message } = parsed.data;

  // Simpan pesan user
  await run(
    `INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)`,
    [user.id, message]
  );

  // 1) Coba KB lokal (otoritatif, terjamin sumber)
  const hit = searchKb(message);
  let reply: string;
  let source: "kb" | "ai" | "fallback" = "fallback";

  if (hit) {
    reply =
      `${hit.answer}\n\n📖 Sumber: ${hit.source}` +
      (hit.followUp ? `\n\n💭 Refleksi: ${hit.followUp}` : "");
    source = "kb";
  } else if (isLlmEnabled()) {
    // 2) Fallback ke Gemini dengan system instruction yang ketat
    try {
      const g = await generateContent({
        systemInstruction: SYSTEM_INSTRUCTION,
        userMessage: message,
        temperature: 0.4,
        maxOutputTokens: 2000,
      });
      if (g.blocked || !g.text.trim()) {
        reply =
          "Maaf, saya tidak dapat menjawab pertanyaan ini saat ini. " +
          "Coba ajukan dengan kata kunci yang lebih spesifik atau tanyakan langsung ke dosen Anda.";
        source = "fallback";
      } else {
        reply = g.text.trim();
        source = "ai";
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[chatbot] Gemini error:", msg);
      reply = FALLBACK + "\n\nContoh pertanyaan yang bisa Anda coba:\n- " + SUGGESTIONS.join("\n- ");
      source = "fallback";
    }
  } else {
    // 3) Tidak ada LLM key, fallback ke pesan default
    reply = FALLBACK + "\n\nContoh pertanyaan:\n- " + SUGGESTIONS.join("\n- ");
    source = "fallback";
  }

  await run(
    `INSERT INTO chat_messages (user_id, role, content, topic) VALUES (?, 'assistant', ?, ?)`,
    [user.id, reply, source]
  );

  return NextResponse.json({ reply, source, matched: source !== "fallback" });
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const messages = await all<{ id: number; role: string; content: string; topic: string | null; created_at: string }>(
    `SELECT id, role, content, topic, created_at FROM chat_messages WHERE user_id = ? ORDER BY id ASC LIMIT 200`,
    [user.id]
  );
  return NextResponse.json({ messages, suggestions: SUGGESTIONS, llmEnabled: isLlmEnabled() });
}
