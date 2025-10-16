import { HelpCircle } from "lucide-react";

export default function HelpPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
          <HelpCircle className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Help</h1>
          <p className="text-sm text-muted-foreground">
            Need assistance? Documentation and support resources will be linked from here soon. For now, reach out to the team directly.
          </p>
        </div>
      </div>
    </div>
  );
}
