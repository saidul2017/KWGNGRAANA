/**
 * Seed database:
 *   - Akun dosen default
 *   - 43 mahasiswa S1 PGMI Kewarganegaraan
 *   - 11 soal contoh (bank soal awal)
 *
 * Idempoten: aman dijalankan berulang kali, tidak akan duplikasi.
 *
 * Jalankan: npm run db:seed
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, get, run, all } from "../src/lib/db";
import { STUDENTS } from "../src/lib/students-data";
import { SEED_QUESTIONS } from "../src/lib/seed-questions";

const LECTURER_EMAIL = process.env.DEFAULT_LECTURER_EMAIL || "dosen@kwgn.id";
const LECTURER_NAME = process.env.DEFAULT_LECTURER_NAME || "Dosen Kewarganegaraan";
const LECTURER_PASSWORD = process.env.DEFAULT_LECTURER_PASSWORD || "kwgn2026";

async function upsertLecturer() {
  const existing = await get<{ id: number }>(
    `SELECT id FROM users WHERE email = ? AND role = 'lecturer' LIMIT 1`,
    [LECTURER_EMAIL]
  );
  if (existing) {
    console.log(`[seed] Dosen sudah ada: ${LECTURER_EMAIL} (id=${existing.id})`);
    return existing.id;
  }
  const hash = await bcrypt.hash(LECTURER_PASSWORD, 10);
  const r = await run(
    `INSERT INTO users (role, email, name, password_hash) VALUES ('lecturer', ?, ?, ?)`,
    [LECTURER_EMAIL, LECTURER_NAME, hash]
  );
  console.log(`[seed] Dosen dibuat: ${LECTURER_EMAIL} (id=${r.lastInsertRowid})`);
  console.log(`        Password awal: ${LECTURER_PASSWORD}`);
  return r.lastInsertRowid;
}

async function upsertStudents() {
  let created = 0;
  let skipped = 0;
  for (const s of STUDENTS) {
    const existing = await get<{ id: number }>(
      `SELECT id FROM users WHERE nim = ? LIMIT 1`,
      [s.nim]
    );
    if (existing) {
      skipped++;
      continue;
    }
    const hash = await bcrypt.hash(s.nim, 10); // password awal = NIM
    await run(
      `INSERT INTO users (role, nim, name, password_hash) VALUES ('student', ?, ?, ?)`,
      [s.nim, s.name, hash]
    );
    created++;
  }
  console.log(`[seed] Mahasiswa: ${created} baru, ${skipped} sudah ada (total target: ${STUDENTS.length}).`);
}

async function upsertQuestions(lecturerId: number) {
  let created = 0;
  let skipped = 0;
  for (const q of SEED_QUESTIONS) {
    const existing = await get<{ id: number }>(
      `SELECT id FROM questions WHERE topic = ? AND text = ? LIMIT 1`,
      [q.topic, q.text]
    );
    if (existing) {
      skipped++;
      continue;
    }
    await run(
      `INSERT INTO questions
        (topic, text, type, options_json, correct_index, explanation, source_ref, difficulty, time_limit, max_points, created_by)
       VALUES (?, ?, 'mcq', ?, ?, ?, ?, ?, ?, 1000, ?)`,
      [
        q.topic,
        q.text,
        JSON.stringify(q.options),
        q.correctIndex,
        q.explanation,
        q.sourceRef,
        q.difficulty,
        q.timeLimit ?? 20,
        lecturerId,
      ]
    );
    created++;
  }
  console.log(`[seed] Soal: ${created} baru, ${skipped} sudah ada.`);
}

async function upsertDemoQuiz(lecturerId: number) {
  const existing = await get<{ id: number }>(
    `SELECT id FROM quizzes WHERE title = ? LIMIT 1`,
    ["Latihan Mandiri: Pengantar PKn"]
  );
  if (existing) {
    console.log(`[seed] Latihan demo sudah ada (id=${existing.id}).`);
    return;
  }
  const r = await run(
    `INSERT INTO quizzes (title, description, kind, mode, status, shuffle, created_by)
     VALUES (?, ?, 'practice', 'individual', 'open', 1, ?)`,
    [
      "Latihan Mandiri: Pengantar PKn",
      "Latihan pemanasan untuk topik Pancasila, UUD 1945, Identitas Nasional, dan Kewarganegaraan. Boleh diulang sebanyak yang Anda mau.",
      lecturerId,
    ]
  );
  const quizId = r.lastInsertRowid;
  // Ambil semua soal dan masukkan ke quiz
  const qRows = await all<{ id: number }>(`SELECT id FROM questions ORDER BY id ASC`);
  for (let i = 0; i < qRows.length; i++) {
    await run(
      `INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES (?, ?, ?)`,
      [quizId, qRows[i].id, i]
    );
  }
  console.log(`[seed] Latihan demo dibuat (id=${quizId}, ${qRows.length} soal, status=OPEN).`);
}

async function main() {
  // Pastikan tabel ada (jalankan init-db dulu, tapi kita guard di sini)
  await db().execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users' LIMIT 1"
  );
  const lecturerId = await upsertLecturer();
  await upsertStudents();
  await upsertQuestions(lecturerId);
  await upsertDemoQuiz(lecturerId);
  console.log("[seed] Selesai.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] Gagal:", err);
  console.error("Pastikan Anda sudah menjalankan: npm run db:init");
  process.exit(1);
});
