import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { get, run } from "@/lib/db";
import { requireUser, AuthError } from "@/lib/session";

type RowResult =
  | { ok: true; row: number; topic: string; text: string; action: "created" | "skipped" }
  | { ok: false; row: number; error: string };

/**
 * POST /api/questions/import (multipart/form-data, field "file")
 *
 * Membaca .xlsx, sheet pertama, kolom: topic, text, optionA..F, correct (A..F),
 * explanation, sourceRef, difficulty (easy/medium/hard), timeLimit, maxPoints.
 *
 * Idempoten: kombinasi (topic, text) yang sama tidak akan diduplikasi.
 */
export async function POST(req: Request) {
  let user;
  try {
    user = await requireUser("lecturer");
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.code }, { status: 401 });
    throw e;
  }

  let buf: ArrayBuffer;
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Field 'file' tidak ditemukan" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File terlalu besar (>5MB)" }, { status: 400 });
    }
    buf = await file.arrayBuffer();
  } catch {
    return NextResponse.json({ error: "Gagal membaca file" }, { status: 400 });
  }

  let rows: Record<string, unknown>[];
  try {
    const wb = XLSX.read(new Uint8Array(buf), { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) throw new Error("Tidak ada sheet");
    const sheet = wb.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  } catch {
    return NextResponse.json({ error: "Format file tidak valid (bukan .xlsx?)" }, { status: 400 });
  }

  const results: RowResult[] = [];
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const rowNum = i + 2; // +1 header, +1 1-indexed
    try {
      const topic = String(r.topic ?? "").trim();
      const text = String(r.text ?? "").trim();
      if (!topic || !text) {
        results.push({ ok: false, row: rowNum, error: "topic atau text kosong" });
        continue;
      }
      const opts: string[] = [];
      for (const k of ["optionA", "optionB", "optionC", "optionD", "optionE", "optionF"]) {
        const v = String(r[k] ?? "").trim();
        if (v) opts.push(v);
      }
      if (opts.length < 2) {
        results.push({ ok: false, row: rowNum, error: "minimal 2 opsi (optionA, optionB)" });
        continue;
      }
      const correctLetter = String(r.correct ?? "").trim().toUpperCase();
      const correctIndex = "ABCDEF".indexOf(correctLetter);
      if (correctIndex < 0 || correctIndex >= opts.length) {
        results.push({ ok: false, row: rowNum, error: `correct ('${correctLetter}') di luar jangkauan opsi` });
        continue;
      }
      const explanation = String(r.explanation ?? "").trim();
      const sourceRef = String(r.sourceRef ?? "").trim();
      const difficulty = (() => {
        const d = String(r.difficulty ?? "medium").trim().toLowerCase();
        return ["easy", "medium", "hard"].includes(d) ? d : "medium";
      })() as "easy" | "medium" | "hard";
      const timeLimit = Math.max(5, Math.min(180, Number(r.timeLimit) || 20));
      const maxPoints = Math.max(100, Math.min(2000, Number(r.maxPoints) || 1000));

      // Idempoten cek
      const existing = await get<{ id: number }>(
        `SELECT id FROM questions WHERE topic = ? AND text = ? LIMIT 1`,
        [topic, text]
      );
      if (existing) {
        skipped++;
        results.push({ ok: true, row: rowNum, topic, text, action: "skipped" });
        continue;
      }
      await run(
        `INSERT INTO questions
          (topic, text, type, options_json, correct_index, explanation, source_ref, difficulty, time_limit, max_points, created_by)
         VALUES (?, ?, 'mcq', ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          topic,
          text,
          JSON.stringify(opts),
          correctIndex,
          explanation,
          sourceRef,
          difficulty,
          timeLimit,
          maxPoints,
          user.id,
        ]
      );
      created++;
      results.push({ ok: true, row: rowNum, topic, text, action: "created" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ ok: false, row: rowNum, error: msg });
    }
  }

  return NextResponse.json({
    ok: true,
    summary: { totalRows: rows.length, created, skipped, errors: results.filter((r) => !r.ok).length },
    results,
  });
}
