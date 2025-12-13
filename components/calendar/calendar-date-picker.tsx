"use client";

import { useState, useRef, useEffect } from "react";
import { format, setMonth, setYear, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Calendar, CalendarDays, CalendarRange, Grid3X3, Menu, Flag } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useCalendarStore, type CalendarViewMode, type HolidayFilter, type HolidayCountry } from "@/lib/hooks/use-calendar-store";

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

const VIEW_MODES: { value: CalendarViewMode; label: string; icon: typeof Calendar }[] = [
  { value: "day", label: "Day", icon: CalendarDays },
  { value: "week", label: "Week", icon: CalendarRange },
  { value: "month", label: "Month", icon: Grid3X3 },
];

// Generate year range (current year - 50 to current year + 20)
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = currentYear - 50; i <= currentYear + 20; i++) {
    years.push(i);
  }
  return years;
};

interface CalendarDatePickerProps {
  currentDate: Date;
  viewMode: CalendarViewMode;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: CalendarViewMode) => void;
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
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [viewModeOpen, setViewModeOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const yearListRef = useRef<HTMLDivElement>(null);
  const years = generateYears();

  // Holiday settings from store
  const holidayFilter = useCalendarStore((state) => state.holidayFilter);
  const enabledCountries = useCalendarStore((state) => state.enabledCountries);
  const setHolidayFilter = useCalendarStore((state) => state.setHolidayFilter);
  const toggleCountry = useCalendarStore((state) => state.toggleCountry);

  const currentMonthValue = currentDate.getMonth();
  const currentYearValue = currentDate.getFullYear();

  // Scroll to current year when picker opens
  useEffect(() => {
    if (!datePickerOpen) return;

    let attempts = 0;
    const maxAttempts = 20;

    const scrollToYear = () => {
      attempts++;
      const container = yearListRef.current;

      if (!container) {
        if (attempts < maxAttempts) {
          requestAnimationFrame(scrollToYear);
        }
        return;
      }

      // Check if container has scrollable content (scrollHeight > clientHeight)
      if (container.scrollHeight <= container.clientHeight) {
        if (attempts < maxAttempts) {
          requestAnimationFrame(scrollToYear);
        }
        return;
      }

      // Find the index of current year in the years array
      const yearIndex = years.indexOf(currentYearValue);
      if (yearIndex === -1) return;

      // Get the first year button to measure actual button height
      const firstButton = container.querySelector('button') as HTMLElement;
      if (!firstButton) {
        if (attempts < maxAttempts) {
          requestAnimationFrame(scrollToYear);
        }
        return;
      }

      const buttonHeight = firstButton.offsetHeight;
      const paddingTop = 60; // py-[60px] on inner wrapper
      const containerHeight = container.clientHeight;

      // Calculate position: paddingTop + (index * buttonHeight) - center offset
      const targetScrollTop = paddingTop + (yearIndex * buttonHeight) - (containerHeight / 2) + (buttonHeight / 2);
      container.scrollTop = Math.max(0, targetScrollTop);
    };

    // Start polling after a brief delay for popover to begin rendering
    const timer = setTimeout(() => {
      requestAnimationFrame(scrollToYear);
    }, 50);

    return () => clearTimeout(timer);
  }, [datePickerOpen, currentYearValue, years]);

  const handleMonthSelect = (monthValue: number) => {
    const newDate = setMonth(currentDate, monthValue);
    onDateChange(newDate);
  };

  const handleYearSelect = (year: number) => {
    const newDate = setYear(currentDate, year);
    onDateChange(newDate);
  };

  const handleYearScroll = (direction: "up" | "down") => {
    const newYear = direction === "up" ? currentYearValue - 1 : currentYearValue + 1;
    if (newYear >= years[0] && newYear <= years[years.length - 1]) {
      handleYearSelect(newYear);
    }
  };

  const handleViewModeSelect = (mode: CalendarViewMode) => {
    onViewModeChange(mode);
    setViewModeOpen(false);
  };

  // Format display based on view mode
  const getDateDisplay = () => {
    switch (viewMode) {
      case "day":
        return format(currentDate, "EEEE, MMMM d, yyyy");
      case "week":
        return `Week of ${format(startOfWeek(currentDate), "MMM d, yyyy")}`;
      case "month":
      default:
        return format(currentDate, "MMMM yyyy");
    }
  };

  const currentViewMode = VIEW_MODES.find(v => v.value === viewMode) || VIEW_MODES[2];
  const ViewModeIcon = currentViewMode.icon;

  return (
    <div className="flex items-center gap-2">
      {/* Previous button */}
      <button
        onClick={onPrevious}
        className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Previous"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Unified date picker */}
      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
        <PopoverTrigger asChild>
          <button
            className="text-lg font-semibold text-foreground hover:text-accent transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-white/5"
          >
            {getDateDisplay()}
            <ChevronDown size={14} className="opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-0 backdrop-blur-md"
          align="center"
        >
          <div className="flex">
            {/* Months grid - left side */}
            <div className="p-3 border-r" style={{ borderColor: 'var(--border-subtle)' }}>
              <div
                className="text-xs font-medium uppercase tracking-wide mb-2 px-1"
                style={{ color: 'var(--text-muted)' }}
              >
                Month
              </div>
              <div className="grid grid-cols-3 gap-1">
                {MONTHS.map((month) => (
                  <button
                    key={month.value}
                    onClick={() => handleMonthSelect(month.value)}
                    className="px-3 py-2 rounded-lg text-sm font-medium transition-all"
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
            </div>

            {/* Year selector - right side (slot machine style) */}
            <div className="p-3 flex flex-col items-center" style={{ width: 80 }}>
              <div
                className="text-xs font-medium uppercase tracking-wide mb-2"
                style={{ color: 'var(--text-muted)' }}
              >
                Year
              </div>

              {/* Up arrow */}
              <button
                onClick={() => handleYearScroll("up")}
                className="p-1 rounded-lg transition-colors mb-1"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-surface-3)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <ChevronUp size={18} />
              </button>

              {/* Scrollable year list */}
              <div
                ref={yearListRef}
                className="h-[180px] overflow-y-auto scrollbar-hide relative"
                style={{
                  maskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                  WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 20%, black 80%, transparent)',
                }}
              >
                <div className="py-[60px]">
                  {years.map((year) => (
                    <button
                      key={year}
                      data-year={year}
                      onClick={() => handleYearSelect(year)}
                      className="w-full px-3 py-1.5 text-sm font-medium transition-all text-center rounded-lg"
                      style={year === currentYearValue ? {
                        background: 'var(--ds-accent)',
                        color: 'white',
                        transform: 'scale(1.05)',
                      } : {
                        background: 'transparent',
                        color: 'var(--text-muted)',
                      }}
                      onMouseEnter={(e) => {
                        if (year !== currentYearValue) {
                          e.currentTarget.style.background = 'var(--bg-surface-3)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (year !== currentYearValue) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-muted)';
                        }
                      }}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>

              {/* Down arrow */}
              <button
                onClick={() => handleYearScroll("down")}
                className="p-1 rounded-lg transition-colors mt-1"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-surface-3)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                <ChevronDown size={18} />
              </button>
            </div>
          </div>

          {/* Done button at bottom */}
          <div
            className="p-2 border-t flex justify-end"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <button
              onClick={() => setDatePickerOpen(false)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={{
                background: 'var(--ds-accent)',
                color: 'white',
              }}
            >
              Done
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Next button */}
      <button
        onClick={onNext}
        className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Next"
      >
        <ChevronRight size={20} />
      </button>

      {/* Divider */}
      <div className="w-px h-6 bg-border-subtle mx-1" />

      {/* Today button */}
      <button
        onClick={() => onDateChange(new Date())}
        className="px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all"
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
        Today
      </button>

      {/* View mode dropdown */}
      <Popover open={viewModeOpen} onOpenChange={setViewModeOpen}>
        <PopoverTrigger asChild>
          <button
            className="px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5"
            style={{
              background: 'var(--ds-accent)',
              color: 'white',
            }}
          >
            <ViewModeIcon size={14} />
            {currentViewMode.label}
            <ChevronDown size={12} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[140px] p-1.5" align="end">
          <div className="space-y-0.5">
            {VIEW_MODES.map((mode) => {
              const Icon = mode.icon;
              const isActive = viewMode === mode.value;
              return (
                <button
                  key={mode.value}
                  onClick={() => handleViewModeSelect(mode.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2"
                  style={isActive ? {
                    background: 'var(--ds-accent)',
                    color: 'white',
                  } : {
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'var(--bg-surface-3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <Icon size={14} />
                  {mode.label}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>

      {/* Settings menu */}
      <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
        <PopoverTrigger asChild>
          <button
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
            aria-label="Calendar settings"
          >
            <Menu size={18} />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0 backdrop-blur-md" align="end">
          <div className="p-4">
            {/* Holidays Header */}
            <div className="flex items-center gap-2 mb-3">
              <Flag size={14} style={{ color: 'var(--ds-accent)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Holidays
              </span>
            </div>

            {/* Country Selection */}
            <div
              className="rounded-xl p-3 mb-3"
              style={{
                background: 'var(--bg-surface-1)',
                boxShadow: 'var(--inset-shadow)',
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                {/* US Button */}
                <button
                  onClick={() => toggleCountry("us")}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={enabledCountries.includes("us") ? {
                    background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--raised-shadow-sm)',
                  } : {
                    background: 'transparent',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>🇺🇸</span>
                  <span>US</span>
                </button>

                {/* Canada Button */}
                <button
                  onClick={() => toggleCountry("ca")}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                  style={enabledCountries.includes("ca") ? {
                    background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                    color: 'var(--text-primary)',
                    boxShadow: 'var(--raised-shadow-sm)',
                  } : {
                    background: 'transparent',
                    color: 'var(--text-muted)',
                  }}
                >
                  <span>🇨🇦</span>
                  <span>Canada</span>
                </button>
              </div>
            </div>

            {/* Major/All Toggle - only show when at least one country enabled */}
            {enabledCountries.length > 0 && (
              <div
                className="relative rounded-full"
                style={{
                  background: 'var(--bg-surface-1)',
                  boxShadow: 'var(--inset-shadow)',
                  padding: '4px',
                }}
              >
                {/* Sliding indicator */}
                <div
                  className="absolute rounded-full transition-all duration-300 ease-out pointer-events-none"
                  style={{
                    width: 'calc((100% - 8px) / 2)',
                    height: 'calc(100% - 8px)',
                    top: '4px',
                    left: holidayFilter === "major" ? '4px' : 'calc(4px + ((100% - 8px) / 2))',
                    background: 'linear-gradient(to bottom, var(--bg-surface-3) 0%, var(--bg-surface-2) 100%)',
                    boxShadow: 'var(--raised-shadow-sm)',
                  }}
                />
                {/* Buttons */}
                <div className="relative flex">
                  <button
                    onClick={() => setHolidayFilter("major")}
                    className="flex-1 flex items-center justify-center py-1.5 rounded-full transition-colors duration-200 z-10 text-xs font-medium"
                    style={{
                      color: holidayFilter === "major" ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    Major
                  </button>
                  <button
                    onClick={() => setHolidayFilter("all")}
                    className="flex-1 flex items-center justify-center py-1.5 rounded-full transition-colors duration-200 z-10 text-xs font-medium"
                    style={{
                      color: holidayFilter === "all" ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    All
                  </button>
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
