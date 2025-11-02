"use client";

import { useMemo, useEffect } from "react";
import { CollectionsGrid } from "@/components/pawkits/grid";
import { usePanelStore } from "@/lib/hooks/use-panel-store";
import { FolderOpen } from "lucide-react";
import { CardModel, CollectionNode } from "@/lib/types";

// Import the same fake data from the library demo
const FAKE_CARDS: CardModel[] = [
  // Tech Articles
  {
    id: "card-1",
    type: "url",
    url: "https://react.dev/blog/2024/04/25/react-19",
    title: "React 19 Release Candidate - What's New",
    notes: "Key changes: Actions, use() hook, better SSR streaming. Need to test this in our app.",
    content: null,
    status: "READY",
    tags: ["react", "web-dev", "javascript"],
    collections: ["tech-articles"],
    domain: "react.dev",
    image: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=400&fit=crop",
    description: "React 19 brings exciting new features including Actions, the use() hook, and improved server streaming capabilities.",
    metadata: {},
    articleContent: null,
    pinned: true,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "card-2",
    type: "url",
    url: "https://vercel.com/blog/vercel-ai-sdk-3",
    title: "Vercel AI SDK 3.0: Building AI Applications Made Simple",
    notes: null,
    content: null,
    status: "READY",
    tags: ["ai", "development", "typescript"],
    collections: ["tech-articles", "ai-ml"],
    domain: "vercel.com",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop",
    description: "The new Vercel AI SDK makes it easier than ever to build AI-powered applications with streaming, tool calling, and more.",
    metadata: {},
    articleContent: null,
    pinned: false,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "card-3",
    type: "url",
    url: "https://tailwindcss.com/blog/tailwindcss-v4-alpha",
    title: "Tailwind CSS v4.0 Alpha: A New Engine",
    notes: "Performance improvements look amazing! 10x faster builds.",
    content: null,
    status: "READY",
    tags: ["css", "tailwind", "web-dev"],
    collections: ["tech-articles", "design-resources"],
    domain: "tailwindcss.com",
    image: "https://images.unsplash.com/photo-1507721999472-8ed4421c4af2?w=800&h=400&fit=crop",
    description: "Tailwind CSS v4.0 features a brand new engine built in Rust, delivering 10x faster build times and improved developer experience.",
    metadata: {},
    articleContent: null,
    pinned: false,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "card-4",
    type: "url",
    url: "https://dribbble.com/shots/23456789",
    title: "Modern Dashboard UI Design - Glassmorphism",
    notes: "Love this glassmorphism style. Could use for our redesign.",
    content: null,
    status: "READY",
    tags: ["design", "ui", "inspiration"],
    collections: ["design-resources"],
    domain: "dribbble.com",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&h=400&fit=crop",
    description: "Beautiful glassmorphism dashboard design with smooth animations and modern aesthetics.",
    metadata: {},
    articleContent: null,
    pinned: false,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "card-5",
    type: "url",
    url: "https://www.figma.com/community/file/1234567890",
    title: "Free Design System - Components & Tokens",
    notes: null,
    content: null,
    status: "READY",
    tags: ["design-system", "figma", "ui"],
    collections: ["design-resources"],
    domain: "figma.com",
    image: "https://images.unsplash.com/photo-1609921212029-bb5a28e60960?w=800&h=400&fit=crop",
    description: "Complete design system with components, tokens, and documentation. Ready to use in your next project.",
    metadata: {},
    articleContent: null,
    pinned: true,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "card-6",
    type: "url",
    url: "https://www.seriouseats.com/perfect-pan-pizza",
    title: "The Best Pan Pizza You'll Ever Make",
    notes: "Tried this last weekend - absolutely incredible! The crispy edges are perfect.",
    content: null,
    status: "READY",
    tags: ["recipe", "pizza", "cooking"],
    collections: ["recipes"],
    domain: "seriouseats.com",
    image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=400&fit=crop",
    description: "This pan pizza recipe delivers crispy, golden edges and a pillowy soft center. Better than delivery!",
    metadata: {},
    articleContent: null,
    pinned: false,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "card-7",
    type: "url",
    url: "https://www.bonappetit.com/recipe/spicy-miso-ramen",
    title: "30-Minute Spicy Miso Ramen",
    notes: null,
    content: null,
    status: "READY",
    tags: ["recipe", "ramen", "quick-meals"],
    collections: ["recipes"],
    domain: "bonappetit.com",
    image: "https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=800&h=400&fit=crop",
    description: "Quick and flavorful miso ramen that rivals your favorite restaurant. Perfect for busy weeknights.",
    metadata: {},
    articleContent: null,
    pinned: true,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "card-14",
    type: "url",
    url: "https://www.lonelyplanet.com/japan/kyoto",
    title: "Complete Guide to Kyoto: Temples, Gardens & Food",
    notes: "Planning trip for spring 2025. Must visit: Fushimi Inari, Arashiyama Bamboo Grove.",
    content: null,
    status: "READY",
    tags: ["travel", "japan", "planning"],
    collections: ["travel"],
    domain: "lonelyplanet.com",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&h=400&fit=crop",
    description: "Comprehensive guide to exploring Kyoto's ancient temples, stunning gardens, and incredible food scene.",
    metadata: {},
    articleContent: null,
    pinned: true,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "card-16",
    type: "url",
    url: "https://nesslabs.com/time-management",
    title: "Time Management for Makers: Deep Work Strategies",
    notes: "Implementing the 'maker schedule' starting next week. Block morning for deep work.",
    content: null,
    status: "READY",
    tags: ["productivity", "time-management", "deep-work"],
    collections: ["productivity"],
    domain: "nesslabs.com",
    image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=800&h=400&fit=crop",
    description: "How to structure your day for maximum creative output and minimize context switching.",
    metadata: {},
    articleContent: null,
    pinned: false,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "card-18",
    type: "url",
    url: "https://openai.com/research/gpt-4",
    title: "GPT-4 Technical Report",
    notes: "Key insights: multimodal capabilities, improved reasoning, safety considerations.",
    content: null,
    status: "READY",
    tags: ["ai", "ml", "research"],
    collections: ["ai-ml"],
    domain: "openai.com",
    image: "https://images.unsplash.com/photo-1677756119517-756a188d2d94?w=800&h=400&fit=crop",
    description: "Official technical report on GPT-4's capabilities, limitations, and architectural improvements.",
    metadata: {},
    articleContent: null,
    pinned: false,
    deleted: false,
    deletedAt: null,
    inDen: false,
    encryptedContent: null,
    scheduledDate: null,
    createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const FAKE_COLLECTIONS: CollectionNode[] = [
  {
    id: "coll-1",
    name: "Tech Articles",
    slug: "tech-articles",
    parentId: null,
    coverImage: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?w=400&h=200&fit=crop",
    coverImagePosition: 50,
    pinned: true,
    deleted: false,
    inDen: false,
    isPrivate: false,
    isSystem: false,
    hidePreview: false,
    useCoverAsBackground: true,
    userId: "demo-user",
    createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    children: [],
  },
  {
    id: "coll-2",
    name: "Design Resources",
    slug: "design-resources",
    parentId: null,
    coverImage: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&h=200&fit=crop",
    coverImagePosition: 50,
    pinned: true,
    deleted: false,
    inDen: false,
    isPrivate: false,
    isSystem: false,
    hidePreview: false,
    useCoverAsBackground: true,
    userId: "demo-user",
    createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString(),
    children: [],
  },
  {
    id: "coll-3",
    name: "Recipes",
    slug: "recipes",
    parentId: null,
    coverImage: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=200&fit=crop",
    coverImagePosition: 50,
    pinned: false,
    deleted: false,
    inDen: false,
    isPrivate: false,
    isSystem: false,
    hidePreview: false,
    useCoverAsBackground: true,
    userId: "demo-user",
    createdAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString(),
    children: [],
  },
  {
    id: "coll-7",
    name: "Travel",
    slug: "travel",
    parentId: null,
    coverImage: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=200&fit=crop",
    coverImagePosition: 50,
    pinned: true,
    deleted: false,
    inDen: false,
    isPrivate: false,
    isSystem: false,
    hidePreview: false,
    useCoverAsBackground: true,
    userId: "demo-user",
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    children: [],
  },
  {
    id: "coll-8",
    name: "Productivity",
    slug: "productivity",
    parentId: null,
    coverImage: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400&h=200&fit=crop",
    coverImagePosition: 50,
    pinned: false,
    deleted: false,
    inDen: false,
    isPrivate: false,
    isSystem: false,
    hidePreview: false,
    useCoverAsBackground: false,
    userId: "demo-user",
    createdAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString(),
    children: [],
  },
  {
    id: "coll-9",
    name: "AI & ML",
    slug: "ai-ml",
    parentId: null,
    coverImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=200&fit=crop",
    coverImagePosition: 50,
    pinned: false,
    deleted: false,
    inDen: false,
    isPrivate: false,
    isSystem: false,
    hidePreview: false,
    useCoverAsBackground: false,
    userId: "demo-user",
    createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString(),
    children: [],
  },
];

export default function DemoPawkitsPage() {
  const setContentType = usePanelStore((state) => state.setContentType);

  // Memoize the fake data
  const cards = useMemo(() => FAKE_CARDS, []);
  const collections = useMemo(() => FAKE_COLLECTIONS, []);

  // Set the right panel content to show pawkits controls
  useEffect(() => {
    setContentType("pawkits-controls");
  }, [setContentType]);

  // Create grid items from fake collections
  const { gridItems, allPawkits } = useMemo(() => {
    // Flatten all pawkits
    const flattenPawkits = (nodes: typeof collections, result: any[] = []): any[] => {
      for (const node of nodes) {
        result.push({ id: node.id, name: node.name, slug: node.slug });
        if (node.children?.length) {
          flattenPawkits(node.children, result);
        }
      }
      return result;
    };

    const allPawkits = flattenPawkits(collections);

    // Create grid items with preview cards
    const gridItems = collections.map((root) => {
      const pawkitCards = cards.filter(
        (card) => card.collections.includes(root.slug) && card.deleted !== true
      );

      return {
        id: root.id,
        name: root.name,
        slug: root.slug,
        count: pawkitCards.length,
        cards: pawkitCards,
        isPinned: root.pinned,
        isPrivate: root.isPrivate,
        isSystem: root.isSystem,
        hidePreview: root.hidePreview,
        useCoverAsBackground: root.useCoverAsBackground,
        coverImage: root.coverImage,
        hasChildren: root.children && root.children.length > 0,
      };
    })
      // Sort: System Pawkits first, then pinned, then by name
      .sort((a, b) => {
        if (a.isSystem && !b.isSystem) return -1;
        if (!a.isSystem && b.isSystem) return 1;
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return a.name.localeCompare(b.name);
      });

    return { gridItems, allPawkits };
  }, [collections, cards]);

  return (
    <>
      <div className="space-y-10">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <FolderOpen className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Pawkits Demo</h1>
            <p className="text-sm text-muted-foreground">
              Organize cards into visual groups. Click a Pawkit to view its contents.
            </p>
          </div>
        </div>

        <CollectionsGrid collections={gridItems} allPawkits={allPawkits} />

        <section className="rounded-lg border border-gray-800 bg-gray-900/40 p-6">
          <h2 className="text-lg font-semibold text-gray-100 mb-2">About Pawkits</h2>
          <p className="text-sm text-gray-400">
            This demo showcases {collections.length} collections with preview cards. Each Pawkit displays
            up to 4 preview cards and shows the total count. Click on any Pawkit to filter the library view.
          </p>
        </section>
      </div>
    </>
  );
}
