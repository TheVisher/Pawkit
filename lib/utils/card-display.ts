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

// URL patterns for social media posts
const SOCIAL_POST_PATTERNS: { pattern: RegExp; name: string }[] = [
  { pattern: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/\w+\/status\//, name: "X Post" },
  { pattern: /^https?:\/\/(www\.)?instagram\.com\/p\//, name: "Instagram Post" },
  { pattern: /^https?:\/\/(www\.)?instagram\.com\/reel\//, name: "Instagram Reel" },
  { pattern: /^https?:\/\/(www\.)?facebook\.com\/.*\/posts\//, name: "Facebook Post" },
  { pattern: /^https?:\/\/(www\.)?reddit\.com\/r\/\w+\/comments\//, name: "Reddit Post" },
  { pattern: /^https?:\/\/(www\.)?linkedin\.com\/posts\//, name: "LinkedIn Post" },
  { pattern: /^https?:\/\/(www\.)?tiktok\.com\/@[\w.]+\/video\//, name: "TikTok" },
  { pattern: /^https?:\/\/(www\.)?threads\.net\/@[\w.]+\/post\//, name: "Threads Post" },
];

/**
 * Check if URL is a social media post and return friendly name
 */
export function getSocialPostTitle(url: string): string | null {
  for (const { pattern, name } of SOCIAL_POST_PATTERNS) {
    if (pattern.test(url)) {
      return name;
    }
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
