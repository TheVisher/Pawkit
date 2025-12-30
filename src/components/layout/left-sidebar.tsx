"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Library,
  Calendar,
  Trash2,
  LogOut,
  Settings,
  FolderOpen,
  ArrowLeftToLine,
  ArrowRightFromLine,
  Maximize2,
  Minimize2,
  ChevronRight,
  ChevronDown,
  Tags,
} from "lucide-react";
import { PawkitsTree } from "@/components/pawkits/pawkits-tree";
import { SidebarContextMenu } from "@/components/context-menus";
import { useLeftSidebar } from "@/lib/stores/ui-store";
import { useCurrentWorkspace } from "@/lib/stores/workspace-store";
import { getClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/library", label: "Library", icon: Library },
  { href: "/calendar", label: "Calendar", icon: Calendar },
];

export function LeftSidebar() {
  const [mounted, setMounted] = useState(false);
  const [pawkitsExpanded, setPawkitsExpanded] = useState(true);
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, isAnchored, toggleAnchored, setOpen } = useLeftSidebar();
  const workspace = useCurrentWorkspace();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Standard SSR hydration pattern
    setMounted(true);
  }, []);

  // Check if we're on a pawkits route - strict check to avoid double highlight
  const isPawkitsActive = pathname === "/pawkits";

  const handleSignOut = async () => {
    const supabase = getClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleToggleOpen = () => {
    setOpen(!isOpen);
  };

  // Use default values during SSR to match initial client render
  const anchored = mounted ? isAnchored : false;
  const open = mounted ? isOpen : true;

  return (
    <div className="h-full flex flex-col">
      {/* Header with anchor/close buttons - uses border-b to align with TopBar */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border-subtle">
        <Link href="/home" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[var(--color-accent)] flex items-center justify-center">
            <span className="text-white font-bold text-sm">P</span>
          </div>
          <span className="font-semibold text-text-primary">Pawkit</span>
        </Link>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleAnchored}
                  className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                >
                  {anchored ? (
                    <Minimize2 className="h-5 w-5" />
                  ) : (
                    <Maximize2 className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{anchored ? "Float panel" : "Anchor panel"}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleToggleOpen}
                  className="h-7 w-7 text-text-muted hover:text-text-primary hover:bg-bg-surface-2"
                >
                  {open ? (
                    <ArrowLeftToLine className="h-5 w-5" />
                  ) : (
                    <ArrowRightFromLine className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{open ? "Close sidebar" : "Open sidebar"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-2 py-4 flex flex-col">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center px-3 py-2 text-sm transition-colors duration-200 group relative rounded-xl",
                  isActive
                    ? "text-text-primary font-medium"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-sidebar-item"
                    className="absolute inset-0 rounded-xl bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6)]"
                    initial={false}
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30,
                    }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-3">
                  <item.icon
                    className={cn(
                      "h-5 w-5 shrink-0 transition-colors",
                      isActive
                        ? "text-[var(--color-accent)]"
                        : "group-hover:text-[var(--color-accent)]/80",
                    )}
                  />
                  <span>{item.label}</span>
                  {/* Hover Glow Line (Content Width + Extension) */}
                  {!isActive && (
                    <div className="absolute -bottom-1 -left-2 -right-2 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent)] via-50% to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100 blur-[0.5px]" />
                  )}
                </span>
              </Link>
            );
          })}

          {/* Pawkits Nav Item with Collapsible Tree */}
          <div>
            <div
              className={cn(
                "flex items-center px-3 py-2 text-sm transition-colors duration-200 group relative rounded-xl cursor-pointer",
                isPawkitsActive
                  ? "text-text-primary font-medium"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              {isPawkitsActive && (
                <motion.div
                  layoutId="active-sidebar-item"
                  className="absolute inset-0 rounded-xl bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6)]"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30,
                  }}
                />
              )}
              <div className="relative z-10 flex items-center flex-1 min-w-0">
                <Link
                  href="/pawkits"
                  className="flex items-center flex-1 min-w-0"
                >
                  <span className="relative flex items-center gap-3">
                    <FolderOpen
                      className={cn(
                        "h-5 w-5 shrink-0 transition-colors",
                        isPawkitsActive
                          ? "text-[var(--color-accent)]"
                          : "group-hover:text-[var(--color-accent)]/80",
                      )}
                    />
                    <span>Pawkits</span>
                    {/* Hover Glow Line (Content Width) */}
                    {!isPawkitsActive && (
                      <div className="absolute -bottom-1 -left-2 -right-2 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent)] via-50% to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100 blur-[0.5px]" />
                    )}
                  </span>
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPawkitsExpanded(!pawkitsExpanded);
                  }}
                  className={cn(
                    "h-6 w-6 flex items-center justify-center rounded-xl shrink-0 ml-1",
                    "hover:bg-black/5 dark:hover:bg-white/10 transition-colors",
                    isPawkitsActive ? "text-text-primary" : "text-text-muted",
                  )}
                >
                  {pawkitsExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Collapsible Pawkits Tree */}
            <AnimatePresence initial={false}>
              {pawkitsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <SidebarContextMenu>
                    <div className="mt-1 pl-2">
                      <PawkitsTree />
                    </div>
                  </SidebarContextMenu>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Tags Nav Item */}
          <Link
            href="/tags"
            className={cn(
              "flex items-center px-3 py-2 text-sm transition-colors duration-200 group relative rounded-xl",
              pathname === "/tags"
                ? "text-text-primary font-medium"
                : "text-text-secondary hover:text-text-primary",
            )}
          >
            {pathname === "/tags" && (
              <motion.div
                layoutId="active-sidebar-item"
                className="absolute inset-0 rounded-xl bg-black/5 dark:bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.6)]"
                initial={false}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                }}
              />
            )}
            <span className="relative z-10 flex items-center gap-3">
              <Tags
                className={cn(
                  "h-5 w-5 shrink-0 transition-colors",
                  pathname === "/tags"
                    ? "text-[var(--color-accent)]"
                    : "group-hover:text-[var(--color-accent)]/80",
                )}
              />
              <span>Tags</span>
              {/* Hover Glow Line (Content Width + Extension) */}
              {pathname !== "/tags" && (
                <div className="absolute -bottom-1 -left-2 -right-2 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-accent)] via-50% to-transparent opacity-0 transition-all duration-300 group-hover:opacity-100 blur-[0.5px]" />
              )}
            </span>
          </Link>
        </nav>
      </div>

      <Separator className="bg-border-subtle" />

      {/* User Menu */}
      <div className="p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-bg-surface-3 text-text-secondary text-xs">
                  {workspace?.name?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm">
                {workspace?.name ?? "Workspace"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-56 bg-bg-surface-1 border-border-subtle"
          >
            <DropdownMenuItem
              onClick={() => router.push("/trash")}
              className="text-text-secondary focus:bg-bg-surface-2 focus:text-text-primary"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Trash
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push('/settings')}
              className="text-text-secondary focus:bg-bg-surface-2 focus:text-text-primary"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border-subtle" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-400 focus:bg-bg-surface-2 focus:text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
