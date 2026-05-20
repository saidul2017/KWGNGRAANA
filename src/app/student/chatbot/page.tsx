import ChatUI from "./ChatUI";
import { requireUser } from "@/lib/session";
import { all } from "@/lib/db";
import { isLlmEnabled, llmModel } from "@/lib/llm";

export const dynamic = "force-dynamic";

export default async function ChatbotPage() {
  const user = await requireUser("student");
  const messages = await all<{
    id: number;
    role: "user" | "assistant";
    content: string;
    topic: string | null;
    created_at: string;
  }>(
    `SELECT id, role, content, topic, created_at FROM chat_messages
     WHERE user_id = ? ORDER BY id ASC LIMIT 200`,
    [user.id]
  );
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">💬 Chatbot PKn</h1>
        <p className="text-sm text-slate-600">
          Tanya seputar Pancasila, UUD 1945, kewarganegaraan, demokrasi, antikorupsi,
          bela negara, atau Wawasan Nusantara. Setiap jawaban menyertakan rujukan resmi.
        </p>
        {isLlmEnabled() ? (
          <p className="text-xs text-violet-700 mt-1">
            🤖 Mode AI aktif (model: {llmModel()}) — pertanyaan di luar basis pengetahuan
            akan dijawab oleh Gemini dengan rambu akademis.
          </p>
        ) : (
          <p className="text-xs text-amber-700 mt-1">
            ⚠️ Mode AI belum aktif. Hanya menjawab pertanyaan yang ada di basis pengetahuan
            internal.
          </p>
        )}
      </header>
      <ChatUI initialMessages={messages} />
      <p className="text-xs text-slate-500">
        Catatan: Chatbot ini dirancang sebagai pendamping belajar, bukan pengganti dosen.
        Untuk kasus kompleks (hukum, politik, isu sensitif), tetap rujuk dokumen resmi
        dan diskusikan di kelas.
      </p>
    </div>
  );
}
