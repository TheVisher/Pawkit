"use client";

import { TodosSection } from "./todos-section";

export function HomeControls() {
  return (
    <>
      {/* Todos Section - Always at top */}
      <TodosSection />

      {/* Future: Home-specific sections like stats, tips, etc. can be added here */}
    </>
  );
}
