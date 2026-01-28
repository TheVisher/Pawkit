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

// =================================================================
// SOCIAL MEDIA URL VALIDATION
// These platforms block server-side HEAD requests, so we validate
// the URL structure instead of making network requests.
// =================================================================

interface SocialMediaCheck {
  platform: string;
  isValid: boolean;
}

/**
 * Check if a URL is from a social media platform that blocks server requests.
 * Returns validation based on URL structure instead of network check.
 */
function checkSocialMediaUrl(url: string): SocialMediaCheck | null {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // Twitter/X - check for valid status URL pattern
    if (hostname.includes("twitter.com") || hostname.includes("x.com")) {
      // Valid patterns: /user/status/123, /i/web/status/123
      const hasStatusId = /\/status\/\d+/.test(urlObj.pathname);
      return { platform: "twitter", isValid: hasStatusId };
    }

    // Reddit - check for valid post or subreddit pattern
    if (hostname.includes("reddit.com") || hostname === "redd.it") {
      // Valid patterns: /r/subreddit, /r/subreddit/comments/id, redd.it/id
      const hasSubreddit = /\/r\/[a-zA-Z0-9_]+/.test(urlObj.pathname);
      const hasPostId = /\/comments\/[a-z0-9]+/i.test(urlObj.pathname);
      const isShortLink = hostname === "redd.it" && urlObj.pathname.length > 1;
      return { platform: "reddit", isValid: hasSubreddit || hasPostId || isShortLink };
    }

    // TikTok - check for valid video pattern
    if (hostname.includes("tiktok.com")) {
      // Valid patterns: /@user/video/123, /t/xyz (short links)
      const hasVideo = /\/@[\w.]+\/video\/\d+/.test(urlObj.pathname);
      const hasShortLink = /^\/t\//.test(urlObj.pathname) || /\/v\//.test(urlObj.pathname);
      const hasUserProfile = /^\/@[\w.]+\/?$/.test(urlObj.pathname);
      return { platform: "tiktok", isValid: hasVideo || hasShortLink || hasUserProfile };
    }

    // Instagram - check for valid post/reel pattern
    if (hostname.includes("instagram.com")) {
      // Valid patterns: /p/xyz, /reel/xyz, /tv/xyz, /@user
      const hasPost = /^\/(p|reel|tv|reels)\/[\w-]+/.test(urlObj.pathname);
      const hasProfile = /^\/[\w.]+\/?$/.test(urlObj.pathname) && urlObj.pathname !== "/";
      return { platform: "instagram", isValid: hasPost || hasProfile };
    }

    // Facebook - check for valid post/video pattern
    if (hostname.includes("facebook.com") || hostname === "fb.watch" || hostname === "fb.com") {
      // Facebook URLs are complex, but if it's facebook.com with a path, assume valid
      const hasContent = urlObj.pathname.length > 1 || urlObj.search.length > 0;
      return { platform: "facebook", isValid: hasContent };
    }

    // Pinterest - check for valid pin pattern
    if (hostname.includes("pinterest.") || hostname === "pin.it") {
      // Valid patterns: /pin/123, pin.it/xyz
      const hasPin = /\/pin\/[\w-]+/.test(urlObj.pathname);
      const isShortLink = hostname === "pin.it" && urlObj.pathname.length > 1;
      return { platform: "pinterest", isValid: hasPin || isShortLink };
    }

    // YouTube - generally works with HEAD but can be flaky
    if (hostname.includes("youtube.com") || hostname === "youtu.be") {
      const hasVideo = urlObj.searchParams.has("v") ||
                       /^\/(watch|shorts|embed)/.test(urlObj.pathname) ||
                       (hostname === "youtu.be" && urlObj.pathname.length > 1);
      return { platform: "youtube", isValid: hasVideo };
    }

    return null; // Not a known social media URL
  } catch {
    return null;
  }
}

/**
 * Check if a link is accessible and track redirects.
 */
async function checkLink(url: string): Promise<LinkCheckResult> {
  // First check if this is a social media URL that blocks server requests
  const socialCheck = checkSocialMediaUrl(url);
  if (socialCheck) {
    // For social media, validate URL structure instead of making network request
    return { status: socialCheck.isValid ? "ok" : "broken" };
  }

  // For regular URLs, do the standard HEAD request check
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
