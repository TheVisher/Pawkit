"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Sun, Moon, Coffee } from "lucide-react";

interface HomeHeaderProps {
  userName?: string | null;
}

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours();

  if (hour < 12) {
    return { text: "Good morning", icon: Coffee };
  } else if (hour < 17) {
    return { text: "Good afternoon", icon: Sun };
  } else {
    return { text: "Good evening", icon: Moon };
  }
}

export function HomeHeader({ userName }: HomeHeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [greeting, setGreeting] = useState(getGreeting);

  useEffect(() => {
    setMounted(true);
    setGreeting(getGreeting());
  }, []);

  const today = new Date();
  const formattedDate = format(today, "EEEE, MMMM d");
  const GreetingIcon = greeting.icon;

  if (!mounted) {
    return (
      <div className="mb-5">
        <div className="flex items-center gap-1.5 text-zinc-500 text-xs mb-0.5">
          <div className="w-3.5 h-3.5" />
          <span>{formattedDate}</span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground">
          Welcome back
        </h1>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
        <GreetingIcon className="w-3.5 h-3.5" />
        <span>{formattedDate}</span>
      </div>
      <h1 className="text-2xl font-semibold text-foreground">
        {greeting.text}
        {userName && (
          <>
            , <span className="text-accent">{userName}</span>
          </>
        )}
      </h1>
    </div>
  );
}
