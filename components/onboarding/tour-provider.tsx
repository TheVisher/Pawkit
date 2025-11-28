"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { TourProvider as ReactTourProvider, useTour, StepType } from "@reactour/tour";

// Tour step definitions
export const TOUR_STEPS: StepType[] = [
  {
    selector: '[data-tour="omnibar"]',
    content: "This is your Command Palette - press ⌘K (or /) anytime to open it. Paste URLs to save bookmarks, or search your entire library instantly.",
    position: "bottom", // Position tooltip below the command palette
    // Note: Command palette is opened by startTour() before tour begins
  },
  {
    selector: '[data-tour="library-link"]',
    content: "Your Library contains all your bookmarks and notes in one place. Everything you save lives here.",
    action: () => {
      // Close the command palette when moving to this step
      window.dispatchEvent(new CustomEvent("pawkit:close-command-palette"));
    },
  },
  {
    selector: '[data-tour="pawkits-link"]',
    content: "Organize your bookmarks into Pawkits - like smart folders for your content. Create nested collections to keep things tidy.",
  },
  {
    selector: '[data-tour="calendar-link"]',
    content: "Schedule bookmarks to read later and track your daily notes here. Plan your reading and stay organized.",
  },
];

// Context type
interface TourContextValue {
  startTour: () => void;
  endTour: () => void;
  isTourRunning: boolean;
  currentStep: number;
  tourCompleted: boolean;
}

const TourContext = createContext<TourContextValue | null>(null);

// Hook to use tour context
export function useTourContext() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTourContext must be used within a TourProvider");
  }
  return context;
}

// Inner component that has access to useTour hook
function TourController({ children }: { children: ReactNode }) {
  const { setIsOpen, currentStep, setCurrentStep, isOpen } = useTour();
  const [tourCompleted, setTourCompleted] = useState(false);

  // Load tour completed state from server on mount
  useEffect(() => {
    async function loadTourState() {
      try {
        const response = await fetch("/api/user/settings");
        if (response.ok) {
          const settings = await response.json();
          setTourCompleted(settings.onboardingTourCompleted ?? false);
        }
      } catch (error) {
        console.error("[TourProvider] Error loading tour state:", error);
      }
    }
    loadTourState();
  }, []);

  const startTour = useCallback(async () => {
    // Open command palette first for step 1 (before tour calculates position)
    window.dispatchEvent(new CustomEvent("pawkit:open-command-palette", { detail: { forTour: true } }));

    // Wait for React to render AND browser to paint the command palette
    await new Promise<void>(resolve => {
      // Double requestAnimationFrame ensures paint has happened
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Additional timeout to ensure portal is fully mounted
          setTimeout(resolve, 100);
        });
      });
    });

    setCurrentStep(0);
    setIsOpen(true);
  }, [setCurrentStep, setIsOpen]);

  const endTour = useCallback(async () => {
    setIsOpen(false);
    setTourCompleted(true);

    // Save completion to server
    try {
      await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingTourCompleted: true }),
      });
    } catch (error) {
      console.error("[TourProvider] Error saving tour completion:", error);
    }
  }, [setIsOpen]);

  // Listen for custom events to start/end tour
  useEffect(() => {
    const handleStartTour = () => {
      startTour();
    };

    const handleEndTour = () => {
      endTour();
    };

    window.addEventListener("pawkit:start-tour", handleStartTour);
    window.addEventListener("pawkit:end-tour", handleEndTour);
    return () => {
      window.removeEventListener("pawkit:start-tour", handleStartTour);
      window.removeEventListener("pawkit:end-tour", handleEndTour);
    };
  }, [startTour, endTour]);

  const value: TourContextValue = {
    startTour,
    endTour,
    isTourRunning: isOpen,
    currentStep,
    tourCompleted,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

// Pawkit glass morphism styles for the tour
const pawkitTourStyles = {
  popover: (base: object) => ({
    ...base,
    backgroundColor: "rgba(17, 17, 27, 0.95)",
    backdropFilter: "blur(12px)",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    boxShadow: "0 0 30px rgba(139, 92, 246, 0.15), 0 8px 32px rgba(0, 0, 0, 0.4)",
    padding: "20px",
    maxWidth: "340px",
    zIndex: 100000, // Higher than command palette (z-99999) during tour
  }),
  maskArea: (base: object) => ({
    ...base,
    rx: 12,
  }),
  maskWrapper: (base: object) => ({
    ...base,
    color: "rgba(0, 0, 0, 0.7)",
    zIndex: 9998, // High z-index so sidebars are dimmed
  }),
  svgWrapper: (base: object) => ({
    ...base,
    zIndex: 9998,
  }),
  highlightedArea: (base: object) => ({
    ...base,
    zIndex: 9998,
  }),
  badge: (base: object) => ({
    ...base,
    backgroundColor: "rgba(139, 92, 246, 0.2)",
    color: "#a78bfa",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    borderRadius: "9999px",
    padding: "4px 10px",
    fontSize: "12px",
    fontWeight: "500",
  }),
  controls: (base: object) => ({
    ...base,
    marginTop: "16px",
  }),
  close: (base: object) => ({
    ...base,
    color: "rgba(255, 255, 255, 0.5)",
    top: "12px",
    right: "12px",
    "&:hover": {
      color: "rgba(255, 255, 255, 0.8)",
    },
  }),
  arrow: (base: object) => ({
    ...base,
    color: "rgba(17, 17, 27, 0.95)",
  }),
};

// Custom content component for tour steps
function TourContent({ content }: { content: string }) {
  return (
    <div className="text-gray-200 text-sm leading-relaxed">
      {content}
    </div>
  );
}

// Navigation buttons component - uses props instead of context to avoid context nesting issues
function TourNavigation({
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip
}: {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}) {
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
      <button
        onClick={onSkip}
        className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
      >
        Skip tour
      </button>
      <div className="flex items-center gap-2">
        {!isFirstStep && (
          <button
            onClick={onPrev}
            className="px-3 py-1.5 text-sm rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all"
          >
            Back
          </button>
        )}
        <button
          onClick={onNext}
          className="px-4 py-1.5 text-sm rounded-full bg-purple-500/20 border border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:bg-purple-500/30 transition-all"
        >
          {isLastStep ? "Finish" : "Next"}
        </button>
      </div>
    </div>
  );
}

// Custom tooltip component - receives PopoverContentProps from @reactour/tour
function CustomTooltip(props: {
  steps: StepType[];
  currentStep: number;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const { steps, currentStep, setCurrentStep, setIsOpen } = props;
  const stepContent = steps[currentStep]?.content;
  const isLastStep = currentStep === steps.length - 1;

  // Render the content based on its type
  const renderContent = () => {
    if (typeof stepContent === "string") {
      return <TourContent content={stepContent} />;
    }
    if (typeof stepContent === "function") {
      // Function type - call it with props (returns void but we don't use that)
      return null;
    }
    // ReactElement type - render directly
    return stepContent;
  };

  const handleNext = () => {
    if (isLastStep) {
      // Dispatch event to end tour (handled by TourController)
      window.dispatchEvent(new CustomEvent("pawkit:end-tour"));
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    window.dispatchEvent(new CustomEvent("pawkit:end-tour"));
  };

  return (
    <div>
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-purple-400 font-medium">
          Step {currentStep + 1} of {steps.length}
        </span>
        <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Navigation */}
      <TourNavigation
        currentStep={currentStep}
        totalSteps={steps.length}
        onNext={handleNext}
        onPrev={handlePrev}
        onSkip={handleSkip}
      />
    </div>
  );
}

// Main provider component
interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  return (
    <ReactTourProvider
      steps={TOUR_STEPS}
      styles={pawkitTourStyles}
      padding={{ mask: 8, popover: [8, 12] }}
      showBadge={false}
      showNavigation={false}
      showCloseButton={true}
      disableInteraction={false}
      onClickMask={() => {}} // Prevent closing on mask click
      ContentComponent={CustomTooltip}
      mutationObservables={['body', '[data-tour]']} // Watch for portal mounts and tour elements
      resizeObservables={['[data-tour="omnibar"]']} // Watch for size changes
    >
      <TourController>{children}</TourController>
    </ReactTourProvider>
  );
}
