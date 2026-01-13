"use client";

import React, { useState, useEffect, memo } from "react";
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
  RefreshCw,
  Check,
  Plus,
  Pencil,
  Star,
} from "lucide-react";
import { PawkitsTree } from "@/components/pawkits/pawkits-tree";
import { SidebarContextMenu } from "@/components/context-menus";
import { useLeftSidebar, useRightSidebarSettings } from "@/lib/stores/ui-store";
import { useCurrentWorkspace, useWorkspaces, useWorkspaceStore } from "@/lib/stores/workspace-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useSyncStore } from "@/lib/stores/sync-store";
import { getClient } from "@/lib/supabase/client";
import { fullSync } from "@/lib/services";
import { retryFailedItems } from "@/lib/services/sync-queue";
import { useDataStore } from "@/lib/stores/data-store";
import { usePrefetch } from "@/lib/hooks/use-prefetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// Isolated component for sync menu item - prevents sidebar re-renders on sync status changes
const SyncMenuItem = memo(function SyncMenuItem({ workspaceId }: { workspaceId?: string }) {
  const isSyncing = useSyncStore((s) => s.status === 'syncing');

  const handleSync = async () => {
    // First retry any failed local pushes
    await retryFailedItems();
    // Then do a full sync (push pending + pull from server)
    await fullSync();
    if (workspaceId) {
      await useDataStore.getState().loadAll(workspaceId);
    }
  };

  return (
    <DropdownMenuItem
      onClick={handleSync}
      disabled={isSyncing}
      className="text-text-secondary focus:bg-bg-surface-2 focus:text-text-primary"
    >
      <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
      {isSyncing ? "Syncing..." : "Sync"}
    </DropdownMenuItem>
  );
});

export function LeftSidebar() {
  const [mounted, setMounted] = useState(false);
  const [pawkitsExpanded, setPawkitsExpanded] = useState(true);
  const [renamingWorkspaceId, setRenamingWorkspaceId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, isAnchored, toggleAnchored, setOpen } = useLeftSidebar();
  const { toggleSettings } = useRightSidebarSettings();
  const workspace = useCurrentWorkspace();
  const workspaces = useWorkspaces();
  const switchWorkspace = useWorkspaceStore((s) => s.switchWorkspace);
  const createWorkspace = useWorkspaceStore((s) => s.createWorkspace);
  const updateWorkspace = useWorkspaceStore((s) => s.updateWorkspace);
  const deleteWorkspace = useWorkspaceStore((s) => s.deleteWorkspace);
  const user = useAuthStore((s) => s.user);
  const { prefetchOnInteraction } = usePrefetch();

  const handleCreateWorkspace = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user?.id) return;
    const name = `Workspace ${workspaces.length + 1}`;
    await createWorkspace(name, user.id);
  };

  const handleRenameWorkspace = async (id: string) => {
    if (!renameValue.trim()) {
      setRenamingWorkspaceId(null);
      return;
    }
    await updateWorkspace(id, { name: renameValue.trim() });
    setRenamingWorkspaceId(null);
    setRenameValue("");
  };

  const handleDeleteWorkspace = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const ws = workspaces.find((w) => w.id === id);
    if (ws?.isDefault) {
      alert("Cannot delete default workspace. Set another workspace as default first.");
      return;
    }
    if (workspaces.length <= 1) {
      alert("Cannot delete your only workspace");
      return;
    }
    const confirmed = confirm(`Delete "${ws?.name}"?\n\nThis will permanently delete this workspace and all its contents.`);
    if (!confirmed) return;
    await deleteWorkspace(id);
  };

  const startRename = (e: React.MouseEvent, ws: { id: string; name: string }) => {
    e.preventDefault();
    e.stopPropagation();
    setRenamingWorkspaceId(ws.id);
    setRenameValue(ws.name);
  };

  const handleSetDefault = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    // Remove default from current default workspace
    const currentDefault = workspaces.find((w) => w.isDefault);
    if (currentDefault && currentDefault.id !== id) {
      await updateWorkspace(currentDefault.id, { isDefault: false });
    }
    // Set new default
    await updateWorkspace(id, { isDefault: true });
  };

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
                {...prefetchOnInteraction(item.href)}
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
                      stiffness: 300,
                      damping: 25,
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
                    stiffness: 300,
                    damping: 25,
                  }}
                />
              )}
              <div className="relative z-10 flex items-center flex-1 min-w-0">
                <Link
                  href="/pawkits"
                  {...prefetchOnInteraction("/pawkits")}
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
            {...prefetchOnInteraction("/tags")}
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
                  stiffness: 300,
                  damping: 25,
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
        {/* Only render DropdownMenu after mount to prevent Radix ID hydration mismatch */}
        {mounted ? (
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
            {/* Workspace Switcher */}
            {workspaces.length >= 1 && (
              <>
                <div className="px-2 py-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-text-muted">Workspaces</span>
                  <button
                    onClick={handleCreateWorkspace}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-bg-surface-2 text-text-muted hover:text-text-primary transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {workspaces.map((ws) => (
                  <div key={ws.id} className="group relative">
                    {renamingWorkspaceId === ws.id ? (
                      <div className="px-2 py-1">
                        <Input
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRenameWorkspace(ws.id);
                            if (e.key === "Escape") setRenamingWorkspaceId(null);
                          }}
                          onBlur={() => handleRenameWorkspace(ws.id)}
                          autoFocus
                          className="h-7 text-sm bg-bg-surface-2 border-border-subtle"
                        />
                      </div>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => switchWorkspace(ws.id)}
                        className="text-text-secondary focus:bg-bg-surface-2 focus:text-text-primary pr-12"
                      >
                        <div className="mr-2 h-4 w-4 flex items-center justify-center shrink-0">
                          {ws.id === workspace?.id && (
                            <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                          )}
                        </div>
                        <span className="truncate">{ws.name}</span>
                      </DropdownMenuItem>
                    )}
                    {/* Hover actions - order: pencil, trash, star (star always far right) */}
                    {renamingWorkspaceId !== ws.id && (
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0">
                        <button
                          onClick={(e) => startRename(e, ws)}
                          className="h-5 w-5 flex items-center justify-center rounded hover:bg-bg-surface-3 text-text-muted hover:text-text-primary transition-colors"
                          title="Rename"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                        </button>
                        {workspaces.length > 1 && (
                          <button
                            onClick={(e) => handleDeleteWorkspace(e, ws.id)}
                            className="h-5 w-5 flex items-center justify-center rounded hover:bg-red-500/20 text-text-muted hover:text-red-400 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                        )}
                        <button
                          onClick={(e) => !ws.isDefault && handleSetDefault(e, ws.id)}
                          className={`h-5 w-5 flex items-center justify-center rounded transition-colors ${
                            ws.isDefault
                              ? "text-yellow-400 cursor-default"
                              : "text-text-muted hover:text-yellow-400 hover:bg-yellow-500/20"
                          }`}
                          title={ws.isDefault ? "Default workspace" : "Set as default"}
                        >
                          <Star className={`h-2.5 w-2.5 ${ws.isDefault ? "fill-yellow-400" : ""}`} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <DropdownMenuSeparator className="bg-border-subtle" />
              </>
            )}
            <SyncMenuItem workspaceId={workspace?.id} />
            <DropdownMenuItem
              onClick={() => router.push("/trash")}
              className="text-text-secondary focus:bg-bg-surface-2 focus:text-text-primary"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Trash
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={toggleSettings}
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
        ) : (
          // Static fallback during SSR/hydration
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-bg-surface-3 text-text-secondary text-xs">
                U
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">Workspace</span>
          </Button>
        )}
      </div>
    </div>
  );
}
