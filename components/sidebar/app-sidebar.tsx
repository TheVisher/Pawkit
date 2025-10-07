"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, Home, Library, FolderOpen, FileText, Trash2, Star, History, HelpCircle, User, Layers } from "lucide-react";
import { type CollectionNode } from "@/lib/types";
import { ProfileModal } from "@/components/modals/profile-modal";
import { DogHouseIcon } from "@/components/icons/dog-house";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type AppSidebarProps = {
  username: string;
  displayName?: string | null;
  collections: CollectionNode[];
};

const navigationItems = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/library", label: "Library", icon: Library },
  { href: "/notes", label: "Notes", icon: FileText },
  { href: "/den", label: "The Den", icon: DogHouseIcon },
  { href: "/distill", label: "Dig Up", icon: Layers },
];

const bottomItems = [
  { href: "/changelog", label: "Changelog", icon: History },
  { href: "/trash", label: "Trash", icon: Trash2 },
  { href: "/help", label: "Help", icon: HelpCircle },
];

export function AppSidebar({ username, displayName, collections }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPawkitsExpanded, setIsPawkitsExpanded] = React.useState(false);
  const [expandedCollections, setExpandedCollections] = React.useState<Set<string>>(new Set());
  const [showProfileModal, setShowProfileModal] = React.useState(false);

  // Load Pawkits expansion state from localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem('pawkits-collections-expanded');
    if (saved === 'true') {
      setIsPawkitsExpanded(true);
    }
  }, []);

  // Save Pawkits expansion state to localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem('pawkits-collections-expanded', String(isPawkitsExpanded));
  }, [isPawkitsExpanded]);

  // Load expanded collections from localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem('pawkits-expanded-collections');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setExpandedCollections(new Set(parsed.filter((item): item is string => typeof item === 'string')));
      }
    } catch {
      // ignore malformed state
    }
  }, []);

  // Save expanded collections to localStorage
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem('pawkits-expanded-collections', JSON.stringify(Array.from(expandedCollections)));
  }, [expandedCollections]);

  const isActive = React.useCallback((href: string) => {
    if (!pathname) return false;
    if (href === "/home" && (pathname === "/" || pathname === "/home")) {
      return true;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }, [pathname]);

  const toggleCollection = (id: string) => {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/home">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <img src="/logo.png" alt="Pawkit" className="w-8 h-8" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Pawkit</span>
                  <span className="truncate text-xs">Knowledge Manager</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={isActive(item.href)}>
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {/* Pawkits */}
              <Collapsible open={isPawkitsExpanded} onOpenChange={setIsPawkitsExpanded}>
                <SidebarMenuItem>
                  <div className="flex w-full items-center">
                    <SidebarMenuButton asChild isActive={isActive("/pawkits")} className="flex-1">
                      <Link href="/pawkits">
                        <FolderOpen />
                        <span>Pawkits</span>
                      </Link>
                    </SidebarMenuButton>
                    {collections && collections.length > 0 && (
                      <CollapsibleTrigger asChild>
                        <button
                          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                          onClick={(e) => {
                            e.preventDefault();
                            setIsPawkitsExpanded(!isPawkitsExpanded);
                          }}
                        >
                          <ChevronRight className={`h-4 w-4 transition-transform ${isPawkitsExpanded ? 'rotate-90' : ''}`} />
                        </button>
                      </CollapsibleTrigger>
                    )}
                  </div>
                </SidebarMenuItem>
                {collections && collections.length > 0 && (
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {collections.map((collection) => {
                        const hasChildren = collection.children && collection.children.length > 0;
                        const isExpanded = expandedCollections.has(collection.id);
                        const isCollectionActive = pathname === `/pawkits/${collection.slug}`;

                        return (
                          <Collapsible
                            key={collection.id}
                            open={isExpanded}
                            onOpenChange={() => hasChildren && toggleCollection(collection.id)}
                          >
                            <SidebarMenuSubItem>
                              <div className="flex w-full items-center">
                                <SidebarMenuSubButton asChild isActive={isCollectionActive} className="flex-1">
                                  <Link href={`/pawkits/${collection.slug}`}>
                                    <FolderOpen className="h-4 w-4" />
                                    <span>{collection.name}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                                {hasChildren && (
                                  <CollapsibleTrigger asChild>
                                    <button
                                      className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        toggleCollection(collection.id);
                                      }}
                                    >
                                      <ChevronRight className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                    </button>
                                  </CollapsibleTrigger>
                                )}
                              </div>
                            </SidebarMenuSubItem>
                            {hasChildren && (
                              <CollapsibleContent>
                                <SidebarMenuSub className="ml-4">
                                  {collection.children.map((child) => (
                                    <SidebarMenuSubItem key={child.id}>
                                      <SidebarMenuSubButton asChild isActive={pathname === `/pawkits/${child.slug}`}>
                                        <Link href={`/pawkits/${child.slug}`}>
                                          <span>{child.name}</span>
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  ))}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            )}
                          </Collapsible>
                        );
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                )}
              </Collapsible>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" onClick={() => setShowProfileModal(true)}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white font-semibold text-sm">
                {(displayName || username).charAt(0).toUpperCase()}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName || username}</span>
                <span className="truncate text-xs text-muted-foreground">View profile</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
        <SidebarMenu>
          {bottomItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton asChild size="sm" isActive={isActive(item.href)}>
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>

      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        username={username}
      />
    </Sidebar>
  );
}
