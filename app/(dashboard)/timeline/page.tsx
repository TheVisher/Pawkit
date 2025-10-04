"use client";

import useSWR from "swr";
import { TimelineView } from "@/components/timeline/timeline-view";

export default function TimelinePage() {
  const { data } = useSWR("/api/timeline?days=30");

  const groups = data?.groups || [];

  return <TimelineView initialGroups={groups} />;
}
