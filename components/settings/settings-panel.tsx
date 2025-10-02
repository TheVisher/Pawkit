"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useSettingsStore } from "@/lib/hooks/settings-store";

export function SettingsPanel() {
  const autoFetchMetadata = useSettingsStore((state) => state.autoFetchMetadata);
  const showThumbnails = useSettingsStore((state) => state.showThumbnails);
  const previewServiceUrl = useSettingsStore((state) => state.previewServiceUrl);
  const setAutoFetchMetadata = useSettingsStore((state) => state.setAutoFetchMetadata);
  const setShowThumbnails = useSettingsStore((state) => state.setShowThumbnails);
  const setPreviewServiceUrl = useSettingsStore((state) => state.setPreviewServiceUrl);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleExport = async () => {
    const response = await fetch("/api/import");
    if (!response.ok) {
      setMessage("Failed to export data");
      return;
    }
    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bookmark-export-${new Date().toISOString()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setMessage("Exported data");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const payload = JSON.parse(text);
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setMessage(body.message || "Failed to import data");
        return;
      }
      const result = await response.json();
      setMessage(
        `Import complete — ${result.createdCards} created, ${result.updatedCards} updated, ${result.createdCollections} collections created, ${result.updatedCollections} collections updated.`
      );
    } catch (error) {
      setMessage("Invalid JSON file");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClear = async () => {
    const confirmed = window.confirm("Delete all cards and collections?");
    if (!confirmed) return;
    const response = await fetch("/api/admin/clear", { method: "POST" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setMessage(body.message || "Failed to clear data");
      return;
    }
    setMessage("All data cleared");
  };

  return (
    <div className="space-y-6 text-sm text-gray-200">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-100">Preferences</h2>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={autoFetchMetadata}
            onChange={(event) => setAutoFetchMetadata(event.target.checked)}
          />
          Auto-fetch metadata from preview service
        </label>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={showThumbnails}
            onChange={(event) => setShowThumbnails(event.target.checked)}
          />
          Show thumbnails in card views
        </label>
        <div>
          <label className="mb-1 block text-xs text-gray-500" htmlFor="preview-url">
            Preview service URL (must contain {{url}} token)
          </label>
          <input
            id="preview-url"
            value={previewServiceUrl}
            onChange={(event) => setPreviewServiceUrl(event.target.value)}
            className="w-full rounded border border-gray-800 bg-gray-900 p-2"
          />
        </div>
      </section>
      <section id="data" className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-100">Data</h2>
        <div className="flex flex-wrap gap-3">
          <button className="rounded bg-gray-900 px-4 py-2" onClick={handleExport}>
            Export JSON
          </button>
          <label className="rounded bg-gray-900 px-4 py-2">
            Import JSON
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImport} />
          </label>
          <button className="rounded bg-rose-500 px-4 py-2 text-gray-950" onClick={handleClear}>
            Clear data
          </button>
        </div>
      </section>
      {message && <p className="text-xs text-gray-400">{message}</p>}
    </div>
  );
}
