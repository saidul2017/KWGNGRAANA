import JoinLiveForm from "./JoinLiveForm";

export default function JoinLivePage({
  searchParams,
}: {
  searchParams?: { pin?: string; error?: string };
}) {
  return (
    <div className="max-w-md mx-auto space-y-4">
      <header className="text-center">
        <div className="text-5xl">🎮</div>
        <h1 className="text-2xl font-bold mt-2">Gabung Sesi Live Kahoot</h1>
        <p className="text-sm text-slate-600">
          Masukkan PIN 6 digit yang ditampilkan dosen di layar kelas.
        </p>
      </header>
      <div className="card">
        <JoinLiveForm initialPin={searchParams?.pin ?? ""} initialError={searchParams?.error} />
      </div>
    </div>
  );
}
