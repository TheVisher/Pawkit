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
  // If card has a real title, use it
  if (card.title && card.title.trim()) {
    // Truncate very long titles
    const title = card.title.trim();
    if (title.length > 60) {
      return title.substring(0, 57) + "...";
    }
    return title;
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
