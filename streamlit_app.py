"""Entry point KWGN Learning Hub.
Login → role-based navigation menggunakan st.navigation API.
"""
from __future__ import annotations

import streamlit as st

from lib import auth

st.set_page_config(
    page_title="KWGN Learning Hub",
    page_icon="🇮🇩",
    layout="wide",
    initial_sidebar_state="expanded",
)

# CSS sedikit untuk gaya Kahoot-ish
st.markdown(
    """
    <style>
    .kahoot-btn { font-weight:700; padding:1.2rem; border-radius:1rem; color:white; }
    .kahoot-red { background:#e21b3c; }
    .kahoot-blue { background:#1368ce; }
    .kahoot-yellow { background:#d89e00; }
    .kahoot-green { background:#26890c; }
    .small { font-size:0.8rem; color:#64748b; }
    </style>
    """,
    unsafe_allow_html=True,
)


def render_login() -> None:
    """Halaman login publik — ditampilkan jika belum auth."""
    st.title("🇮🇩 KWGN Learning Hub")
    st.caption("Sistem Pembelajaran Mata Kuliah Kewarganegaraan — S1 PGMI")

    col1, col2 = st.columns([2, 1])
    with col1:
        st.markdown(
            "Selamat datang. Silakan login sebagai **mahasiswa** (NIM) atau "
            "**dosen** (email)."
        )
        with st.form("login_form", clear_on_submit=False):
            role = st.radio(
                "Saya masuk sebagai",
                options=["student", "lecturer"],
                format_func=lambda r: "🎓 Mahasiswa" if r == "student" else "👨‍🏫 Dosen",
                horizontal=True,
            )
            identifier = st.text_input(
                "NIM" if role == "student" else "Email",
                placeholder="25104080001" if role == "student" else "dosen@kwgn.id",
            )
            password = st.text_input("Password", type="password")
            submit = st.form_submit_button("Masuk", type="primary")
            if submit:
                if not identifier or not password:
                    st.error("NIM/Email & password wajib diisi.")
                else:
                    ok, msg = auth.login(role, identifier, password)
                    if ok:
                        st.rerun()
                    else:
                        st.error(msg)
    with col2:
        st.info(
            "📌 **Login pertama**\n\n"
            "- Mahasiswa: NIM = password (wajib ganti)\n"
            "- Dosen: email + password yang dosen Anda berikan"
        )
        st.markdown(
            "Setelah login, ganti password di menu **Profil**."
        )


def main() -> None:
    user = auth.current_user()

    if not user:
        render_login()
        return

    # ===== Pasca-login: navigasi role-based =====
    with st.sidebar:
        st.markdown(f"### 👤 {user['name']}")
        if user["role"] == "student":
            st.caption(f"NIM: `{user['nim']}`")
        else:
            st.caption(f"📧 {user['email']}")
        st.markdown("---")

    if user["role"] == "lecturer":
        pages = [
            st.Page("views/lecturer/home.py", title="Ringkasan", icon="📊", default=True),
            st.Page("views/lecturer/questions.py", title="Bank Soal", icon="📝"),
            st.Page("views/lecturer/quizzes.py", title="Kuis & UAS", icon="🏆"),
            st.Page("views/lecturer/groups.py", title="Kelompok", icon="👥"),
            st.Page("views/lecturer/students.py", title="Mahasiswa", icon="🎓"),
            st.Page("views/lecturer/results.py", title="Nilai Kelas", icon="📈"),
            st.Page("views/lecturer/essays.py", title="Tinjau Esai", icon="✍️"),
            st.Page("views/profile.py", title="Profil", icon="👤"),
        ]
    else:
        pages = [
            st.Page("views/student/home.py", title="Beranda", icon="🏠", default=True),
            st.Page("views/student/practice.py", title="Latihan Mandiri", icon="🎯"),
            st.Page("views/student/quizzes.py", title="Kuis & UAS", icon="🏆"),
            st.Page("views/student/play.py", title="Mengerjakan", icon="▶️"),
            st.Page("views/student/chatbot.py", title="Chatbot PKn", icon="💬"),
            st.Page("views/student/results.py", title="Nilai Saya", icon="📊"),
            st.Page("views/profile.py", title="Profil", icon="👤"),
        ]

    pg = st.navigation(pages, position="sidebar")

    with st.sidebar:
        st.markdown("---")
        if st.button("🚪 Keluar", use_container_width=True):
            auth.logout()
            st.rerun()

    pg.run()


if __name__ == "__main__":
    main()
