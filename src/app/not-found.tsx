import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full card text-center space-y-4">
        <div className="text-6xl font-extrabold text-brand-700">404</div>
        <h1 className="text-2xl font-bold">Halaman Tidak Ditemukan</h1>
        <p className="text-sm text-slate-600">
          URL yang Anda akses tidak ada di KWGN Learning Hub. Mungkin sudah dipindah atau salah ketik.
        </p>
        <div className="flex gap-2 justify-center">
          <Link href="/" className="btn-primary">Beranda</Link>
          <Link href="/login" className="btn-ghost">Login</Link>
        </div>
      </div>
    </div>
  );
}
