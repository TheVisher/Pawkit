/**
 * Daily Notes utilities for Pawkit
 */

export interface DailyNote {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD format
  content: string;
  tags: string[];
}

/**
 * Generate a daily note title for a given date
 */
export function generateDailyNoteTitle(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  
  return `${year}-${month}-${day} - ${dayName}`;
}

/**
 * Generate daily note content template
 */
export function generateDailyNoteContent(date: Date): string {
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = date.toLocaleDateString('en-US', { month: 'long' });
  const day = date.getDate();
  const year = date.getFullYear();
  
  return `# ${dayName}, ${monthName} ${day}, ${year}

## Today's Focus
- [ ] 

## Notes & Thoughts
- 

## Tasks
- [ ] 

## Highlights
- 

## Tomorrow's Plan
- [ ] 

#daily #${year} #${monthName.toLowerCase()}`;
}

/**
 * Check if a date string matches the daily note format
 */
export function isDailyNoteTitle(title: string): boolean {
  // Matches format: YYYY-MM-DD - DayName
  const dailyNoteRegex = /^\d{4}-\d{2}-\d{2} - \w+$/;
  return dailyNoteRegex.test(title);
}

/**
 * Extract date from daily note title
 */
export function extractDateFromTitle(title: string): Date | null {
  if (!isDailyNoteTitle(title)) return null;
  
  const dateMatch = title.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!dateMatch) return null;
  
  // Parse the date components and create a local date to avoid timezone issues
  const [year, month, day] = dateMatch[1].split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

/**
 * Get date string in YYYY-MM-DD format
 */
export function getDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a card is a daily note
 */
export function isDailyNote(card: { title: string | null; tags?: string[] }): boolean {
  if (!card.title) return false;

  // Check by title format
  if (isDailyNoteTitle(card.title)) return true;

  // Check by tags
  if (card.tags?.includes('daily')) return true;

  return false;
}

/**
 * Get all daily notes from a list of cards
 */
export function getDailyNotes(cards: Array<{ id: string; title: string | null; content: string | null; tags?: string[]; createdAt: string }>): DailyNote[] {
  const dailyNotes = cards
    .filter(card => isDailyNote(card))
    .map(card => {
      const extractedDate = extractDateFromTitle(card.title!);
      const date = extractedDate ? getDateString(extractedDate) : card.createdAt.split('T')[0];
      
      return {
        id: card.id,
        title: card.title!,
        date,
        content: card.content || '',
        tags: card.tags || []
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date)); // Most recent first
  
  return dailyNotes;
}

/**
 * Find daily note for a specific date
 */
export function findDailyNoteForDate(cards: Array<{ id: string; title: string | null; content: string | null; tags?: string[]; createdAt: string }>, date: Date): DailyNote | null {
  const dateString = getDateString(date);
  const dailyNotes = getDailyNotes(cards);
  
  return dailyNotes.find(note => note.date === dateString) || null;
}
