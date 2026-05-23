"""Auth: hash password (bcrypt) + helper session_state Streamlit.

Catatan tentang model session di Streamlit:
- Tidak pakai cookie HTTP-only seperti Next.js. Auth state ada di
  st.session_state, yang di-keep per WebSocket connection oleh Streamlit.
- Akibatnya: refresh tab = tetap login (karena WS yang sama), tapi buka
  tab baru = login lagi. Cukup memadai untuk konteks pembelajaran kelas.
- Untuk auth lintas tab/persistent, butuh komponen pihak ke-3 (mis.
  streamlit-authenticator + cookie). Sengaja TIDAK dipakai supaya app
  tetap minimal dependency untuk Streamlit Community Cloud.
"""

from __future__ import annotations

from typing import Optional

import bcrypt
import streamlit as st

from .db import get_

ROUNDS = 10  # bcrypt cost — 10 sudah cukup di tier gratis Streamlit


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(ROUNDS)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verifikasi password. Return False kalau hash format rusak (tidak crash)."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def login(role: str, identifier: str, password: str) -> tuple[bool, str]:
    """Coba login. Return (success, message)."""
    if role not in ("student", "lecturer"):
        return False, "Peran tidak valid"
    if not identifier or not password:
        return False, "NIM/email & password wajib diisi"

    if role == "student":
        user = get_(
            "SELECT id, role, name, nim, email, password_hash, group_id "
            "FROM users WHERE role='student' AND nim = ? LIMIT 1",
            [identifier.strip()],
        )
    else:
        user = get_(
            "SELECT id, role, name, nim, email, password_hash, group_id "
            "FROM users WHERE role='lecturer' AND email = ? LIMIT 1",
            [identifier.strip().lower()],
        )

    # Selalu jalankan verify (meski user None) supaya timing lebih konsisten,
    # mencegah user enumeration. Hash dummy hasil bcrypt valid 60 char.
    DUMMY = "$2b$10$EXg9TWCWO6vpUBBWo2qAIuB2a/GQ1epB7V5AB242SLnKYzNwd/5aW"
    ok = verify_password(password, user["password_hash"] if user else DUMMY)

    if not user or not ok:
        msg = "NIM atau password salah" if role == "student" else "Email atau password salah"
        return False, msg

    # Set session state. Tidak simpan password_hash supaya tidak bocor di replay.
    st.session_state["user"] = {
        "id": user["id"],
        "role": user["role"],
        "name": user["name"],
        "nim": user.get("nim"),
        "email": user.get("email"),
        "group_id": user.get("group_id"),
    }
    return True, f"Selamat datang, {user['name']}!"


def logout() -> None:
    """Bersihkan semua state user; biarkan state lain (mis. theme)."""
    for k in ("user", "play_state", "live_state"):
        if k in st.session_state:
            del st.session_state[k]


def current_user() -> Optional[dict]:
    return st.session_state.get("user")


def require_user(role: str | None = None) -> dict:
    """Dipanggil di awal page; akan st.stop() kalau tidak login / role salah."""
    user = current_user()
    if not user:
        st.error("Anda harus login dulu.")
        st.stop()
    if role and user["role"] != role:
        st.error(f"Halaman ini hanya untuk peran '{role}'.")
        st.stop()
    return user


def change_password(user_id: int, old: str, new: str) -> tuple[bool, str]:
    if len(new) < 6:
        return False, "Password baru minimal 6 karakter"
    row = get_("SELECT password_hash FROM users WHERE id = ?", [user_id])
    if not row or not verify_password(old, row["password_hash"]):
        return False, "Password lama salah"
    from .db import run_

    run_(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        [hash_password(new), user_id],
    )
    return True, "Password berhasil diubah"
