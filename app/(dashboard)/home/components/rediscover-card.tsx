"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, History, ChevronDown } from "lucide-react";
import { CardModel } from "@/lib/types";

type RediscoverPeriod = "2weeks" | "1month" | "2months" | "3months" | "6months";

const PERIOD_OPTIONS: { value: RediscoverPeriod; label: string; days: number }[] = [
  { value: "2weeks", label: "2 weeks", days: 14 },
  { value: "1month", label: "1 month", days: 30 },
  { value: "2months", label: "2 months", days: 60 },
  { value: "3months", label: "3 months", days: 90 },
  { value: "6months", label: "6 months", days: 180 },
];

const STORAGE_KEY = "pawkit-rediscover-period";

interface RediscoverCardProps {
  allCards: CardModel[];
}

export function RediscoverCard({ allCards }: RediscoverCardProps) {
  const router = useRouter();
  const [period, setPeriod] = useState<RediscoverPeriod>("2months");
  const [showDropdown, setShowDropdown] = useState(false);

  // Load saved period from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && PERIOD_OPTIONS.some(o => o.value === saved)) {
      setPeriod(saved as RediscoverPeriod);
    }
  }, []);

  // Save period to localStorage
  const handlePeriodChange = (newPeriod: RediscoverPeriod) => {
    setPeriod(newPeriod);
    localStorage.setItem(STORAGE_KEY, newPeriod);
    setShowDropdown(false);
  };

  // Calculate items based on selected period
  const selectedOption = PERIOD_OPTIONS.find(o => o.value === period)!;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - selectedOption.days);

  const rediscoverItems = allCards.filter(c => new Date(c.createdAt) < cutoffDate);
  const rediscoverCount = rediscoverItems.length;

  const handleStart = () => {
    router.push(`/library?mode=rediscover&period=${period}`);
  };

  return (
    <div
      className="h-full rounded-xl p-3 flex flex-col min-h-0 relative"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <History className="w-3 h-3 text-purple-400" />
          <span className="text-xs font-medium text-foreground">Rediscover</span>
        </div>
      </div>

      {rediscoverCount === 0 ? (
        <div className="flex-1 flex items-center">
          <div>
            <p className="text-xs text-muted-foreground">Nothing yet</p>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-0.5 hover:text-muted-foreground transition-colors"
            >
              Items {selectedOption.label}+ old
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0">
            <p className="text-2xl font-bold text-purple-400">{rediscoverCount}</p>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-xs text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
            >
              from {selectedOption.label}+ ago
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          <button
            onClick={handleStart}
            className="shrink-0 flex items-center justify-center gap-1 py-1.5 px-3 rounded-md bg-purple-500/20 text-purple-400 text-xs font-medium hover:bg-purple-500/30 transition-colors"
          >
            Explore <ArrowRight className="w-3 h-3" />
          </button>
        </>
      )}

      {/* Period dropdown */}
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div
            className="absolute left-2 right-2 bottom-full mb-1 z-50 p-1 scrollbar-minimal"
            style={{
              background: 'var(--bg-surface-1)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-3)',
              border: '1px solid var(--border-subtle)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePeriodChange(option.value)}
                className={`w-full text-left px-2 py-1.5 text-xs rounded-md transition-colors ${
                  period === option.value
                    ? "bg-purple-500/20 text-purple-400"
                    : "text-foreground hover:bg-white/5"
                }`}
              >
                {option.label}+
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
