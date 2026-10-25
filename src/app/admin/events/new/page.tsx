import { requireTeam } from "@/lib/admin";
import NotTeam from "@/components/NotTeam";
import EventForm from "@/components/admin/EventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const { isTeam } = await requireTeam("/admin/events/new");
  if (!isTeam) return <NotTeam />;
  return <div className="wrap page stack"><div className="eyebrow">Kleros team</div><h1>Add an event</h1><EventForm /></div>;
}
