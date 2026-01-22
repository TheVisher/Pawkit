import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// =================================================================
// LINK CHECK INTERNAL FUNCTIONS
// =================================================================

/**
 * Check all links in the database for broken URLs.
 * This is called by the weekly cron job.
 */
export const checkAllLinks = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get all URL cards that haven't been checked recently
    const cards = await ctx.runQuery(internal.linkCheck.getCardsToCheck, {
      daysSinceLastCheck: 7,
    });

    console.log("Checking", cards.length, "links");

    let checked = 0;
    let broken = 0;
    let redirected = 0;

    for (const card of cards) {
      if (!card.url) continue;

      try {
        const result = await checkLink(card.url);

        await ctx.runMutation(internal.cards.updateLinkStatus, {
          cardId: card._id,
          linkStatus: result.status,
          lastLinkCheck: Date.now(),
          redirectUrl: result.redirectUrl,
        });

        checked++;
        if (result.status === "broken") broken++;
        if (result.status === "redirected") redirected++;

        // Rate limit to avoid hammering servers
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        console.error("Error checking link for card:", card._id, error);
      }
    }

    console.log("Link check complete:", { checked, broken, redirected });
  },
});

/**
 * Get cards that need link checking.
 */
export const getCardsToCheck = internalQuery({
  args: { daysSinceLastCheck: v.number() },
  handler: async (ctx, { daysSinceLastCheck }) => {
    const cutoff = Date.now() - daysSinceLastCheck * 24 * 60 * 60 * 1000;

    // Get all URL cards
    const allCards = await ctx.db.query("cards").collect();

    // Filter to URL cards that need checking
    return allCards.filter((card) => {
      if (card.type !== "url" || !card.url || card.deleted) return false;

      // Check if never checked or checked before cutoff
      return !card.lastLinkCheck || card.lastLinkCheck < cutoff;
    });
  },
});

/**
 * Check a single link for a card (user-initiated).
 */
export const checkSingleLink = internalAction({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    const card = await ctx.runQuery(internal.cards.getInternal, { cardId });
    if (!card?.url) return;

    try {
      const result = await checkLink(card.url);

      await ctx.runMutation(internal.cards.updateLinkStatus, {
        cardId,
        linkStatus: result.status,
        lastLinkCheck: Date.now(),
        redirectUrl: result.redirectUrl,
      });

      return result;
    } catch (error) {
      console.error("Error checking link:", error);

      await ctx.runMutation(internal.cards.updateLinkStatus, {
        cardId,
        linkStatus: "error",
        lastLinkCheck: Date.now(),
      });

      return { status: "error", redirectUrl: undefined };
    }
  },
});

// =================================================================
// HELPER FUNCTIONS
// =================================================================

interface LinkCheckResult {
  status: "ok" | "broken" | "redirected" | "error";
  redirectUrl?: string;
}

/**
 * Check if a link is accessible and track redirects.
 */
async function checkLink(url: string): Promise<LinkCheckResult> {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Pawkit LinkChecker/1.0; +https://pawkit.app)",
      },
      redirect: "manual", // Don't follow redirects automatically
    });

    // Check for redirects
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get("location");
      if (redirectUrl) {
        // Resolve relative redirects
        const absoluteUrl = new URL(redirectUrl, url).href;
        return { status: "redirected", redirectUrl: absoluteUrl };
      }
    }

    // Check for success
    if (response.ok) {
      return { status: "ok" };
    }

    // Check for client/server errors
    if (response.status >= 400) {
      return { status: "broken" };
    }

    return { status: "ok" };
  } catch (error) {
    // Network error or DNS failure
    return { status: "broken" };
  }
}
