import { redirect } from "next/navigation";
import PlayerUI from "./PlayerUI";
import { requireUser } from "@/lib/session";
import { getSession } from "@/lib/live-store";

export const dynamic = "force-dynamic";

export default async function PlayerLivePage({ params }: { params: { pin: string } }) {
  const user = await requireUser("student");
  const session = getSession(params.pin);
  if (!session) {
    redirect(`/student/live?error=${encodeURIComponent("Sesi tidak ditemukan / sudah berakhir.")}`);
  }
  // Belum bergabung? Tendang kembali ke halaman join.
  if (!session.players[user.id]) {
    redirect(`/student/live?pin=${params.pin}`);
  }
  return <PlayerUI pin={params.pin} userName={user.name} />;
}
