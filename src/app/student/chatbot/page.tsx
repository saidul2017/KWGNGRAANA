import ChatUI from "./ChatUI";
import { requireUser } from "@/lib/session";
import { all } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ChatbotPage() {
  const user = await requireUser("student");
  const messages = await all<{ id: number; role: "user" | "assistant"; content: string; created_at: string }>(
    `SELECT id, role, content, created_at FROM chat_messages
     WHERE user_id = ? ORDER BY id ASC LIMIT 200`,
    [user.id]
  );
  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">💬 Chatbot PKn</h1>
        <p className="text-sm text-slate-600">
          Tanya seputar Pancasila, UUD 1945, kewarganegaraan, demokrasi, antikorupsi, bela negara,
          atau Wawasan Nusantara. Setiap jawaban menyertakan rujukan resmi.
        </p>
      </header>
      <ChatUI initialMessages={messages} />
      <p className="text-xs text-slate-500">
        Catatan: Chatbot ini dirancang sebagai pendamping belajar, bukan pengganti dosen. Untuk
        kasus kompleks (hukum, politik, isu sensitif), tetap rujuk dokumen resmi dan diskusi kelas.
      </p>
    </div>
  );
}
