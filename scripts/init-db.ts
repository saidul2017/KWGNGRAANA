/**
 * Inisialisasi skema database + migrasi backward-compatible.
 * Jalankan: npm run db:init
 */
import "dotenv/config";
import { db, all, get } from "../src/lib/db";
import { SCHEMA_SQL } from "../src/lib/schema";

async function main() {
  const client = db();
  const statements = SCHEMA_SQL.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  for (const stmt of statements) {
    await client.execute(stmt);
  }
  console.log(`[init-db] Skema dieksekusi (${statements.length} statement).`);

  // ===== Migrasi: tambah kolom baru jika belum ada =====
  await ensureColumn("questions", "essay_key_points", "TEXT");
  await ensureColumn("questions", "essay_min_words", "INTEGER");
  await ensureColumn("answers", "essay_text", "TEXT");
  await ensureColumn("answers", "ai_feedback", "TEXT");
  // Override manual oleh dosen
  await ensureColumn("answers", "original_score", "INTEGER");
  await ensureColumn("answers", "lecturer_note", "TEXT");
  await ensureColumn("answers", "reviewed_at", "TEXT");

  // ===== Migrasi: jika CHECK lama (tanpa 'essay') masih ada, recreate questions =====
  await migrateQuestionsTypeCheck();

  console.log("[init-db] Selesai.");
  process.exit(0);
}

async function ensureColumn(table: string, column: string, type: string) {
  const cols = await all<{ name: string }>(`PRAGMA table_info(${table})`);
  if (cols.some((c) => c.name === column)) return;
  await db().execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  console.log(`[init-db] +ALTER ${table} ADD ${column} ${type}`);
}

async function migrateQuestionsTypeCheck() {
  const row = await get<{ sql: string }>(
    `SELECT sql FROM sqlite_master WHERE type='table' AND name='questions'`
  );
  if (!row) return;
  // Jika CREATE TABLE sudah memuat 'essay', tidak perlu apa-apa.
  if (row.sql.includes("'essay'")) return;
  console.log("[init-db] Migrasi: recreate tabel `questions` agar mendukung type='essay'");

  const client = db();
  await client.execute("PRAGMA foreign_keys = OFF");
  await client.execute("BEGIN");
  try {
    await client.execute(`
      CREATE TABLE questions_new (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        topic         TEXT    NOT NULL,
        text          TEXT    NOT NULL,
        type          TEXT    NOT NULL DEFAULT 'mcq' CHECK (type IN ('mcq','tf','essay')),
        options_json  TEXT    NOT NULL,
        correct_index INTEGER NOT NULL,
        explanation   TEXT,
        source_ref    TEXT,
        difficulty    TEXT    NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
        time_limit    INTEGER NOT NULL DEFAULT 20,
        max_points    INTEGER NOT NULL DEFAULT 1000,
        essay_key_points TEXT,
        essay_min_words  INTEGER,
        created_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await client.execute(`
      INSERT INTO questions_new
        (id, topic, text, type, options_json, correct_index, explanation,
         source_ref, difficulty, time_limit, max_points,
         essay_key_points, essay_min_words, created_by, created_at)
      SELECT
        id, topic, text, type, options_json, correct_index, explanation,
        source_ref, difficulty, time_limit, max_points,
        essay_key_points, essay_min_words, created_by, created_at
      FROM questions
    `);
    await client.execute(`DROP TABLE questions`);
    await client.execute(`ALTER TABLE questions_new RENAME TO questions`);
    await client.execute("COMMIT");
    console.log("[init-db] Migrasi questions selesai.");
  } catch (err) {
    await client.execute("ROLLBACK").catch(() => null);
    throw err;
  } finally {
    await client.execute("PRAGMA foreign_keys = ON");
  }
}

main().catch((err) => {
  console.error("[init-db] Gagal:", err);
  process.exit(1);
});
