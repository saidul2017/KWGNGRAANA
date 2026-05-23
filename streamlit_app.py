"""Entry point Streamlit untuk KWGN Learning Hub.

Urutan inisialisasi:
1. Set page config (HARUS pertama, sebelum st widget apa pun).
2. Init schema DB (idempoten — aman dipanggil setiap rerun, sekali di-cache).
3. Seed data demo kalau DB kosong.
4. Routing: kalau belum login → render_login. Kalau sudah → render student/lecturer.
"""

from __future__ import annotations

import streamlit as st

from lib.auth import current_user
from lib.db import init_schema
from lib.seed import seed_if_empty
from lib.views import lecturer, login, student

st.set_page_config(
    page_title="KWGN Learning Hub",
    page_icon="📚",
    layout="centered",
    initial_sidebar_state="auto",
    menu_items={
        "About": (
            "**KWGN Learning Hub**\n\n"
            "Platform pembelajaran Mata Kuliah Kewarganegaraan untuk S1 PGMI.\n\n"
            "Fitur: bank soal, kuis & UAS individu, latihan mandiri (Kahoot-style "
            "MCQ + esai dengan AI grading), chatbot PKn, rekap nilai kelas dan "
            "ekspor Excel.\n\n"
            "Catatan: mode Live Kahoot multi-user (real-time) tidak tersedia di "
            "versi Streamlit ini — gunakan mode kuis individu saja."
        ),
    },
)


# ----- Bootstrap (dijalankan sekali per process via cache) -----
@st.cache_resource
def _bootstrap() -> dict:
    """Inisialisasi DB + seed. Hanya dipanggil sekali per worker."""
    init_schema()
    return seed_if_empty()


def main() -> None:
    bootstrap_info = _bootstrap()
    if isinstance(bootstrap_info, dict) and bootstrap_info.get("error"):
        st.error(bootstrap_info["error"])
        st.info(
            "Tambahkan ke `.streamlit/secrets.toml`:\n\n"
            "```toml\nDEFAULT_LECTURER_PASSWORD = \"password_kuat_baru\"\n```\n\n"
            "Atau di Streamlit Cloud → Settings → Secrets."
        )

    user = current_user()
    if not user:
        login.render_login()
        return

    if user["role"] == "lecturer":
        lecturer.render(user)
    else:
        student.render(user)


if __name__ == "__main__":
    main()
