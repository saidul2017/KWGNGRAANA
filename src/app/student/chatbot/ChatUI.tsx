"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { id: number | string; role: "user" | "assistant"; content: string; created_at?: string };

const SUGGESTIONS = [
  "Apa isi Pasal 27 UUD 1945?",
  "Jelaskan asas ius sanguinis dan ius soli",
  "Apa itu Demokrasi Pancasila?",
  "Apa itu Wawasan Nusantara?",
  "Sebutkan 9 nilai antikorupsi KPK",
];

export default function ChatUI({ initialMessages }: { initialMessages: Msg[] }) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const tempId = `tmp-${Date.now()}`;
    setMessages((m) => [...m, { id: tempId, role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [...m, { id: `err-${Date.now()}`, role: "assistant", content: data.error || "Gagal mendapatkan jawaban" }]);
      } else {
        setMessages((m) => [...m, { id: `a-${Date.now()}`, role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages((m) => [...m, { id: `err-${Date.now()}`, role: "assistant", content: "Kesalahan jaringan" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card p-0 overflow-hidden">
      <div ref={scrollRef} className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 py-6">
            <div className="text-3xl mb-2">🤖</div>
            <p className="text-sm">Mulai percakapan dengan menanyakan konsep PKn.</p>
            <div className="mt-4 grid gap-2 max-w-md mx-auto">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-sm rounded-lg bg-slate-100 hover:bg-slate-200 px-3 py-2 text-left"
                >
                  💡 {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-2 text-sm bg-slate-100 text-slate-500">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>●</span>
              </span>
            </div>
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="border-t border-slate-100 p-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanyakan sesuatu tentang Kewarganegaraan..."
          className="input flex-1"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()} className="btn-primary">
          Kirim
        </button>
      </form>
    </div>
  );
}
