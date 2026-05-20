import { requireUser } from "@/lib/session";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function StudentProfilePage() {
  const user = await requireUser("student");
  return (
    <div className="max-w-md mx-auto space-y-5">
      <header>
        <h1 className="text-2xl font-bold">👤 Profil Saya</h1>
        <p className="text-sm text-slate-600">Kelola akun Anda.</p>
      </header>
      <div className="card space-y-2">
        <div className="text-sm">
          <span className="text-slate-500">Nama:</span>{" "}
          <strong>{user.name}</strong>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">NIM:</span>{" "}
          <strong className="font-mono">{user.nim}</strong>
        </div>
      </div>
      <div className="card">
        <h2 className="font-semibold mb-3">🔑 Ganti Password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
