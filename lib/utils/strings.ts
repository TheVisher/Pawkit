const URL_PATTERN = /^(https?:\/\/)?([\w.-]+)(:[0-9]+)?(\/.*)?$/i;

export function isProbablyUrl(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return true;
  return URL_PATTERN.test(trimmed);
}

export function ensureUrlProtocol(url: string): string {
  if (!url) {
    throw new Error("URL is required");
  }
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function normalizeTags(tags: string[] | undefined | null): string[] {
  if (!tags) return [];
  const normalized = new Set<string>();
  tags
    .map((tag) => tag.trim())
    .filter(Boolean)
    .forEach((tag) => normalized.add(tag.toLowerCase()));
  return Array.from(normalized).sort();
}

export function normalizeCollections(collections: string[] | undefined | null): string[] {
  if (!collections) return [];
  const normalized = new Set<string>();
  collections
    .map((slug) => slug.trim())
    .filter(Boolean)
    .forEach((slug) => normalized.add(slug.toLowerCase()));
  return Array.from(normalized).sort();
}

export function safeHost(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return url.hostname;
  } catch (error) {
    return undefined;
  }
}
