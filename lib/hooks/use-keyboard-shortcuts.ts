"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export interface KeyboardShortcut {
  key: string;
  modifiers?: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
  };
  description: string;
  action: () => void;
  group: string;
}

interface UseKeyboardShortcutsOptions {
  onNewNote?: () => void;
  onNewCard?: () => void;
  onTodayNote?: () => void;
  onCommandPalette?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
  onHelp?: () => void;
  enableNavigation?: boolean;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const router = useRouter();

  useEffect(() => {
    let gKeyPressed = false;
    let gKeyTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Command Palette (Cmd/Ctrl + K) - always active, already handled in layout
      // But we need to prevent it from triggering when in inputs
      if ((e.metaKey || e.ctrlKey) && e.key === "k" && !isInput) {
        e.preventDefault();
        options.onCommandPalette?.();
        return;
      }

      // New Note (Cmd/Ctrl + N)
      if ((e.metaKey || e.ctrlKey) && e.key === "n" && !isInput) {
        e.preventDefault();
        options.onNewNote?.();
        return;
      }

      // New Card (Cmd/Ctrl + P)
      if ((e.metaKey || e.ctrlKey) && e.key === "p" && !isInput) {
        e.preventDefault();
        options.onNewCard?.();
        return;
      }

      // Today's Note (Cmd/Ctrl + T)
      if ((e.metaKey || e.ctrlKey) && e.key === "t" && !isInput) {
        e.preventDefault();
        options.onTodayNote?.();
        return;
      }

      // Open Command Palette with / (changed from search focus)
      if (e.key === "/" && !isInput) {
        e.preventDefault();
        options.onCommandPalette?.();
        return;
      }


      // Escape key
      if (e.key === "Escape") {
        options.onEscape?.();
        return;
      }

      // Help (?)
      if (e.key === "?" && !isInput) {
        e.preventDefault();
        options.onHelp?.();
        return;
      }

      // G key navigation sequences
      if (options.enableNavigation && !isInput) {
        if (e.key === "g" && !gKeyPressed) {
          gKeyPressed = true;
          // Reset after 1 second if second key not pressed
          gKeyTimeout = setTimeout(() => {
            gKeyPressed = false;
          }, 1000);
          return;
        }

        if (gKeyPressed) {
          if (gKeyTimeout) clearTimeout(gKeyTimeout);
          gKeyPressed = false;

          switch (e.key) {
            case "h":
              e.preventDefault();
              router.push("/home");
              break;
            case "l":
              e.preventDefault();
              router.push("/library");
              break;
            case "c":
              e.preventDefault();
              router.push("/calendar");
              break;
            case "n":
              e.preventDefault();
              router.push("/notes");
              break;
            case "p":
              e.preventDefault();
              router.push("/pawkits");
              break;
            case "d":
              e.preventDefault();
              router.push("/distill");
              break;
            // case "t": // Timeline route doesn't exist yet
            //   e.preventDefault();
            //   router.push("/timeline");
            //   break;
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "g" && gKeyPressed) {
        // Don't reset on key up, wait for second key or timeout
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      if (gKeyTimeout) clearTimeout(gKeyTimeout);
    };
  }, [options, router]);
}

// Get all available shortcuts for the help modal
export function getAllShortcuts(): KeyboardShortcut[] {
  return [
    // General
    {
      key: "Cmd/Ctrl + K",
      description: "Open command palette",
      action: () => {},
      group: "General",
    },
    {
      key: "Cmd/Ctrl + N",
      description: "Create new note",
      action: () => {},
      group: "General",
    },
    {
      key: "Cmd/Ctrl + P",
      description: "Add new card/bookmark",
      action: () => {},
      group: "General",
    },
    {
      key: "Cmd/Ctrl + T",
      description: "Open today's note",
      action: () => {},
      group: "General",
    },
    {
      key: "/",
      description: "Open command palette",
      action: () => {},
      group: "General",
    },
    {
      key: "Cmd/Ctrl + V",
      description: "Quick paste to command palette",
      action: () => {},
      group: "General",
    },
    {
      key: "Esc",
      description: "Close modal or dialog",
      action: () => {},
      group: "General",
    },
    {
      key: "?",
      description: "Show keyboard shortcuts help",
      action: () => {},
      group: "General",
    },

    // Navigation
    {
      key: "G then H",
      description: "Go to Home",
      action: () => {},
      group: "Navigation",
    },
    {
      key: "G then L",
      description: "Go to Library",
      action: () => {},
      group: "Navigation",
    },
    {
      key: "G then C",
      description: "Go to Calendar",
      action: () => {},
      group: "Navigation",
    },
    {
      key: "G then N",
      description: "Go to Notes",
      action: () => {},
      group: "Navigation",
    },
    {
      key: "G then P",
      description: "Go to Pawkits",
      action: () => {},
      group: "Navigation",
    },
    {
      key: "G then D",
      description: "Go to Dig Up",
      action: () => {},
      group: "Navigation",
    },
    // Timeline route doesn't exist yet
    // {
    //   key: "G then T",
    //   description: "Go to Timeline",
    //   action: () => {},
    //   group: "Navigation",
    // },

    // Markdown Editor (shown when in editor)
    {
      key: "Cmd/Ctrl + B",
      description: "Bold text",
      action: () => {},
      group: "Markdown Editor",
    },
    {
      key: "Cmd/Ctrl + I",
      description: "Italic text",
      action: () => {},
      group: "Markdown Editor",
    },
    {
      key: "Cmd/Ctrl + K",
      description: "Insert wiki-link",
      action: () => {},
      group: "Markdown Editor",
    },
    {
      key: "Cmd/Ctrl + E",
      description: "Inline code",
      action: () => {},
      group: "Markdown Editor",
    },
    {
      key: "Cmd/Ctrl + /",
      description: "Toggle preview mode",
      action: () => {},
      group: "Markdown Editor",
    },
  ];
}
