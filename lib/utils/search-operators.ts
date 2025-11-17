/**
 * Search Operators for Advanced Filtering
 *
 * Supported operators:
 * - tag:work - Filter by tag
 * - type:note - Filter by type (note, url, md-note, text-note)
 * - date:today - Filter by date (today, yesterday, week, month)
 * - in:pawkit-name - Filter by collection/pawkit
 * - is:favorite - Filter by status (favorite, archived, trashed)
 */

import { CardModel } from "@/lib/types";
import { startOfDay, subDays, isAfter } from "date-fns";

export interface SearchOperator {
  type: "tag" | "type" | "date" | "in" | "is" | "text";
  value: string;
}

export interface SearchQuery {
  operators: SearchOperator[];
  textSearch: string;
}

/**
 * Parse search query into operators and text search
 */
export function parseSearchQuery(query: string): SearchQuery {
  const operators: SearchOperator[] = [];
  let textSearch = query;

  // Extract tag: operators
  const tagMatches = query.matchAll(/tag:(\S+)/g);
  for (const match of tagMatches) {
    operators.push({ type: "tag", value: match[1] });
    textSearch = textSearch.replace(match[0], "").trim();
  }

  // Extract type: operators
  const typeMatches = query.matchAll(/type:(\S+)/g);
  for (const match of typeMatches) {
    operators.push({ type: "type", value: match[1] });
    textSearch = textSearch.replace(match[0], "").trim();
  }

  // Extract date: operators
  const dateMatches = query.matchAll(/date:(\S+)/g);
  for (const match of dateMatches) {
    operators.push({ type: "date", value: match[1] });
    textSearch = textSearch.replace(match[0], "").trim();
  }

  // Extract in: operators (for collections)
  const inMatches = query.matchAll(/in:(\S+)/g);
  for (const match of inMatches) {
    operators.push({ type: "in", value: match[1].replace(/-/g, " ") });
    textSearch = textSearch.replace(match[0], "").trim();
  }

  // Extract is: operators (for status)
  const isMatches = query.matchAll(/is:(\S+)/g);
  for (const match of isMatches) {
    operators.push({ type: "is", value: match[1] });
    textSearch = textSearch.replace(match[0], "").trim();
  }

  return { operators, textSearch };
}

/**
 * Filter cards based on search query with operators
 */
export function filterCardsWithOperators(
  cards: CardModel[],
  query: string
): CardModel[] {
  const { operators, textSearch } = parseSearchQuery(query);

  let filtered = [...cards];

  // Apply operator filters
  for (const operator of operators) {
    switch (operator.type) {
      case "tag":
        filtered = filtered.filter((card) => {
          const tags = card.tags || [];
          return tags.some((tag) =>
            tag.toLowerCase().includes(operator.value.toLowerCase())
          );
        });
        break;

      case "type":
        filtered = filtered.filter((card) => {
          const typeMap: Record<string, string[]> = {
            note: ["md-note", "text-note"],
            url: ["url"],
            markdown: ["md-note"],
            text: ["text-note"],
          };
          const allowedTypes = typeMap[operator.value.toLowerCase()] || [operator.value];
          return allowedTypes.includes(card.type);
        });
        break;

      case "date":
        filtered = filtered.filter((card) => {
          const cardDate = new Date(card.createdAt);
          const now = new Date();
          const today = startOfDay(now);

          switch (operator.value.toLowerCase()) {
            case "today":
              return cardDate >= today;
            case "yesterday":
              const yesterday = subDays(today, 1);
              return cardDate >= yesterday && cardDate < today;
            case "week":
              const weekAgo = subDays(today, 7);
              return cardDate >= weekAgo;
            case "month":
              const monthAgo = subDays(today, 30);
              return cardDate >= monthAgo;
            default:
              return true;
          }
        });
        break;

      case "in":
        filtered = filtered.filter((card) => {
          const collections = card.collections || [];
          return collections.some((col) =>
            col.toLowerCase().includes(operator.value.toLowerCase())
          );
        });
        break;

      case "is":
        filtered = filtered.filter((card) => {
          switch (operator.value.toLowerCase()) {
            case "favorite":
            case "starred":
            case "pinned":
              return card.pinned === true;
            case "trashed":
            case "deleted":
              return card.deleted === true;
            case "den":
              return card.collections?.includes('the-den') === true;
            default:
              return true;
          }
        });
        break;
    }
  }

  // Apply text search if present
  if (textSearch) {
    const lowerSearch = textSearch.toLowerCase();
    filtered = filtered.filter((card) => {
      const title = (card.title || "").toLowerCase();
      const url = (card.url || "").toLowerCase();
      const content = (card.content || "").toLowerCase();
      const domain = (card.domain || "").toLowerCase();
      const tags = (card.tags || []).join(" ").toLowerCase();

      return (
        title.includes(lowerSearch) ||
        url.includes(lowerSearch) ||
        content.includes(lowerSearch) ||
        domain.includes(lowerSearch) ||
        tags.includes(lowerSearch)
      );
    });
  }

  return filtered;
}
