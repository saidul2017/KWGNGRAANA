import { NextResponse } from "next/server";
import { z } from "zod";
import { all, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";
import { searchKb } from "@/lib/chatbot-rules";

const Body = z.object({
  message: z.string().min(1).max(2000),
});

const FALLBACK =
  "Saya tidak menemukan informasi tentang ini di sumber yang tersedia (UUD 1945, UU Kewarganegaraan, materi RPS, atau bank pengetahuan PKn). " +
  "Silakan ajukan kembali dengan kata kunci yang lebih spesifik (mis. ‘Pasal 27’, ‘Pancasila sila 3’, ‘ius sanguinis’), atau tanyakan langsung kepada dosen.";

const SUGGESTIONS = [
  "Apa isi Pasal 27 UUD 1945?",
  "Jelaskan asas ius sanguinis dan ius soli",
  "Apa itu Demokrasi Pancasila?",
  "Apa itu Wawasan Nusantara?",
  "Sebutkan 9 nilai antikorupsi KPK",
  "Apa hak dan kewajiban warga negara?",
];

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

  // Cari di basis pengetahuan
  const hit = searchKb(message);
  let reply: string;
  if (hit) {
    reply =
      `${hit.answer}\n\n` +
      `📖 Sumber: ${hit.source}` +
      (hit.followUp ? `\n\n💭 Refleksi: ${hit.followUp}` : "");
  } else {
    reply = FALLBACK + "\n\nContoh pertanyaan:\n- " + SUGGESTIONS.join("\n- ");
  }

  await run(
    `INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'assistant', ?)`,
    [user.id, reply]
  );

  return NextResponse.json({ reply, matched: !!hit });
}

export async function GET() {
  let user;
  try {
    user = await requireUser();
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }
  const messages = await all<{ id: number; role: string; content: string; created_at: string }>(
    `SELECT id, role, content, created_at FROM chat_messages WHERE user_id = ? ORDER BY id ASC LIMIT 200`,
    [user.id]
  );
  return NextResponse.json({ messages, suggestions: SUGGESTIONS });
}
