"use client";

import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type IconProps = {
  className?: string;
};

type SidebarLinkConfig = {
  href: string;
  label: string;
  icon: (props: IconProps) => ReactElement;
};

const MIN_WIDTH = 72;
const MAX_WIDTH = 360;
const COLLAPSE_WIDTH = 128;
const STORAGE_KEY = "vbm.sidebar.width";

const primaryLinks: SidebarLinkConfig[] = [
  { href: "/home", label: "Home", icon: IconHome },
  { href: "/library", label: "Library", icon: IconLibrary },
  { href: "/timeline", label: "Timeline", icon: IconTimeline },
  { href: "/collections", label: "Collections", icon: IconCollections },
  { href: "/notes", label: "Notes", icon: IconNotes },
  { href: "/distill", label: "Distill", icon: IconDistill },
  { href: "/trash", label: "Trash", icon: IconTrash }
];

const favoritesLink: SidebarLinkConfig = {
  href: "/favorites",
  label: "Favorites",
  icon: IconStar
};

const bottomIconLinks: SidebarLinkConfig[] = [
  { href: "/changelog", label: "Changelog", icon: IconHistory },
  { href: "/settings", label: "Settings", icon: IconSettings },
  { href: "/help", label: "Help", icon: IconHelp }
];

export type ResizableSidebarProps = {
  username: string;
};

export function ResizableSidebar({ username }: ResizableSidebarProps) {
  const pathname = usePathname();
  const [width, setWidth] = useState(() => {
    if (typeof window === "undefined") {
      return 260;
    }
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? parseInt(stored, 10) : NaN;
    if (Number.isNaN(parsed)) {
      return 260;
    }
    return clampWidth(parsed);
  });
  const collapsed = width <= COLLAPSE_WIDTH;

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, String(width));
  }, [width]);

  const isActive = useMemo(() => {
    return (href: string) => {
      if (!pathname) return false;
      if (href === "/home" && (pathname === "/" || pathname === "/home")) {
        return true;
      }
      return pathname === href || pathname.startsWith(`${href}/`);
    };
  }, [pathname]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX;
      setWidth(clampWidth(startWidth + delta));
    };

    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      document.body.style.userSelect = previousUserSelect;
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const handleHandleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setWidth((current) => clampWidth(current - 16));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setWidth((current) => clampWidth(current + 16));
    }
  };

  return (
    <aside
      className="sticky top-0 z-30 flex h-screen min-h-0 flex-col overflow-hidden border-r border-gray-800 bg-gray-950 text-gray-100 shrink-0"
      style={{ width }}
    >
      <div className={`flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto ${collapsed ? "px-2 py-4" : "p-4"}`}>
        <div className={`${collapsed ? "w-full" : ""} space-y-1`}>
          {primaryLinks.map((link) => (
            <SidebarLink key={link.href} config={link} active={isActive(link.href)} collapsed={collapsed} />
          ))}
        </div>
        <Separator />
        <SidebarLink config={favoritesLink} active={isActive(favoritesLink.href)} collapsed={collapsed} />
      </div>
      <div className={`${collapsed ? "px-2 pb-4" : "px-4 pb-4"} shrink-0`}>
        <div className={`mb-3 flex items-center ${collapsed ? "justify-center" : "gap-2"}`}>
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-gray-100">
            <IconUser className="h-4 w-4" />
          </span>
          {!collapsed && <span className="truncate text-sm text-gray-300">{username}</span>}
        </div>
        <Separator />
        <div className={`mt-3 flex items-center gap-2 ${collapsed ? "justify-start" : "justify-start"}`}>
          {bottomIconLinks.map((link) => (
            <SidebarIconButton key={link.href} config={link} active={isActive(link.href)} />
          ))}
        </div>
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-valuenow={width}
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onKeyDown={handleHandleKeyDown}
        className="absolute top-0 -right-1 z-10 h-full w-2 cursor-col-resize focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        <div className="mx-auto h-full w-px bg-gray-800" aria-hidden="true" />
      </div>
    </aside>
  );
}

type SidebarLinkProps = {
  config: SidebarLinkConfig;
  active?: boolean;
  collapsed: boolean;
};

function SidebarLink({ config, active, collapsed }: SidebarLinkProps) {
  const { href, label, icon: Icon } = config;
  const stateClasses = active
    ? "bg-gray-900 text-gray-100"
    : "text-gray-400 hover:bg-gray-900 hover:text-gray-100";
  const layoutClasses = collapsed ? "justify-center gap-0" : "gap-3";

  return (
    <Link
      href={href}
      className={`flex w-full items-center rounded px-3 py-2 text-sm transition-colors ${layoutClasses} ${stateClasses}`}
      title={collapsed ? label : undefined}
    >
      <Icon className="h-5 w-5" />
      <span className={collapsed ? "sr-only" : "truncate"}>{label}</span>
    </Link>
  );
}

type SidebarIconButtonProps = {
  config: SidebarLinkConfig;
  active?: boolean;
};

function SidebarIconButton({ config, active }: SidebarIconButtonProps) {
  const { href, label, icon: Icon } = config;
  const stateClasses = active
    ? "bg-gray-900 text-gray-100"
    : "text-gray-400 hover:bg-gray-900 hover:text-gray-100";

  return (
    <Link
      href={href}
      className={`flex h-9 w-9 items-center justify-center rounded transition-colors ${stateClasses}`}
      title={label}
    >
      <Icon className="h-5 w-5" />
      <span className="sr-only">{label}</span>
    </Link>
  );
}

function Separator() {
  return <div className="h-px w-full bg-gray-800" aria-hidden="true" />;
}

function clampWidth(next: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next));
}

function IconHome({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75 12 3l9 6.75V20a1 1 0 0 1-1 1h-6v-6h-4v6H4a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function IconLibrary({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 4h6a2 2 0 0 1 2 2v13l-5-2-5 2V6a2 2 0 0 1 2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 4h4a2 2 0 0 1 2 2v13l-3-1.2-3 1.2V4z" />
    </svg>
  );
}

function IconTimeline({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h7" />
      <circle cx="17.5" cy="12" r="2.5" />
    </svg>
  );
}

function IconCollections({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7a2 2 0 0 1 2-2h8l6 6v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5v5h5" />
    </svg>
  );
}

function IconNotes({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h10l4 4v14H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h6M9 13h6M9 17h3" />
    </svg>
  );
}

function IconDistill({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v6.5l6 10.5H6l6-10.5" />
    </svg>
  );
}

function IconTrash({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7h14z" />
    </svg>
  );
}

function IconStar({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="m12 17.27 5.18 3.12-1.64-5.81L20 9.75l-6-.22L12 4l-2 5.53-6 .22 4.46 4.83-1.64 5.81z" />
    </svg>
  );
}

function IconUser({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function IconHistory({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.75 6a6 6 0 1 1-4.6 2.19" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5v4h4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2.5 1.5" />
    </svg>
  );
}

function IconSettings({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      />
    </svg>
  );
}

function IconHelp({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 17h.01M12 13a3 3 0 1 0-3-3" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}
