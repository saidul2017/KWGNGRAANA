import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "lecturer" ? "/lecturer" : "/student");
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <header className="text-center">
          <p className="text-xs uppercase tracking-widest text-brand-600 font-semibold">
            S1 PGMI · Mata Kuliah Kewarganegaraan
          </p>
          <h1 className="mt-3 text-4xl md:text-5xl font-extrabold text-slate-900">
            KWGN <span className="text-brand-600">Learning Hub</span>
          </h1>
          <p className="mt-4 text-slate-600 max-w-2xl mx-auto">
            Belajar Pancasila, UUD 1945, Demokrasi, Bela Negara, dan Wawasan Nusantara
            lewat chatbot, latihan mandiri, dan kuis interaktif gaya Kahoot. Dengan
            penilaian otomatis serta dashboard untuk mahasiswa dan dosen.
          </p>
        </header>

        <section className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="card border-2 border-brand-100">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600 text-xl">🎓</span>
              <h2 className="text-xl font-semibold">Saya Mahasiswa</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Login dengan <strong>NIM</strong> Anda. Password awal sama dengan NIM
              (silakan ubah setelah login pertama).
            </p>
            <Link href="/login?role=student" className="btn-primary mt-5 w-full">
              Masuk sebagai Mahasiswa
            </Link>
          </div>

          <div className="card border-2 border-amber-100">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xl">👨‍🏫</span>
              <h2 className="text-xl font-semibold">Saya Dosen</h2>
            </div>
            <p className="mt-2 text-sm text-slate-600">
              Kelola bank soal, kelompok, jadwal kuis &amp; UAS, dan lihat rekap nilai
              kelas secara otomatis.
            </p>
            <Link href="/login?role=lecturer" className="btn-primary mt-5 w-full bg-amber-600 hover:bg-amber-700 focus:ring-amber-500">
              Masuk sebagai Dosen
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-4 md:grid-cols-4">
          {[
            { icon: "💬", title: "Chatbot PKn", desc: "Tanya konsep, dapat jawaban berdasar UUD 1945, UU & Pancasila." },
            { icon: "🎯", title: "Latihan Mandiri", desc: "Soal interaktif Kahoot-style, feedback langsung, tanpa nilai." },
            { icon: "🏆", title: "Kuis & UAS", desc: "Mode individu/kelompok, timer, leaderboard, penilaian otomatis." },
            { icon: "📊", title: "Dashboard", desc: "Mahasiswa lihat progress, dosen lihat statistik kelas." },
          ].map((f) => (
            <div key={f.title} className="card text-center">
              <div className="text-3xl">{f.icon}</div>
              <h3 className="mt-2 font-semibold">{f.title}</h3>
              <p className="mt-1 text-xs text-slate-600">{f.desc}</p>
            </div>
          ))}
        </section>

        <footer className="mt-16 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} KWGN Learning Hub · Dibangun untuk PGMI ·
          Mengacu pada Pancasila &amp; UUD 1945
        </footer>
      </div>
    </main>
  );
}
