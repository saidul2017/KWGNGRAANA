"""Skema SQL — kompatibel dengan versi Next.js sebelumnya."""

SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS groups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  role          TEXT    NOT NULL CHECK (role IN ('student','lecturer')),
  nim           TEXT    UNIQUE,
  email         TEXT    UNIQUE,
  name          TEXT    NOT NULL,
  password_hash TEXT    NOT NULL,
  group_id      INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS questions (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  topic            TEXT    NOT NULL,
  text             TEXT    NOT NULL,
  type             TEXT    NOT NULL DEFAULT 'mcq' CHECK (type IN ('mcq','tf','essay')),
  options_json     TEXT    NOT NULL,
  correct_index    INTEGER NOT NULL,
  explanation      TEXT,
  source_ref       TEXT,
  difficulty       TEXT    NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  time_limit       INTEGER NOT NULL DEFAULT 20,
  max_points       INTEGER NOT NULL DEFAULT 1000,
  essay_key_points TEXT,
  essay_min_words  INTEGER,
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quizzes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT,
  kind        TEXT    NOT NULL CHECK (kind IN ('practice','quiz','uas')),
  mode        TEXT    NOT NULL DEFAULT 'individual' CHECK (mode IN ('individual','group')),
  status      TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed')),
  shuffle     INTEGER NOT NULL DEFAULT 1,
  starts_at   TEXT,
  ends_at     TEXT,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quiz_questions (
  quiz_id     INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL,
  PRIMARY KEY (quiz_id, question_id)
);
CREATE INDEX IF NOT EXISTS idx_qq_quiz ON quiz_questions(quiz_id, position);

CREATE TABLE IF NOT EXISTS attempts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id         INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id        INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  total_score     INTEGER NOT NULL DEFAULT 0,
  total_correct   INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  status          TEXT    NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed')),
  started_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  finished_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON attempts(quiz_id);

CREATE TABLE IF NOT EXISTS answers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  attempt_id     INTEGER NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id    INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  selected_index INTEGER,
  essay_text     TEXT,
  ai_feedback    TEXT,
  is_correct     INTEGER NOT NULL DEFAULT 0,
  response_ms    INTEGER NOT NULL DEFAULT 0,
  score_awarded  INTEGER NOT NULL DEFAULT 0,
  original_score INTEGER,
  lecturer_note  TEXT,
  reviewed_at    TEXT,
  answered_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_answers_attempt ON answers(attempt_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT    NOT NULL CHECK (role IN ('user','assistant')),
  content    TEXT    NOT NULL,
  topic      TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id, created_at);
"""
