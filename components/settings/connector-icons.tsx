import { Cloud, Calendar, HardDrive } from "lucide-react";

// Filen Icon - E2E encrypted cloud storage
export function FilenIcon({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Cloud className="h-6 w-6 text-purple-400" />
    </div>
  );
}

// Google Calendar Icon
export function GoogleCalendarIcon({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Calendar className="h-6 w-6 text-blue-400" />
    </div>
  );
}

// Google Drive Icon
export function GoogleDriveIcon({ className }: { className?: string }) {
  return (
    <div className={className}>
      <HardDrive className="h-6 w-6 text-green-400" />
    </div>
  );
}
