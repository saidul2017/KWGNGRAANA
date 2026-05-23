"""Halaman profil — bisa untuk mahasiswa & dosen. Berisi info & ganti password."""
import streamlit as st

from lib import auth

user = auth.require_login()

st.title("👤 Profil")
st.markdown("---")

c1, c2 = st.columns(2)
with c1:
    st.subheader("Informasi Akun")
    st.write(f"**Nama:** {user['name']}")
    if user["role"] == "student":
        st.write(f"**NIM:** `{user['nim']}`")
    else:
        st.write(f"**Email:** {user['email']}")
    st.write(f"**Peran:** {user['role'].title()}")

with c2:
    st.subheader("🔑 Ganti Password")
    with st.form("change_pw"):
        cur_pw = st.text_input("Password Saat Ini", type="password")
        new_pw = st.text_input("Password Baru (min 8 karakter)", type="password")
        confirm = st.text_input("Konfirmasi Password Baru", type="password")
        submit = st.form_submit_button("💾 Ubah Password", type="primary")
        if submit:
            if new_pw != confirm:
                st.error("Konfirmasi tidak cocok.")
            elif len(new_pw) < 8:
                st.error("Password baru minimal 8 karakter.")
            else:
                ok, msg = auth.change_password(user["id"], cur_pw, new_pw)
                if ok:
                    st.success("✅ Password berhasil diubah. Gunakan password baru pada login berikutnya.")
                else:
                    st.error(msg)
