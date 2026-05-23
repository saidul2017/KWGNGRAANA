"""Manajemen kelompok mahasiswa."""
import streamlit as st

from lib import auth, db

auth.require_role("lecturer")

st.title("👥 Kelompok")
st.caption("Bagi mahasiswa ke kelompok untuk kuis/UAS kolaboratif. Skor kelompok = rata-rata anggota aktif.")

c1, c2 = st.columns(2)

# ===== Buat & daftar kelompok =====
with c1:
    st.subheader("Daftar Kelompok")
    with st.form("new_group", clear_on_submit=True):
        new_name = st.text_input("Nama kelompok baru", placeholder="Mis. Kelompok Pancasila")
        if st.form_submit_button("➕ Tambah Kelompok"):
            n = new_name.strip()
            if not n:
                st.warning("Nama tidak boleh kosong.")
            else:
                try:
                    db.execute("INSERT INTO groups (name) VALUES (?)", (n,))
                    st.success(f"Kelompok '{n}' dibuat.")
                    st.rerun()
                except Exception as e:
                    st.error(f"Gagal: {e}")

    groups = db.query_all(
        """SELECT g.id, g.name,
                  (SELECT COUNT(*) FROM users u WHERE u.group_id=g.id AND u.role='student') AS member_count
           FROM groups g ORDER BY g.name"""
    )
    if not groups:
        st.info("Belum ada kelompok.")
    else:
        for g in groups:
            row = st.columns([3, 1, 1])
            row[0].write(f"**{g['name']}**")
            row[1].caption(f"{g['member_count']} anggota")
            if row[2].button("🗑️", key=f"del_g_{g['id']}", help="Hapus kelompok"):
                db.execute("DELETE FROM groups WHERE id=?", (g["id"],))
                st.rerun()

# ===== Penugasan mahasiswa =====
with c2:
    st.subheader("Penugasan Mahasiswa")
    st.caption("Pilih kelompok di samping nama tiap mahasiswa.")
    students = db.query_all(
        "SELECT id, nim, name, group_id FROM users WHERE role='student' ORDER BY nim"
    )
    group_options = {0: "— Tanpa kelompok —"}
    for g in groups:
        group_options[g["id"]] = g["name"]

    # Form batch agar tidak rerun tiap pilihan
    with st.form("assign_groups"):
        new_assignments: dict[int, int] = {}
        for s in students:
            row = st.columns([2, 3])
            row[0].write(f"**{s['name']}**  \n`{s['nim']}`")
            current = s["group_id"] or 0
            new_assignments[s["id"]] = row[1].selectbox(
                "Kelompok",
                options=list(group_options.keys()),
                format_func=lambda x: group_options[x],
                index=list(group_options.keys()).index(current),
                key=f"sel_{s['id']}",
                label_visibility="collapsed",
            )
        if st.form_submit_button("💾 Simpan Penugasan", type="primary"):
            updated = 0
            for sid, gid in new_assignments.items():
                target = gid if gid != 0 else None
                db.execute("UPDATE users SET group_id=? WHERE id=?", (target, sid))
                updated += 1
            st.success(f"Tersimpan: {updated} mahasiswa.")
            st.rerun()
