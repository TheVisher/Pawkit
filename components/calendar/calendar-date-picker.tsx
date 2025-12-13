"use client";

import { useState, useRef, useEffect } from "react";
import { format, setMonth, setYear, startOfWeek, isToday, startOfMonth } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronDown, CalendarCheck, CalendarRange } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

const MONTHS = [
  { name: "Jan", value: 0 },
  { name: "Feb", value: 1 },
  { name: "Mar", value: 2 },
  { name: "Apr", value: 3 },
  { name: "May", value: 4 },
  { name: "Jun", value: 5 },
  { name: "Jul", value: 6 },
  { name: "Aug", value: 7 },
  { name: "Sep", value: 8 },
  { name: "Oct", value: 9 },
  { name: "Nov", value: 10 },
  { name: "Dec", value: 11 },
];

// Generate year range (current year - 10 to current year + 10)
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = currentYear - 10; i <= currentYear + 10; i++) {
    years.push(i);
  }
  return years;
};

interface CalendarDatePickerProps {
  currentDate: Date;
  viewMode: "month" | "week";
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: "month" | "week") => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function CalendarDatePicker({
  currentDate,
  viewMode,
  onDateChange,
  onViewModeChange,
  onPrevious,
  onNext,
}: CalendarDatePickerProps) {
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);
  const yearListRef = useRef<HTMLDivElement>(null);
  const years = generateYears();

  const currentMonthValue = currentDate.getMonth();
  const currentYearValue = currentDate.getFullYear();

  // Scroll to current year when year picker opens
  useEffect(() => {
    if (yearOpen && yearListRef.current) {
      const currentYearElement = yearListRef.current.querySelector(
        `[data-year="${currentYearValue}"]`
      );
      if (currentYearElement) {
        currentYearElement.scrollIntoView({ block: "center" });
      }
    }
  }, [yearOpen, currentYearValue]);

  const handleMonthSelect = (monthValue: number) => {
    const newDate = setMonth(currentDate, monthValue);
    onDateChange(newDate);
    setMonthOpen(false);
  };

  const handleYearSelect = (year: number) => {
    const newDate = setYear(currentDate, year);
    onDateChange(newDate);
    setYearOpen(false);
  };

  // Format display based on view mode
  const monthDisplay = viewMode === "week"
    ? format(startOfWeek(currentDate), "MMM d")
    : format(currentDate, "MMMM");

  const yearDisplay = format(currentDate, "yyyy");

  return (
    <div className="flex items-center gap-2">
      {/* Previous button */}
      <button
        onClick={onPrevious}
        className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={viewMode === "week" ? "Previous week" : "Previous month"}
      >
        <ChevronLeft size={20} />
      </button>

      {/* Date display with pickers */}
      <div className="flex items-center gap-1 min-w-[180px] justify-center">
        {viewMode === "week" && (
          <span className="text-lg font-semibold text-foreground mr-1">Week of</span>
        )}

        {/* Month picker */}
        <Popover open={monthOpen} onOpenChange={setMonthOpen}>
          <PopoverTrigger asChild>
            <button
              className="text-lg font-semibold text-foreground hover:text-accent transition-colors flex items-center gap-0.5 px-1 rounded hover:bg-white/5"
            >
              {monthDisplay}
              <ChevronDown size={14} className="opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-3" align="center">
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((month) => (
                <button
                  key={month.value}
                  onClick={() => handleMonthSelect(month.value)}
                  className="px-2 py-2 rounded-lg text-sm font-medium transition-all"
                  style={month.value === currentMonthValue ? {
                    background: 'var(--ds-accent)',
                    color: 'white',
                  } : {
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (month.value !== currentMonthValue) {
                      e.currentTarget.style.background = 'var(--bg-surface-3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (month.value !== currentMonthValue) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {month.name}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Comma separator for week view */}
        {viewMode === "week" && (
          <span className="text-lg font-semibold text-foreground">,</span>
        )}

        {/* Year picker */}
        <Popover open={yearOpen} onOpenChange={setYearOpen}>
          <PopoverTrigger asChild>
            <button
              className="text-lg font-semibold text-foreground hover:text-accent transition-colors flex items-center gap-0.5 px-1 rounded hover:bg-white/5"
            >
              {yearDisplay}
              <ChevronDown size={14} className="opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[120px] p-2" align="center">
            <div
              ref={yearListRef}
              className="max-h-[200px] overflow-y-auto scrollbar-minimal"
            >
              {years.map((year) => (
                <button
                  key={year}
                  data-year={year}
                  onClick={() => handleYearSelect(year)}
                  className="w-full px-3 py-1.5 rounded-lg text-sm font-medium transition-all text-center"
                  style={year === currentYearValue ? {
                    background: 'var(--ds-accent)',
                    color: 'white',
                  } : {
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (year !== currentYearValue) {
                      e.currentTarget.style.background = 'var(--bg-surface-3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (year !== currentYearValue) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Next button */}
      <button
        onClick={onNext}
        className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={viewMode === "week" ? "Next week" : "Next month"}
      >
        <ChevronRight size={20} />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-border-subtle mx-1" />

      {/* Today button */}
      <button
        onClick={() => {
          onDateChange(new Date());
          onViewModeChange("month");
        }}
        className="px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
        style={{
          background: 'transparent',
          color: 'var(--text-muted)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-surface-3)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-muted)';
        }}
      >
        <CalendarCheck size={14} />
        Today
      </button>

      {/* Week toggle */}
      <button
        onClick={() => {
          onDateChange(new Date());
          onViewModeChange(viewMode === "week" ? "month" : "week");
        }}
        className="px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
        style={viewMode === "week" ? {
          background: 'var(--ds-accent)',
          color: 'white',
        } : {
          background: 'transparent',
          color: 'var(--text-muted)',
        }}
        onMouseEnter={(e) => {
          if (viewMode !== "week") {
            e.currentTarget.style.background = 'var(--bg-surface-3)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }
        }}
        onMouseLeave={(e) => {
          if (viewMode !== "week") {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
          }
        }}
      >
        <CalendarRange size={14} />
        Week
      </button>
    </div>
  );
}
