import { requireUser } from "@/lib/session";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function LecturerProfilePage() {
  const user = await requireUser("lecturer");
  return (
    <div className="max-w-md mx-auto space-y-5">
      <header>
        <h1 className="text-2xl font-bold">👤 Profil Dosen</h1>
        <p className="text-sm text-slate-600">Kelola akun Anda.</p>
      </header>
      <div className="card space-y-2">
        <div className="text-sm">
          <span className="text-slate-500">Nama:</span>{" "}
          <strong>{user.name}</strong>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">Email:</span>{" "}
          <strong>{user.email}</strong>
        </div>
      </div>
      <div className="card">
        <h2 className="font-semibold mb-3">🔑 Ganti Password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
