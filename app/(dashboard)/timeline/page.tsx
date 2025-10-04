import { getTimelineCards } from "@/lib/server/cards";
import { TimelineView } from "@/components/timeline/timeline-view";
import { requireUser } from "@/lib/auth/get-user";

export default async function TimelinePage() {
  const user = await requireUser();
  const groups = await getTimelineCards(user.id, 30);

  return <TimelineView initialGroups={groups} />;
}
