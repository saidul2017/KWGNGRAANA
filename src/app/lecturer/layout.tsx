import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import Navbar from "@/components/Navbar";

const NAV = [
  { href: "/lecturer", label: "Ringkasan", icon: "📊" },
  { href: "/lecturer/questions", label: "Bank Soal", icon: "📝" },
  { href: "/lecturer/quizzes", label: "Kuis & UAS", icon: "🏆" },
  { href: "/lecturer/groups", label: "Kelompok", icon: "👥" },
  { href: "/lecturer/students", label: "Mahasiswa", icon: "🎓" },
  { href: "/lecturer/results", label: "Nilai Kelas", icon: "📈" },
  { href: "/lecturer/profile", label: "Profil", icon: "👤" },
];

export default async function LecturerLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=lecturer");
  if (user.role !== "lecturer") redirect("/student");

  return (
    <div className="min-h-screen">
      <Navbar
        user={user}
        items={NAV}
        brandHref="/lecturer"
        brandLabel="KWGN · Dosen"
      />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
