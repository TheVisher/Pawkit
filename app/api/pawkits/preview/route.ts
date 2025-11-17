import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/utils/api-error";
import { unauthorized, success } from "@/lib/utils/api-responses";
import { getCurrentUser } from "@/lib/auth/get-user";
import { countCards, listCards, type CardDTO } from "@/lib/server/cards";
import { listCollections, type CollectionDTO } from "@/lib/server/collections";
import { prisma } from "@/lib/server/prisma";
import { parseJsonArray } from "@/lib/utils/json";
import { safeHost } from "@/lib/utils/strings";
import type { PrismaCard } from "@/lib/types";

function flattenCollections(nodes: CollectionDTO[]): CollectionDTO[] {
  const result: CollectionDTO[] = [];
  for (const node of nodes) {
    result.push(node);
    if (node.children?.length) {
      result.push(...flattenCollections(node.children));
    }
  }
  return result;
}

export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
    if (!user) {
      return unauthorized();
    }

    const [{ tree }, rootCards, totals] = await Promise.all([
      listCollections(user.id),
      listCards(user.id, { limit: 6 }),
      countCards(user.id)
    ]);

    const flatCollections = flattenCollections(tree);

    // Batch fetch all cards at once to avoid N+1 queries
    const allCardsRaw = await prisma.card.findMany({
      where: { userId: user.id, deleted: false, inDen: false },
      orderBy: { createdAt: "desc" }
    });

    const cardsByCollection = new Map<string, typeof allCardsRaw>();

    // Group cards by collection slug
    for (const card of allCardsRaw) {
      const collections = parseJsonArray(card.collections);
      for (const collectionSlug of collections) {
        let collectionCards = cardsByCollection.get(collectionSlug);
        if (!collectionCards) {
          collectionCards = [];
          cardsByCollection.set(collectionSlug, collectionCards);
        }
        collectionCards.push(card);
      }
    }

    const previewData = flatCollections.map((node) => {
      const cards = (cardsByCollection.get(node.slug) || []).slice(0, 6);
      return {
        id: node.id,
        name: node.name,
        slug: node.slug,
        count: cards.length,
        hasChildren: (node.children && node.children.length > 0) || false,
        isPinned: node.pinned || false,
        cards: cards.map((card: PrismaCard) => ({
          id: card.id,
          title: card.title,
          url: card.url,
          image: card.image ?? null,
          domain: card.domain ?? safeHost(card.url)
        }))
      };
    });

    const rootPreview = {
      id: "all-cards",
      name: "All cards",
      slug: null,
      count: totals.total,
      cards: rootCards.items.map((card: CardDTO) => ({
        id: card.id,
        title: card.title,
        url: card.url,
        image: card.image ?? null,
        domain: card.domain ?? safeHost(card.url)
      }))
    };

    const gridItems = [rootPreview, ...previewData];

    // Get only root-level pawkits for the move modal
    const allPawkits = tree.map((node) => ({
      id: node.id,
      name: node.name,
      slug: node.slug,
    }));

    return success({ gridItems, allPawkits });
  } catch (error) {
    return handleApiError(error, { route: '/api/pawkits/preview', userId: user?.id });
  }
}
