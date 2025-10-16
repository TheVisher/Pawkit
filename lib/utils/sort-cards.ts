import type { CardModel } from "@/lib/types";
import type { SortBy, SortOrder } from "@/lib/hooks/view-settings-store";

export function sortCards(cards: CardModel[], sortBy: SortBy, sortOrder: SortOrder): CardModel[] {
  const sorted = [...cards];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "createdAt":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      
      case "updatedAt":
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        break;
      
      case "title":
        const titleA = a.title?.toLowerCase() || a.domain?.toLowerCase() || a.url.toLowerCase();
        const titleB = b.title?.toLowerCase() || b.domain?.toLowerCase() || b.url.toLowerCase();
        comparison = titleA.localeCompare(titleB);
        break;
      
      case "url":
        comparison = a.url.toLowerCase().localeCompare(b.url.toLowerCase());
        break;
      
      case "pawkit":
        const pawkitA = a.collections?.[0] || "";
        const pawkitB = b.collections?.[0] || "";
        comparison = pawkitA.localeCompare(pawkitB);
        break;
      
      default:
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    return sortOrder === "desc" ? -comparison : comparison;
  });

  return sorted;
}

