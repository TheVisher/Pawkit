/**
 * Utility functions for better card display in calendar and other views
 */

// Domain to friendly name mappings
const DOMAIN_NAMES: Record<string, string> = {
  "twitter.com": "Twitter",
  "x.com": "X",
  "youtube.com": "YouTube",
  "youtu.be": "YouTube",
  "github.com": "GitHub",
  "linkedin.com": "LinkedIn",
  "instagram.com": "Instagram",
  "facebook.com": "Facebook",
  "reddit.com": "Reddit",
  "medium.com": "Medium",
  "substack.com": "Substack",
  "notion.so": "Notion",
  "figma.com": "Figma",
  "docs.google.com": "Google Docs",
  "drive.google.com": "Google Drive",
  "sheets.google.com": "Google Sheets",
  "amazon.com": "Amazon",
  "netflix.com": "Netflix",
  "spotify.com": "Spotify",
  "twitch.tv": "Twitch",
  "discord.com": "Discord",
  "slack.com": "Slack",
  "trello.com": "Trello",
  "asana.com": "Asana",
  "jira.atlassian.com": "Jira",
  "stackoverflow.com": "Stack Overflow",
  "producthunt.com": "Product Hunt",
  "hackernews.com": "Hacker News",
  "news.ycombinator.com": "Hacker News",
};

/**
 * Check if URL is a social media post and return friendly name with context
 */
export function getSocialPostTitle(url: string): string | null {
  // X/Twitter - extract username
  const xMatch = url.match(/^https?:\/\/(www\.)?(twitter\.com|x\.com)\/(@?(\w+))\/status\//);
  if (xMatch) {
    const username = xMatch[4];
    return `@${username} on X`;
  }

  // Instagram post
  const igPostMatch = url.match(/^https?:\/\/(www\.)?instagram\.com\/p\//);
  if (igPostMatch) return "Instagram Post";

  // Instagram reel
  const igReelMatch = url.match(/^https?:\/\/(www\.)?instagram\.com\/reel\//);
  if (igReelMatch) return "Instagram Reel";

  // Reddit - extract subreddit
  const redditMatch = url.match(/^https?:\/\/(www\.)?reddit\.com\/r\/(\w+)\/comments\//);
  if (redditMatch) {
    return `r/${redditMatch[2]}`;
  }

  // TikTok - extract username
  const tiktokMatch = url.match(/^https?:\/\/(www\.)?tiktok\.com\/@([\w.]+)\/video\//);
  if (tiktokMatch) {
    return `@${tiktokMatch[2]} on TikTok`;
  }

  // Threads - extract username
  const threadsMatch = url.match(/^https?:\/\/(www\.)?threads\.net\/@([\w.]+)\/post\//);
  if (threadsMatch) {
    return `@${threadsMatch[2]} on Threads`;
  }

  // Facebook post
  if (/^https?:\/\/(www\.)?facebook\.com\/.*\/posts\//.test(url)) {
    return "Facebook Post";
  }

  // LinkedIn post
  if (/^https?:\/\/(www\.)?linkedin\.com\/posts\//.test(url)) {
    return "LinkedIn Post";
  }

  return null;
}

/**
 * Get a friendly domain name from a URL or domain string
 */
export function getFriendlyDomainName(domainOrUrl: string): string {
  // Extract domain from URL if needed
  let domain = domainOrUrl;
  try {
    if (domainOrUrl.includes("://")) {
      domain = new URL(domainOrUrl).hostname;
    }
  } catch {
    // Keep original if URL parsing fails
  }

  // Remove www. prefix
  domain = domain.replace(/^www\./, "");

  // Check for known domain mapping
  const friendlyName = DOMAIN_NAMES[domain];
  if (friendlyName) {
    return friendlyName;
  }

  // Capitalize first letter of domain name (without TLD)
  const parts = domain.split(".");
  if (parts.length >= 2) {
    const name = parts[parts.length - 2];
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  return domain;
}

/**
 * Get a clean display title for a card
 * Priority: title > cleaned URL title > domain name
 */
export function getCardDisplayTitle(card: {
  title?: string | null;
  domain?: string | null;
  url?: string;
}): string {
  // If card has a real title (not just a URL), use it
  if (card.title && card.title.trim()) {
    const title = card.title.trim();
    // Check if title is just the URL - if so, try to get a better name
    if (card.url && (title === card.url || title.startsWith("http"))) {
      // Try social post detection first
      const socialTitle = getSocialPostTitle(card.url);
      if (socialTitle) {
        return socialTitle;
      }
    }
    // Truncate very long titles
    if (title.length > 60) {
      return title.substring(0, 57) + "...";
    }
    return title;
  }

  // If we have a URL, check for social media posts first
  if (card.url) {
    const socialTitle = getSocialPostTitle(card.url);
    if (socialTitle) {
      return socialTitle;
    }
  }

  // Try to create a friendly name from domain
  if (card.domain) {
    return getFriendlyDomainName(card.domain);
  }

  // Fall back to URL-based name
  if (card.url) {
    return getFriendlyDomainName(card.url);
  }

  return "Untitled";
}

/**
 * Get favicon URL for a domain
 */
export function getFaviconUrl(domain: string, size: number = 16): string {
  // Clean up domain
  let cleanDomain = domain;
  try {
    if (domain.includes("://")) {
      cleanDomain = new URL(domain).hostname;
    }
  } catch {
    // Keep original if parsing fails
  }

  cleanDomain = cleanDomain.replace(/^www\./, "");

  return `https://www.google.com/s2/favicons?sz=${size}&domain=${encodeURIComponent(cleanDomain)}`;
}
