import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getSession } from "@/lib/live-store";
import HostUI from "./HostUI";

export const dynamic = "force-dynamic";

export default async function HostPage({ params }: { params: { pin: string } }) {
  const user = await requireUser("lecturer");
  const session = getSession(params.pin);
  if (!session || session.hostId !== user.id) return notFound();

  return (
    <HostUI
      pin={params.pin}
      quizTitle={session.quizTitle}
      totalQuestions={session.questions.length}
    />
  );
}
