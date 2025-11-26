/**
 * Date Extraction Utility
 *
 * Extracts dates from card metadata (JSON-LD, Open Graph, meta tags)
 * for automatic calendar event suggestions.
 */

export type ExtractedDateType = 'release' | 'event' | 'published' | 'deadline' | 'unknown';

export interface ExtractedDate {
  date: string;           // YYYY-MM-DD
  type: ExtractedDateType;
  confidence: 'high' | 'medium' | 'low';
  source: 'json-ld' | 'open-graph' | 'meta' | 'schema';
  label?: string;         // Human-readable label like "Movie Release" or "Concert Date"
  endDate?: string;       // For events with duration
}

// Schema types that indicate specific date meanings
const SCHEMA_TYPE_MAP: Record<string, ExtractedDateType> = {
  'movie': 'release',
  'film': 'release',
  'tvseries': 'release',
  'episode': 'release',
  'videogame': 'release',
  'musicalbum': 'release',
  'musicrelease': 'release',
  'softwareapplication': 'release',
  'event': 'event',
  'musicevents': 'event',
  'concert': 'event',
  'theaterperformance': 'event',
  'sportsevent': 'event',
  'screeningevent': 'event',
  'article': 'published',
  'newsarticle': 'published',
  'blogposting': 'published',
  'product': 'release',
};

// Date field names and their typical meanings
const DATE_FIELD_MAP: Record<string, ExtractedDateType> = {
  'releasedate': 'release',
  'daterelease': 'release',
  'datepublished': 'published',
  'publishdate': 'published',
  'startdate': 'event',
  'eventdate': 'event',
  'doortime': 'event',
  'enddate': 'event',
  'duedate': 'deadline',
  'deadline': 'deadline',
  'availabilityends': 'deadline',
};

// Labels for date types
const TYPE_LABELS: Record<ExtractedDateType, string> = {
  'release': 'Release Date',
  'event': 'Event Date',
  'published': 'Published',
  'deadline': 'Deadline',
  'unknown': 'Date',
};

/**
 * Extract dates from card metadata
 */
export function extractDatesFromMetadata(metadata: Record<string, unknown> | undefined): ExtractedDate[] {
  if (!metadata) return [];

  const dates: ExtractedDate[] = [];
  const seenDates = new Set<string>(); // Dedupe by date string

  // 1. Check JSON-LD data (highest confidence)
  const jsonLdDates = extractFromJsonLd(metadata);
  for (const date of jsonLdDates) {
    if (!seenDates.has(date.date)) {
      dates.push(date);
      seenDates.add(date.date);
    }
  }

  // 2. Check Open Graph tags
  const ogDates = extractFromOpenGraph(metadata);
  for (const date of ogDates) {
    if (!seenDates.has(date.date)) {
      dates.push(date);
      seenDates.add(date.date);
    }
  }

  // 3. Check meta tags
  const metaDates = extractFromMetaTags(metadata);
  for (const date of metaDates) {
    if (!seenDates.has(date.date)) {
      dates.push(date);
      seenDates.add(date.date);
    }
  }

  // Filter to only future dates (more useful for calendar)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = formatDate(today);

  return dates.filter(d => d.date >= todayStr);
}

/**
 * Extract dates from JSON-LD structured data
 */
function extractFromJsonLd(metadata: Record<string, unknown>): ExtractedDate[] {
  const dates: ExtractedDate[] = [];

  // The metadata structure from mergeMetadata is:
  // { title, description, image, raw: { sources: [{ meta: {...}, jsonLd: [...], ... }, ...] } }

  // Check raw.sources (main structure from mergeMetadata)
  const raw = metadata.raw as Record<string, unknown> | undefined;
  if (raw) {
    const sources = raw.sources as Array<Record<string, unknown>> | undefined;
    if (sources) {
      for (const source of sources) {
        // Check jsonLd array (new: extracted JSON-LD blocks)
        const jsonLd = source.jsonLd as Array<Record<string, unknown>> | undefined;
        if (jsonLd && Array.isArray(jsonLd)) {
          for (const item of jsonLd) {
            dates.push(...extractFromJsonLdObject(item));
          }
        }
        // Each source may have a 'meta' object with meta tags
        const meta = source.meta as Record<string, unknown> | undefined;
        if (meta) {
          dates.push(...extractFromJsonLdObject(meta));
        }
        // Also check the source's 'raw' property (for nested structures)
        const sourceRaw = source.raw as Record<string, unknown> | undefined;
        if (sourceRaw) {
          dates.push(...extractFromJsonLdObject(sourceRaw));
        }
        // Also check the source directly
        dates.push(...extractFromJsonLdObject(source));
      }
    }
    // Check jsonLd at raw level
    const rawJsonLd = raw.jsonLd as Array<Record<string, unknown>> | undefined;
    if (rawJsonLd && Array.isArray(rawJsonLd)) {
      for (const item of rawJsonLd) {
        dates.push(...extractFromJsonLdObject(item));
      }
    }
    // Also check raw directly
    dates.push(...extractFromJsonLdObject(raw));
  }

  // Legacy: Look for sources at top level
  const topSources = metadata.sources as Array<Record<string, unknown>> | undefined;
  if (topSources) {
    for (const source of topSources) {
      const sourceRaw = source.raw as Record<string, unknown> | undefined;
      if (sourceRaw) {
        dates.push(...extractFromJsonLdObject(sourceRaw));
      }
      dates.push(...extractFromJsonLdObject(source));
    }
  }

  // Check top-level jsonLd
  const topJsonLd = metadata.jsonLd as Array<Record<string, unknown>> | undefined;
  if (topJsonLd && Array.isArray(topJsonLd)) {
    for (const item of topJsonLd) {
      dates.push(...extractFromJsonLdObject(item));
    }
  }

  // Also check direct meta object
  const meta = metadata.meta as Record<string, unknown> | undefined;
  if (meta) {
    dates.push(...extractFromJsonLdObject(meta));
  }

  // Check metadata directly
  dates.push(...extractFromJsonLdObject(metadata));

  return dates;
}

function extractFromJsonLdObject(obj: Record<string, unknown>): ExtractedDate[] {
  const dates: ExtractedDate[] = [];

  // Get schema type for context
  const schemaType = (
    (obj['@type'] as string) ||
    (obj['type'] as string) ||
    ''
  ).toLowerCase();

  // Keywords that indicate a field might contain a date
  const dateKeywords = [
    'date', 'time', 'release', 'premiere', 'launch', 'start', 'end',
    'publish', 'created', 'modified', 'valid', 'available', 'door',
    'deadline', 'due', 'when', 'scheduled', 'air', 'broadcast'
  ];

  // Check ALL fields in the object for potential dates
  for (const [key, value] of Object.entries(obj)) {
    // Skip non-date fields
    if (key.startsWith('@') || key === 'type' || key === 'id') continue;

    const keyLower = key.toLowerCase();

    // Check if the key looks like it might contain a date
    const mightBeDate = dateKeywords.some(kw => keyLower.includes(kw));

    if (value && typeof value === 'string') {
      // Try to parse as a date
      const parsed = parseDate(value);
      if (parsed) {
        // Only add if key suggests it's a date OR parsing was successful on a date-looking string
        const looksLikeDate = /^\d{4}[-/]\d{2}[-/]\d{2}/.test(value) ||
                              /^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(value) ||
                              /^[A-Za-z]+\s+\d{1,2},?\s+\d{4}/.test(value);

        if (mightBeDate || looksLikeDate) {
          const dateType = inferDateType(keyLower, schemaType);

          // Skip past dates for 'published' type (not useful for calendar)
          if (dateType === 'published') {
            const today = formatDate(new Date());
            if (parsed < today) continue;
          }

          dates.push({
            date: parsed,
            type: dateType,
            confidence: mightBeDate ? 'high' : 'medium',
            source: 'json-ld',
            label: getLabel(dateType, schemaType) || humanizeFieldName(key),
          });
        }
      }
    }
    // Also check nested objects
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      dates.push(...extractFromJsonLdObject(value as Record<string, unknown>));
    }
    // Check arrays of objects
    else if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === 'object') {
          dates.push(...extractFromJsonLdObject(item as Record<string, unknown>));
        }
      }
    }
  }

  // Check @graph structure (used by some sites like Yoast SEO)
  const graph = obj['@graph'] as Array<Record<string, unknown>> | undefined;
  if (graph && Array.isArray(graph)) {
    for (const item of graph) {
      dates.push(...extractFromJsonLdObject(item));
    }
  }

  return dates;
}

/**
 * Convert a camelCase or snake_case field name to human-readable
 */
function humanizeFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')  // camelCase to spaces
    .replace(/[_-]/g, ' ')        // snake_case to spaces
    .replace(/\s+/g, ' ')         // collapse spaces
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extract dates from Open Graph tags
 */
function extractFromOpenGraph(metadata: Record<string, unknown>): ExtractedDate[] {
  const dates: ExtractedDate[] = [];

  // Find the meta object (can be in various places)
  let meta = metadata.meta as Record<string, string> | undefined;

  // Check raw.sources[*].meta
  if (!meta) {
    const raw = metadata.raw as Record<string, unknown> | undefined;
    if (raw?.sources) {
      const sources = raw.sources as Array<Record<string, unknown>>;
      for (const source of sources) {
        if (source.meta) {
          meta = source.meta as Record<string, string>;
          break;
        }
      }
    }
  }

  if (!meta) return dates;

  // Keywords that indicate a meta tag might contain a date
  const dateKeywords = [
    'date', 'time', 'release', 'premiere', 'launch', 'start', 'end',
    'publish', 'created', 'modified', 'valid', 'available', 'door',
    'deadline', 'due', 'when', 'scheduled', 'air', 'broadcast'
  ];

  // Scan ALL meta tags for potential dates
  for (const [key, value] of Object.entries(meta)) {
    if (!value || typeof value !== 'string') continue;

    const keyLower = key.toLowerCase();
    const mightBeDate = dateKeywords.some(kw => keyLower.includes(kw));

    // Try to parse as a date
    const parsed = parseDate(value);
    if (parsed) {
      const looksLikeDate = /^\d{4}[-/]\d{2}[-/]\d{2}/.test(value) ||
                            /^\d{1,2}[-/]\d{1,2}[-/]\d{4}/.test(value) ||
                            /^[A-Za-z]+\s+\d{1,2},?\s+\d{4}/.test(value) ||
                            /^\d{4}-\d{2}-\d{2}T/.test(value);  // ISO format

      if (mightBeDate || looksLikeDate) {
        const dateType = inferDateType(keyLower, '');

        // Skip past dates for 'published' type
        if (dateType === 'published') {
          const today = formatDate(new Date());
          if (parsed < today) continue;
        }

        dates.push({
          date: parsed,
          type: dateType,
          confidence: mightBeDate ? 'medium' : 'low',
          source: 'open-graph',
          label: TYPE_LABELS[dateType] || humanizeFieldName(key),
        });
      }
    }
  }

  return dates;
}

/**
 * Extract dates from generic meta tags
 * Note: extractFromOpenGraph now handles all meta tags, so this is kept for compatibility
 */
function extractFromMetaTags(_metadata: Record<string, unknown>): ExtractedDate[] {
  // All meta tag scanning is now done in extractFromOpenGraph
  return [];
}

/**
 * Parse various date formats into YYYY-MM-DD
 */
function parseDate(dateString: string): string | null {
  if (!dateString) return null;

  try {
    // Try ISO 8601 first (most common in structured data)
    // Handles: 2025-12-15, 2025-12-15T00:00:00Z, 2025-12-15T10:30:00-08:00
    const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${year}-${month}-${day}`;
    }

    // Try US format: 12/15/2025 or 12-15-2025
    const usMatch = dateString.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (usMatch) {
      const [, month, day, year] = usMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    // Try text format: "December 15, 2025" or "Dec 15, 2025"
    const textMatch = dateString.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
    if (textMatch) {
      const [, monthName, day, year] = textMatch;
      const month = parseMonthName(monthName);
      if (month) {
        return `${year}-${month}-${day.padStart(2, '0')}`;
      }
    }

    // Try European format: 15 December 2025 or 15-12-2025
    const euMatch = dateString.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (euMatch) {
      const [, day, monthName, year] = euMatch;
      const month = parseMonthName(monthName);
      if (month) {
        return `${year}-${month}-${day.padStart(2, '0')}`;
      }
    }

    // Try European numeric: 15/12/2025 or 15-12-2025 (day/month/year)
    // Only if day > 12 (to disambiguate from US format)
    const euNumMatch = dateString.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (euNumMatch) {
      const [, first, second, year] = euNumMatch;
      const firstNum = parseInt(first, 10);
      const secondNum = parseInt(second, 10);
      // If first number > 12, it must be day (European format)
      if (firstNum > 12 && secondNum <= 12) {
        return `${year}-${second.padStart(2, '0')}-${first.padStart(2, '0')}`;
      }
    }

    // Last resort: try Date.parse
    const timestamp = Date.parse(dateString);
    if (!isNaN(timestamp)) {
      const date = new Date(timestamp);
      return formatDate(date);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Parse month name to 2-digit string
 */
function parseMonthName(name: string): string | null {
  const months: Record<string, string> = {
    'january': '01', 'jan': '01',
    'february': '02', 'feb': '02',
    'march': '03', 'mar': '03',
    'april': '04', 'apr': '04',
    'may': '05',
    'june': '06', 'jun': '06',
    'july': '07', 'jul': '07',
    'august': '08', 'aug': '08',
    'september': '09', 'sep': '09', 'sept': '09',
    'october': '10', 'oct': '10',
    'november': '11', 'nov': '11',
    'december': '12', 'dec': '12',
  };
  return months[name.toLowerCase()] || null;
}

/**
 * Format Date object to YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Infer date type from field name and schema type
 */
function inferDateType(fieldName: string, schemaType: string): ExtractedDateType {
  // Check field name first
  const fieldType = DATE_FIELD_MAP[fieldName];
  if (fieldType) return fieldType;

  // Check schema type for context
  const schemaDateType = SCHEMA_TYPE_MAP[schemaType];
  if (schemaDateType) return schemaDateType;

  return 'unknown';
}

/**
 * Get human-readable label for date type
 */
function getLabel(type: ExtractedDateType, schemaType: string): string {
  // Specific labels based on schema type
  if (schemaType.includes('movie') || schemaType.includes('film')) {
    return 'Movie Release';
  }
  if (schemaType.includes('concert') || schemaType.includes('music')) {
    return 'Concert Date';
  }
  if (schemaType.includes('event')) {
    return 'Event Date';
  }
  if (schemaType.includes('game')) {
    return 'Game Release';
  }
  if (schemaType.includes('album')) {
    return 'Album Release';
  }
  if (schemaType.includes('episode') || schemaType.includes('series')) {
    return 'Premiere Date';
  }

  return TYPE_LABELS[type];
}

/**
 * Get the most relevant extracted date (highest confidence future date)
 */
export function getMostRelevantDate(dates: ExtractedDate[]): ExtractedDate | null {
  if (dates.length === 0) return null;

  // Sort by confidence (high > medium > low), then by date (soonest first)
  const sorted = [...dates].sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (confDiff !== 0) return confDiff;
    return a.date.localeCompare(b.date);
  });

  // Prefer release/event dates over published dates
  const nonPublished = sorted.find(d => d.type !== 'published');
  if (nonPublished) return nonPublished;

  return sorted[0];
}
