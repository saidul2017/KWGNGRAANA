import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KWGN — Sistem Pembelajaran Kewarganegaraan PGMI",
  description:
    "Chatbot, latihan mandiri, kuis & UAS gaya Kahoot dengan penilaian otomatis untuk mata kuliah Kewarganegaraan PGMI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
