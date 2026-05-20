/**
 * Inisialisasi skema database.
 * Jalankan: npm run db:init
 */
import "dotenv/config";
import { db } from "../src/lib/db";
import { SCHEMA_SQL } from "../src/lib/schema";

async function main() {
  const client = db();
  // Pisahkan per statement, libsql.execute() menerima single statement.
  const statements = SCHEMA_SQL.split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await client.execute(stmt);
  }
  console.log(`[init-db] Skema berhasil dibuat (${statements.length} statement).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("[init-db] Gagal:", err);
  process.exit(1);
});
