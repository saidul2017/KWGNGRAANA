"""Autentikasi sederhana untuk Streamlit.
- Password di-hash bcrypt
- User session disimpan di st.session_state['user']
- Helper require_login() & require_role() dipanggil di awal setiap halaman
"""
from __future__ import annotations

import bcrypt
import streamlit as st

from . import db


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=10)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    if not hashed:
        return False
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, UnicodeDecodeError):
        return False


def login(role: str, identifier: str, password: str) -> tuple[bool, str]:
    """Cari user & verifikasi password. Pesan error generik (tidak leak enumeration)."""
    identifier = identifier.strip()
    if role == "student":
        row = db.query_one(
            "SELECT id, role, name, nim, email, password_hash, group_id "
            "FROM users WHERE role='student' AND nim = ? LIMIT 1",
            (identifier,),
        )
    else:
        row = db.query_one(
            "SELECT id, role, name, nim, email, password_hash, group_id "
            "FROM users WHERE role='lecturer' AND email = ? LIMIT 1",
            (identifier.lower(),),
        )

    # Selalu jalankan bcrypt agar timing relatif konstan
    DUMMY = "$2b$10$abcdefghijklmnopqrstuv0123456789ABCDEFGHIJKLMNOPQRSTUV"
    target_hash = row["password_hash"] if row else DUMMY
    ok = verify_password(password, target_hash)

    if not row or not ok:
        return False, ("NIM atau password salah" if role == "student" else "Email atau password salah")

    st.session_state["user"] = {
        "id": row["id"],
        "role": row["role"],
        "name": row["name"],
        "nim": row["nim"],
        "email": row["email"],
        "group_id": row["group_id"],
    }
    return True, ""


def logout() -> None:
    for k in ("user", "current_attempt_id", "answer_state", "chat_history"):
        st.session_state.pop(k, None)


def current_user() -> dict | None:
    return st.session_state.get("user")


def require_login() -> dict:
    user = current_user()
    if not user:
        st.error("⚠️ Anda harus login dulu.")
        st.stop()
    return user


def require_role(role: str) -> dict:
    user = require_login()
    if user["role"] != role:
        st.error(f"⚠️ Halaman ini hanya untuk {role}. Anda login sebagai {user['role']}.")
        st.stop()
    return user


def change_password(user_id: int, current_pw: str, new_pw: str) -> tuple[bool, str]:
    if len(new_pw) < 8:
        return False, "Password baru minimal 8 karakter"
    if current_pw == new_pw:
        return False, "Password baru harus berbeda dari password lama"

    row = db.query_one("SELECT password_hash FROM users WHERE id = ?", (user_id,))
    if not row:
        return False, "User tidak ditemukan"
    if not verify_password(current_pw, row["password_hash"]):
        return False, "Password lama salah"

    db.execute("UPDATE users SET password_hash = ? WHERE id = ?", (hash_password(new_pw), user_id))
    return True, ""
