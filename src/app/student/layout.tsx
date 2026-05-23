import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import Navbar from "@/components/Navbar";

// Layout ini bergantung pada cookie session di setiap request → harus dynamic.
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/student", label: "Beranda", icon: "🏠" },
  { href: "/student/live", label: "Live Kahoot", icon: "🎮" },
  { href: "/student/practice", label: "Latihan Mandiri", icon: "🎯" },
  { href: "/student/quizzes", label: "Kuis & UAS", icon: "🏆" },
  { href: "/student/chatbot", label: "Chatbot PKn", icon: "💬" },
  { href: "/student/results", label: "Nilai Saya", icon: "📊" },
  { href: "/student/profile", label: "Profil", icon: "👤" },
];

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?role=student");
  if (user.role !== "student") redirect("/lecturer");

  return (
    <div className="min-h-screen">
      <Navbar
        user={user}
        items={NAV}
        brandHref="/student"
        brandLabel="KWGN · Mahasiswa"
      />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
