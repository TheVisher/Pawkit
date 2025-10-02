import { SettingsPanel } from "@/components/settings/settings-panel";

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold text-gray-100">Settings</h1>
      <SettingsPanel />
    </div>
  );
}
