import { SettingsPanel } from "@/components/settings/settings-panel";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <Settings className="h-5 w-5 text-accent" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
      </div>
      <SettingsPanel />
    </div>
  );
}
