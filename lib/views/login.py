"""Halaman login — dipanggil dari streamlit_app.py kalau user belum login."""

from __future__ import annotations

import streamlit as st

from ..auth import login
from ..seed import seed_summary


def render_login() -> None:
    st.markdown(
        """
        <div style="text-align:center; padding:1.5rem 0 1rem;">
          <h1 style="margin:0; font-size:2.4rem;">📚 KWGN Learning Hub</h1>
          <p style="color:#475569; margin:.4rem 0 0;">
            Mata Kuliah Kewarganegaraan · S1 PGMI<br>
            Pancasila · UUD 1945 · Demokrasi · Bela Negara · Wawasan Nusantara
          </p>
        </div>
        """,
        unsafe_allow_html=True,
    )

    tab_student, tab_lecturer = st.tabs(["🎓 Mahasiswa", "👨‍🏫 Dosen"])

    with tab_student:
        st.caption("Login dengan **NIM** Anda. Password awal sama dengan NIM.")
        with st.form("login_student", clear_on_submit=False):
            nim = st.text_input("NIM", placeholder="Contoh: 2401001")
            pw = st.text_input("Password", type="password")
            submit = st.form_submit_button("Masuk sebagai Mahasiswa", use_container_width=True)
        if submit:
            ok, msg = login("student", nim, pw)
            if ok:
                st.success(msg)
                st.rerun()
            else:
                st.error(msg)

    with tab_lecturer:
        st.caption("Login dengan **email** institusi Anda.")
        with st.form("login_lecturer", clear_on_submit=False):
            email = st.text_input("Email", placeholder="dosen@kampus.ac.id")
            pw = st.text_input("Password", type="password", key="lec_pw")
            submit = st.form_submit_button("Masuk sebagai Dosen", use_container_width=True)
        if submit:
            ok, msg = login("lecturer", email, pw)
            if ok:
                st.success(msg)
                st.rerun()
            else:
                st.error(msg)

    # Info demo seed
    with st.expander("ℹ️ Akun demo (untuk uji coba)"):
        try:
            info = seed_summary()
            st.write(
                f"Sudah ada **{info['lecturers']}** dosen, **{info['students']}** mahasiswa, "
                f"**{info['questions']}** soal, **{info['quizzes']}** kuis."
            )
        except Exception:
            pass
        st.markdown(
            """
            **Mahasiswa demo** (12 NIM tersedia, password = NIM):  
            `2401001` (Aisyah), `2401002` (Budi), `2401003` (Cahya), ... s/d `2401012`.

            **Dosen demo:** email `dosen@kampus.ac.id`, password sesuai
            `DEFAULT_LECTURER_PASSWORD` di secrets.

            Setelah login, mahasiswa & dosen wajib mengganti password lewat menu Profil.
            """
        )

    st.markdown(
        """
        <div style="text-align:center; color:#94a3b8; font-size:0.8rem; padding:2rem 0 0;">
          Dibangun untuk PGMI · Mengacu pada Pancasila &amp; UUD 1945
        </div>
        """,
        unsafe_allow_html=True,
    )
