import { getTimelineCards } from "@/lib/server/cards";
import { TimelineView } from "@/components/timeline/timeline-view";

export default async function TimelinePage() {
  const groups = await getTimelineCards(30);

  return <TimelineView initialGroups={groups} />;
}
