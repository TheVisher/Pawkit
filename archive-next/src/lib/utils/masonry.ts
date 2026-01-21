/**
 * Masonry Layout Utility
 * Calculates optimal card positions for a Pinterest-style masonry layout
 * using a "shortest column first" algorithm
 */

export interface CardDimensions {
  id: string;
  height: number; // Estimated or measured height
}

export interface MasonryPosition {
  id: string;
  x: number;
  y: number;
  column: number;
}

export interface MasonryLayoutResult {
  positions: MasonryPosition[];
  columnHeights: number[];
  totalHeight: number;
}

/**
 * Default card height estimates based on content
 */
export const CARD_HEIGHT_ESTIMATES = {
  // Card with image
  withImage: 280,
  // Card without image (just icon/favicon)
  withoutImage: 180,
  // Card with long title (adds extra height)
  longTitleBonus: 24,
  // Card with tags (adds extra height per row)
  tagsBonus: 28,
} as const;

/**
 * Layout configuration
 */
export const MASONRY_CONFIG = {
  minCardWidth: 280,
  gap: 16,
  // Padding within cards (used for height estimation)
  cardPadding: 12,
} as const;

/**
 * Calculate the number of columns that fit in a container
 */
export function calculateColumnCount(
  containerWidth: number,
  minCardWidth: number = MASONRY_CONFIG.minCardWidth,
  gap: number = MASONRY_CONFIG.gap
): number {
  if (containerWidth <= 0) return 1;

  // Formula: containerWidth >= columns * minCardWidth + (columns - 1) * gap
  // Solve for columns: columns <= (containerWidth + gap) / (minCardWidth + gap)
  const columns = Math.floor((containerWidth + gap) / (minCardWidth + gap));
  return Math.max(1, columns);
}

/**
 * Calculate the actual card width based on container and column count
 */
export function calculateCardWidth(
  containerWidth: number,
  columnCount: number,
  gap: number = MASONRY_CONFIG.gap
): number {
  if (columnCount <= 0) return containerWidth;

  // Total gap space = (columns - 1) * gap
  const totalGapSpace = (columnCount - 1) * gap;
  const availableWidth = containerWidth - totalGapSpace;
  return availableWidth / columnCount;
}

/**
 * Estimate card height based on content
 * This is used for initial layout before actual measurements
 */
export function estimateCardHeight(card: {
  image?: string | null;
  title?: string | null;
  tags?: string[] | null;
}): number {
  let height = card.image ? CARD_HEIGHT_ESTIMATES.withImage : CARD_HEIGHT_ESTIMATES.withoutImage;

  // Add bonus for long titles (rough estimate: > 50 chars = 2 lines)
  if (card.title && card.title.length > 50) {
    height += CARD_HEIGHT_ESTIMATES.longTitleBonus;
  }

  // Add bonus for tags
  if (card.tags && card.tags.length > 0) {
    // Estimate rows: ~3 tags per row at typical card width
    const tagRows = Math.ceil(card.tags.length / 3);
    height += tagRows * MASONRY_CONFIG.cardPadding;
  }

  return height;
}

/**
 * Calculate masonry layout positions
 * Uses "shortest column first" algorithm for optimal packing
 *
 * @param cards - Array of card dimensions (id + height)
 * @param columnCount - Number of columns
 * @param cardWidth - Width of each card
 * @param gap - Gap between cards
 * @returns Layout result with positions and total height
 */
export function calculateMasonryLayout(
  cards: CardDimensions[],
  columnCount: number,
  cardWidth: number,
  gap: number = MASONRY_CONFIG.gap
): MasonryLayoutResult {
  // Initialize column heights to 0
  const columnHeights = new Array(columnCount).fill(0);
  const positions: MasonryPosition[] = [];

  for (const card of cards) {
    // Find the shortest column
    let shortestColumnIndex = 0;
    let minHeight = columnHeights[0];

    for (let i = 1; i < columnCount; i++) {
      if (columnHeights[i] < minHeight) {
        minHeight = columnHeights[i];
        shortestColumnIndex = i;
      }
    }

    // Calculate position
    const x = shortestColumnIndex * (cardWidth + gap);
    const y = columnHeights[shortestColumnIndex];

    positions.push({
      id: card.id,
      x,
      y,
      column: shortestColumnIndex,
    });

    // Update column height
    columnHeights[shortestColumnIndex] += card.height + gap;
  }

  // Remove the trailing gap from the total height
  const totalHeight = Math.max(...columnHeights) - gap;

  return {
    positions,
    columnHeights,
    totalHeight: Math.max(0, totalHeight),
  };
}

/**
 * Create a position map for quick lookup
 */
export function createPositionMap(
  positions: MasonryPosition[]
): Map<string, MasonryPosition> {
  return new Map(positions.map((p) => [p.id, p]));
}

/**
 * Recalculate layout after a card is moved (drag-and-drop)
 * This maintains reading order (left-to-right, top-to-bottom)
 */
export function recalculateLayoutAfterMove(
  cards: CardDimensions[],
  movedCardId: string,
  targetColumn: number,
  targetIndex: number,
  columnCount: number,
  cardWidth: number,
  gap: number = MASONRY_CONFIG.gap
): MasonryLayoutResult {
  // First, organize cards by column
  const cardsByColumn: CardDimensions[][] = Array.from(
    { length: columnCount },
    () => []
  );

  // Calculate initial layout to get column assignments
  const initialLayout = calculateMasonryLayout(cards, columnCount, cardWidth, gap);
  const positionMap = createPositionMap(initialLayout.positions);

  // Organize by column
  for (const card of cards) {
    if (card.id === movedCardId) continue; // Skip the moved card for now
    const position = positionMap.get(card.id);
    if (position) {
      cardsByColumn[position.column].push(card);
    }
  }

  // Sort cards in each column by their Y position
  for (const column of cardsByColumn) {
    column.sort((a, b) => {
      const posA = positionMap.get(a.id);
      const posB = positionMap.get(b.id);
      return (posA?.y || 0) - (posB?.y || 0);
    });
  }

  // Insert the moved card at the target position
  const movedCard = cards.find((c) => c.id === movedCardId);
  if (movedCard) {
    const clampedColumn = Math.max(0, Math.min(targetColumn, columnCount - 1));
    const clampedIndex = Math.max(
      0,
      Math.min(targetIndex, cardsByColumn[clampedColumn].length)
    );
    cardsByColumn[clampedColumn].splice(clampedIndex, 0, movedCard);
  }

  // Rebuild the card order (left-to-right reading order)
  const reorderedCards: CardDimensions[] = [];
  const maxLength = Math.max(...cardsByColumn.map((c) => c.length));

  for (let row = 0; row < maxLength; row++) {
    for (let col = 0; col < columnCount; col++) {
      if (cardsByColumn[col][row]) {
        reorderedCards.push(cardsByColumn[col][row]);
      }
    }
  }

  // Recalculate layout with new order
  return calculateMasonryLayout(reorderedCards, columnCount, cardWidth, gap);
}

/**
 * Get CSS transform for a position
 */
export function getPositionTransform(position: MasonryPosition): string {
  return `translate3d(${position.x}px, ${position.y}px, 0)`;
}

/**
 * Check if layout needs recalculation
 * (e.g., when container width changes significantly)
 */
export function shouldRecalculateLayout(
  prevColumnCount: number,
  newColumnCount: number
): boolean {
  return prevColumnCount !== newColumnCount;
}
