"""Chatbot PKn 2-layer: KB lokal → Gemini fallback."""
import streamlit as st

from lib import auth, db
from lib.chatbot_rules import SUGGESTIONS, SYSTEM_INSTRUCTION, search_kb
from lib.llm import generate_content, is_llm_enabled, llm_model
from lib.rate_limit import rate_limit

user = auth.require_login()

st.title("💬 Chatbot PKn")

if is_llm_enabled():
    st.caption(f"🤖 Mode AI aktif (model: {llm_model()}) — fallback Gemini bila pertanyaan di luar basis pengetahuan.")
else:
    st.caption("⚠️ Mode AI belum aktif. Hanya jawab pertanyaan di basis pengetahuan internal.")

# Load history dari DB
if "chat_history" not in st.session_state:
    rows = db.query_all(
        "SELECT id, role, content, topic FROM chat_messages WHERE user_id=? ORDER BY id LIMIT 100",
        (user["id"],),
    )
    st.session_state["chat_history"] = [
        {"role": r["role"], "content": r["content"], "source": r["topic"]} for r in rows
    ]

# Saran (jika kosong)
if not st.session_state["chat_history"]:
    st.markdown("### 💡 Coba mulai dengan:")
    cols = st.columns(2)
    for i, s in enumerate(SUGGESTIONS):
        if cols[i % 2].button(s, key=f"sg_{i}"):
            st.session_state["_pending_msg"] = s
            st.rerun()

# Render chat
for msg in st.session_state["chat_history"]:
    with st.chat_message(msg["role"], avatar="🧑‍🎓" if msg["role"] == "user" else "🤖"):
        st.markdown(msg["content"])
        if msg["role"] == "assistant" and msg.get("source"):
            badge = {"kb": "📚 Basis Pengetahuan", "ai": "🤖 AI Gemini",
                     "fallback": "❓ Tidak ditemukan"}.get(msg["source"], msg["source"])
            st.caption(badge)

# Input
prompt = st.session_state.pop("_pending_msg", None) or st.chat_input("Tanyakan tentang Kewarganegaraan...")

if prompt:
    # Rate limit: 30 pesan per 60 detik
    ok, retry = rate_limit(f"chatbot:user:{user['id']}", 30, 60.0)
    if not ok:
        st.error(f"Terlalu banyak pesan. Tunggu {retry:.0f} detik.")
        st.stop()

    # Simpan & tampilkan pesan user
    db.execute(
        "INSERT INTO chat_messages (user_id, role, content) VALUES (?, 'user', ?)",
        (user["id"], prompt),
    )
    st.session_state["chat_history"].append({"role": "user", "content": prompt, "source": None})
    with st.chat_message("user", avatar="🧑‍🎓"):
        st.markdown(prompt)

    # Routing 2-layer
    hit = search_kb(prompt)
    reply = ""
    source = "fallback"

    if hit:
        reply = f"{hit['answer']}\n\n📖 **Sumber:** {hit['source']}"
        if hit.get("follow_up"):
            reply += f"\n\n💭 **Refleksi:** {hit['follow_up']}"
        source = "kb"
    elif is_llm_enabled():
        with st.chat_message("assistant", avatar="🤖"):
            with st.spinner("🤖 Mencari jawaban..."):
                try:
                    res = generate_content(
                        system_instruction=SYSTEM_INSTRUCTION,
                        user_message=prompt,
                        temperature=0.4,
                        max_output_tokens=2000,
                    )
                    if res.get("blocked") or not res.get("text", "").strip():
                        reply = "Maaf, saya tidak dapat menjawab pertanyaan ini saat ini. Coba pertanyaan dengan kata kunci yang lebih spesifik atau tanyakan ke dosen."
                        source = "fallback"
                    else:
                        reply = res["text"].strip()
                        source = "ai"
                except RuntimeError as e:
                    reply = (
                        "Saya tidak menemukan informasi yang pasti. Silakan ajukan kembali dengan kata kunci spesifik "
                        "(mis. 'Pasal 27', 'ius sanguinis'), atau tanyakan langsung kepada dosen.\n\n"
                        f"_Detail teknis: {e}_"
                    )
                    source = "fallback"
    else:
        reply = (
            "Saya tidak menemukan informasi tentang ini di basis pengetahuan internal. "
            "Coba pertanyaan dengan kata kunci yang lebih spesifik (mis. 'Pasal 27', 'ius sanguinis')."
        )
        source = "fallback"

    db.execute(
        "INSERT INTO chat_messages (user_id, role, content, topic) VALUES (?, 'assistant', ?, ?)",
        (user["id"], reply, source),
    )
    st.session_state["chat_history"].append({"role": "assistant", "content": reply, "source": source})
    st.rerun()
