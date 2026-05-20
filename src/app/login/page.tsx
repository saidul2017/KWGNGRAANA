import LoginForm from "./LoginForm";
import Link from "next/link";

export default function LoginPage({
  searchParams,
}: {
  searchParams?: { role?: string };
}) {
  const initialRole = searchParams?.role === "lecturer" ? "lecturer" : "student";
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-indigo-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="text-sm text-slate-500 hover:underline">← Kembali</Link>
          <h1 className="mt-2 text-2xl font-bold">Masuk ke KWGN Learning Hub</h1>
          <p className="text-sm text-slate-600">
            Sistem Pembelajaran Kewarganegaraan PGMI
          </p>
        </div>
        <div className="card">
          <LoginForm initialRole={initialRole} />
        </div>
        <p className="mt-4 text-center text-xs text-slate-500">
          Mahasiswa: login dengan NIM (password awal = NIM).
          <br />
          Dosen: login dengan email yang telah didaftarkan.
        </p>
      </div>
    </main>
  );
}
