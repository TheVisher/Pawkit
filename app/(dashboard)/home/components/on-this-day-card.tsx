"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { CardModel } from "@/lib/types";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { startOfDay, endOfDay } from "date-fns";

type OnThisDayPeriod = "1week" | "1month" | "3months" | "6months" | "1year";

const PERIOD_OPTIONS: { value: OnThisDayPeriod; label: string; getDate: () => Date }[] = [
  { value: "1week", label: "1 week", getDate: () => { const d = new Date(); d.setDate(d.getDate() - 7); return d; } },
  { value: "1month", label: "1 month", getDate: () => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d; } },
  { value: "3months", label: "3 months", getDate: () => { const d = new Date(); d.setMonth(d.getMonth() - 3); return d; } },
  { value: "6months", label: "6 months", getDate: () => { const d = new Date(); d.setMonth(d.getMonth() - 6); return d; } },
  { value: "1year", label: "1 year", getDate: () => { const d = new Date(); d.setFullYear(d.getFullYear() - 1); return d; } },
];

const STORAGE_KEY = "pawkit-onthisday-period";

interface OnThisDayCardProps {
  allCards: CardModel[];
}

export function OnThisDayCard({ allCards }: OnThisDayCardProps) {
  const openCardDetails = usePanelStore((state) => state.openCardDetails);
  const [period, setPeriod] = useState<OnThisDayPeriod>("1year");
  const [showDropdown, setShowDropdown] = useState(false);

  // Load saved period from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && PERIOD_OPTIONS.some(o => o.value === saved)) {
      setPeriod(saved as OnThisDayPeriod);
    }
  }, []);

  // Save period to localStorage
  const handlePeriodChange = (newPeriod: OnThisDayPeriod) => {
    setPeriod(newPeriod);
    localStorage.setItem(STORAGE_KEY, newPeriod);
    setShowDropdown(false);
  };

  // Find item from selected period ago
  const selectedOption = PERIOD_OPTIONS.find(o => o.value === period)!;

  const item = useMemo(() => {
    const targetDate = selectedOption.getDate();
    const dayStart = startOfDay(targetDate);
    const dayEnd = endOfDay(targetDate);

    return allCards.find(c => {
      const created = new Date(c.createdAt);
      return created >= dayStart && created <= dayEnd;
    });
  }, [allCards, selectedOption]);

  return (
    <div
      className="h-full rounded-xl p-3 flex flex-col min-h-0 relative"
      style={{
        background: 'var(--bg-surface-2)',
        boxShadow: 'var(--shadow-2)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-2 shrink-0">
        <Calendar className="w-3 h-3 text-amber-400" />
        <span className="text-xs font-medium text-foreground">On This Day</span>
      </div>

      {item ? (
        <div className="flex-1 flex flex-col min-h-0">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="text-[10px] text-muted-foreground mb-1.5 shrink-0 flex items-center gap-0.5 hover:text-foreground transition-colors w-fit"
          >
            {selectedOption.label} ago:
            <ChevronDown className="w-2.5 h-2.5" />
          </button>
          <button
            onClick={() => openCardDetails(item.id)}
            className="flex-1 text-left p-2 rounded-lg bg-surface-soft hover:bg-surface group transition-colors overflow-hidden"
          >
            <p className="text-xs font-medium text-foreground line-clamp-2 group-hover:text-amber-400 transition-colors">
              {item.title || item.domain || item.url}
            </p>
            {item.domain && (
              <p className="text-[10px] text-muted-foreground mt-1 truncate">{item.domain}</p>
            )}
          </button>
        </div>
      ) : (
        <div className="flex-1 flex items-center">
          <div>
            <p className="text-xs text-muted-foreground/60">Nothing saved on this day</p>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-0.5 hover:text-muted-foreground transition-colors"
            >
              {selectedOption.label} ago
              <ChevronDown className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
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
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-foreground hover:bg-white/5"
                }`}
              >
                {option.label} ago
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
