"""Autentikasi sederhana untuk Streamlit.
- Password di-hash dengan PBKDF2-SHA256 (pure-Python, tidak perlu compile C)
- User session disimpan di st.session_state['user']
- Helper require_login() & require_role() dipanggil di awal setiap halaman
"""
from __future__ import annotations

import hashlib
import os
import secrets

import streamlit as st

from . import db

# Format hash: pbkdf2$iterations$salt_hex$hash_hex
_ITERATIONS = 260_000  # OWASP recommendation for PBKDF2-SHA256


def hash_password(plain: str) -> str:
    """Hash password dengan PBKDF2-SHA256. Return string format internal."""
    salt = os.urandom(16)
    h = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, _ITERATIONS)
    return f"pbkdf2${_ITERATIONS}${salt.hex()}${h.hex()}"


def verify_password(plain: str, hashed: str) -> bool:
    """Verifikasi password terhadap hash. Mendukung format pbkdf2 dan bcrypt legacy."""
    if not hashed:
        return False
    try:
        # Format baru: pbkdf2$iterations$salt_hex$hash_hex
        if hashed.startswith("pbkdf2$"):
            parts = hashed.split("$")
            if len(parts) != 4:
                return False
            _, iters_str, salt_hex, hash_hex = parts
            iters = int(iters_str)
            salt = bytes.fromhex(salt_hex)
            expected = bytes.fromhex(hash_hex)
            actual = hashlib.pbkdf2_hmac("sha256", plain.encode("utf-8"), salt, iters)
            return secrets.compare_digest(actual, expected)
        # Legacy bcrypt format ($2b$... atau $2a$...) — fallback import
        elif hashed.startswith("$2"):
            try:
                import bcrypt as _bcrypt
                return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
            except ImportError:
                # bcrypt tidak tersedia — tidak bisa verifikasi legacy hash
                return False
        else:
            return False
    except (ValueError, UnicodeDecodeError, Exception):
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

    # Selalu jalankan verify agar timing relatif konstan
    DUMMY = hash_password("dummy_constant_time_padding")
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
    for k in ("user", "current_attempt_id", "answer_state", "chat_history",
              "play_quiz_id", "play_state", "play_questions", "play_index",
              "play_attempt_id", "play_started_at", "play_total_score",
              "play_total_correct", "play_last_result"):
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
