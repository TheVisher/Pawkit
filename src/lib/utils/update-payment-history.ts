/**
 * Payment History Utilities
 * Manages the visual payment history table at the bottom of subscription cards
 *
 * Supports both HTML (legacy) and Plate JSON formats.
 *
 * Table structure:
 * - 2 rows × 6 columns per half-year
 * - Green cell = paid, Red cell = missed, Empty = future/current
 * - Year label above each year's tables
 * - Oldest years at bottom, newest at top
 */

import { isPlateJson, parseJsonContent, serializePlateContent } from '@/lib/plate/html-to-plate';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PlateNode = any;

const MONTHS_FIRST_HALF = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
const MONTHS_SECOND_HALF = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Colors for cell backgrounds
const COLOR_PAID = '#22c55e'; // green-500
const COLOR_MISSED = '#ef4444'; // red-500

/**
 * Generate the Payment History section HTML for a given year
 */
function generateYearTable(year: number): string {
  const firstHalfHeaders = MONTHS_FIRST_HALF.map(m => `<td style="text-align:center;font-size:12px;font-weight:500;padding:4px 8px;border:1px solid #374151;">${m}</td>`).join('');
  const firstHalfCells = MONTHS_FIRST_HALF.map(() => `<td style="text-align:center;padding:8px;border:1px solid #374151;"></td>`).join('');

  const secondHalfHeaders = MONTHS_SECOND_HALF.map(m => `<td style="text-align:center;font-size:12px;font-weight:500;padding:4px 8px;border:1px solid #374151;">${m}</td>`).join('');
  const secondHalfCells = MONTHS_SECOND_HALF.map(() => `<td style="text-align:center;padding:8px;border:1px solid #374151;"></td>`).join('');

  return `<p style="font-weight:600;margin-bottom:4px;">${year}</p>
<table style="border-collapse:collapse;margin-bottom:8px;">
<tbody>
<tr>${firstHalfHeaders}</tr>
<tr>${firstHalfCells}</tr>
<tr>${secondHalfHeaders}</tr>
<tr>${secondHalfCells}</tr>
</tbody>
</table>`;
}

/**
 * Generate the full Payment History section
 */
function generatePaymentHistorySection(year: number): string {
  return `<h2>Payment History</h2>
${generateYearTable(year)}`;
}

/**
 * Find the Payment History section in content
 * Returns the start and end indices, or null if not found
 */
function findPaymentHistorySection(content: string): { start: number; end: number } | null {
  const headerMatch = content.match(/<h2>Payment History<\/h2>/i);
  if (!headerMatch || headerMatch.index === undefined) {
    return null;
  }

  const start = headerMatch.index;

  // Find the end - either next h2 or end of content
  const afterHeader = content.substring(start + headerMatch[0].length);
  const nextH2Match = afterHeader.match(/<h2>/i);

  const end = nextH2Match && nextH2Match.index !== undefined
    ? start + headerMatch[0].length + nextH2Match.index
    : content.length;

  return { start, end };
}

/**
 * Check if a year table already exists in the Payment History section
 * Uses text content detection since Tiptap strips data attributes
 */
function yearTableExists(content: string, year: number): boolean {
  const section = findPaymentHistorySection(content);
  if (!section) return false;

  const sectionContent = content.substring(section.start, section.end);

  // Look for the year as text in a paragraph or strong tag
  // Pattern: year number followed by a table with month headers
  const yearPattern = new RegExp(`>${year}<\\/`, 'i');
  return yearPattern.test(sectionContent);
}

/**
 * Ensure the Payment History section exists at the bottom of the content
 * Creates it if missing, returns updated content
 * Supports both HTML and Plate JSON content
 */
export function ensurePaymentHistorySection(content: string, year?: number): string {
  const currentYear = year || new Date().getFullYear();

  // Check if content is Plate JSON
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (!parsed) return content;
    const updated = ensurePaymentHistorySectionJson(parsed, currentYear);
    return serializePlateContent(updated);
  }

  // HTML fallback
  const existing = findPaymentHistorySection(content);
  if (existing) {
    // Check if current year table exists using text detection
    if (!yearTableExists(content, currentYear)) {
      // Add new year table at the top of the section (after h2)
      const newYearTable = generateYearTable(currentYear);
      const h2End = content.indexOf('</h2>', existing.start) + 5;
      return content.substring(0, h2End) + '\n' + newYearTable + content.substring(h2End);
    }
    return content;
  }

  // Create new section at the bottom
  const section = generatePaymentHistorySection(currentYear);

  // Ensure there's proper spacing
  const trimmedContent = content.trimEnd();
  return trimmedContent + '\n\n' + section;
}

/**
 * Get the month index (0-11) and which half of the year
 */
function getMonthInfo(month: number): { half: 'first' | 'second'; index: number } {
  if (month < 6) {
    return { half: 'first', index: month };
  }
  return { half: 'second', index: month - 6 };
}

/**
 * Find the table for a specific year in the Payment History section
 * Returns the table element or null if not found
 */
function findYearTable(doc: Document, year: number): HTMLTableElement | null {
  // Find all paragraphs/elements containing the year
  const allElements = doc.querySelectorAll('p, strong, b');

  for (const el of allElements) {
    const text = el.textContent?.trim();
    if (text === String(year)) {
      // Found the year label - the next table sibling is our target
      let sibling = el.nextElementSibling;
      while (sibling) {
        if (sibling.tagName === 'TABLE') {
          return sibling as HTMLTableElement;
        }
        sibling = sibling.nextElementSibling;
      }
    }
  }

  return null;
}

/**
 * Update a specific month's cell in the payment history
 */
function updateMonthCell(
  content: string,
  year: number,
  month: number, // 0-11
  backgroundColor: string | null, // null to clear
  symbol: string // '✓' for paid, '✗' for missed, '' for empty
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');

  const yearTable = findYearTable(doc, year);
  if (!yearTable) {
    return content;
  }

  const { half, index } = getMonthInfo(month);
  const rows = yearTable.querySelectorAll('tr');

  // Table structure:
  // Row 0: Jan-Jun headers
  // Row 1: Jan-Jun cells
  // Row 2: Jul-Dec headers
  // Row 3: Jul-Dec cells
  const dataRowIndex = half === 'first' ? 1 : 3;
  const row = rows[dataRowIndex];

  if (!row) {
    return content;
  }

  const cells = row.querySelectorAll('td');
  const cell = cells[index];
  if (!cell) {
    return content;
  }

  // Update cell style and content
  if (backgroundColor) {
    cell.style.backgroundColor = backgroundColor;
    cell.style.color = '#ffffff';
  } else {
    cell.style.backgroundColor = '';
    cell.style.color = '';
  }
  cell.textContent = symbol;

  // Serialize back to HTML
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc.body).replace(/^<body[^>]*>|<\/body>$/g, '');
}

/**
 * Mark a month as paid (green with checkmark)
 * Supports both HTML and Plate JSON content
 */
export function markMonthPaid(content: string, year: number, month: number): string {
  // Check if content is Plate JSON
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (!parsed) return content;
    const withSection = ensurePaymentHistorySectionJson(parsed, year);
    const updated = updateMonthCellJson(withSection, year, month, COLOR_PAID, '✓');
    return serializePlateContent(updated);
  }

  // HTML fallback
  const withSection = ensurePaymentHistorySection(content, year);
  return updateMonthCell(withSection, year, month, COLOR_PAID, '✓');
}

/**
 * Mark a month as unpaid (clear the cell)
 * Supports both HTML and Plate JSON content
 */
export function markMonthUnpaid(content: string, year: number, month: number): string {
  // Check if content is Plate JSON
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (!parsed) return content;
    const sectionIndex = findPaymentHistorySectionJson(parsed);
    if (sectionIndex === -1) return content; // No section, nothing to clear
    const updated = updateMonthCellJson(parsed, year, month, null, '');
    return serializePlateContent(updated);
  }

  // HTML fallback
  const existing = findPaymentHistorySection(content);
  if (!existing) {
    return content; // No section, nothing to clear
  }
  return updateMonthCell(content, year, month, null, '');
}

/**
 * Mark a month as missed (red with X)
 * Supports both HTML and Plate JSON content
 */
export function markMonthMissed(content: string, year: number, month: number): string {
  // Check if content is Plate JSON
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (!parsed) return content;
    const withSection = ensurePaymentHistorySectionJson(parsed, year);
    const updated = updateMonthCellJson(withSection, year, month, COLOR_MISSED, '✗');
    return serializePlateContent(updated);
  }

  // HTML fallback
  const withSection = ensurePaymentHistorySection(content, year);
  return updateMonthCell(withSection, year, month, COLOR_MISSED, '✗');
}

/**
 * Get the payment status of a specific month
 * Returns 'paid', 'missed', or 'empty'
 * Supports both HTML and Plate JSON content
 */
export function getMonthStatus(content: string, year: number, month: number): 'paid' | 'missed' | 'empty' {
  // Check if content is Plate JSON
  if (isPlateJson(content)) {
    const parsed = parseJsonContent(content);
    if (!parsed) return 'empty';
    return getMonthStatusJson(parsed, year, month);
  }

  // HTML fallback
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');

  const yearTable = findYearTable(doc, year);
  if (!yearTable) {
    return 'empty';
  }

  const { half, index } = getMonthInfo(month);
  const rows = yearTable.querySelectorAll('tr');
  const dataRowIndex = half === 'first' ? 1 : 3;
  const row = rows[dataRowIndex];

  if (!row) {
    return 'empty';
  }

  const cells = row.querySelectorAll('td');
  const cell = cells[index];
  if (!cell) {
    return 'empty';
  }

  // Check text content for symbols
  const text = cell.textContent?.trim();
  if (text === '✓') return 'paid';
  if (text === '✗') return 'missed';

  // Also check background color as fallback
  const bgColor = cell.style?.backgroundColor || '';
  if (bgColor && (bgColor.includes('34, 197, 94') || bgColor.includes('#22c55e') || bgColor.includes('rgb(34, 197, 94)'))) {
    return 'paid';
  }
  if (bgColor && (bgColor.includes('239, 68, 68') || bgColor.includes('#ef4444') || bgColor.includes('rgb(239, 68, 68)'))) {
    return 'missed';
  }

  return 'empty';
}

/**
 * Check for months that should be marked as missed
 * Call this on widget load to handle month rollovers
 * Returns array of {year, month} that need to be marked as missed
 */
export function checkForMissedPayments(
  content: string,
  paidMonths: Array<{ year: number; month: number }>,
  subscriptionStartDate?: Date
): Array<{ year: number; month: number }> {
  const missed: Array<{ year: number; month: number }> = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Default start date to Jan of current year if not provided
  const startDate = subscriptionStartDate || new Date(currentYear, 0, 1);
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth();

  // Check each month from start date to last month
  for (let year = startYear; year <= currentYear; year++) {
    const monthStart = year === startYear ? startMonth : 0;
    const monthEnd = year === currentYear ? currentMonth - 1 : 11; // Up to but not including current month

    for (let month = monthStart; month <= monthEnd; month++) {
      // Skip if already paid
      const isPaid = paidMonths.some(p => p.year === year && p.month === month);
      if (isPaid) continue;

      // Check if already marked as missed in content
      const status = getMonthStatus(content, year, month);
      if (status === 'missed') continue;

      // This month was missed
      missed.push({ year, month });
    }
  }

  return missed;
}

/**
 * Get the current month key for storage (e.g., "2026-01")
 */
export function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Parse a month key back to year and month
 */
export function parseMonthKey(key: string): { year: number; month: number } {
  const [yearStr, monthStr] = key.split('-');
  return {
    year: parseInt(yearStr, 10),
    month: parseInt(monthStr, 10) - 1, // Convert back to 0-indexed
  };
}

// =============================================================================
// PLATE JSON SUPPORT
// =============================================================================

/**
 * Extract text from a Plate node recursively
 */
function extractTextFromNode(node: PlateNode): string {
  if (!node) return '';
  if ('text' in node && typeof node.text === 'string') {
    return node.text;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map(extractTextFromNode).join('');
  }
  return '';
}

/**
 * Create a table cell for Plate JSON
 */
function createPlateCell(text: string, isHeader: boolean, bgColor?: string): PlateNode {
  const cell: PlateNode = {
    type: isHeader ? 'th' : 'td',
    children: [{ text }],
  };
  if (bgColor) {
    cell.backgroundColor = bgColor;
  }
  return cell;
}

/**
 * Create a table row for Plate JSON
 */
function createPlateRow(cells: PlateNode[]): PlateNode {
  return {
    type: 'tr',
    children: cells,
  };
}

/**
 * Generate a year table in Plate JSON format
 */
function generateYearTableJson(year: number): PlateNode[] {
  // Year label
  const yearLabel: PlateNode = {
    type: 'p',
    children: [{ text: String(year), bold: true }],
  };

  // Table with 4 rows: header-Jan-Jun, data-Jan-Jun, header-Jul-Dec, data-Jul-Dec
  const table: PlateNode = {
    type: 'table',
    children: [
      createPlateRow(MONTHS_FIRST_HALF.map(m => createPlateCell(m, true))),
      createPlateRow(MONTHS_FIRST_HALF.map(() => createPlateCell('', false))),
      createPlateRow(MONTHS_SECOND_HALF.map(m => createPlateCell(m, true))),
      createPlateRow(MONTHS_SECOND_HALF.map(() => createPlateCell('', false))),
    ],
  };

  return [yearLabel, table];
}

/**
 * Find the Payment History section index in Plate JSON content
 */
function findPaymentHistorySectionJson(content: PlateNode[]): number {
  for (let i = 0; i < content.length; i++) {
    const node = content[i];
    if (node.type === 'h2') {
      const text = extractTextFromNode(node).toLowerCase();
      if (text.includes('payment history')) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Find a year table in the Payment History section
 * Returns the index of the year label paragraph
 */
function findYearTableJson(content: PlateNode[], sectionStart: number, year: number): number {
  for (let i = sectionStart + 1; i < content.length; i++) {
    const node = content[i];
    // Stop if we hit another h2 (different section)
    if (node.type === 'h2') break;
    // Look for year label
    if (node.type === 'p') {
      const text = extractTextFromNode(node).trim();
      if (text === String(year)) {
        return i;
      }
    }
  }
  return -1;
}

/**
 * Ensure Payment History section exists in Plate JSON content
 */
function ensurePaymentHistorySectionJson(content: PlateNode[], year: number): PlateNode[] {
  const result = [...content];
  const sectionIndex = findPaymentHistorySectionJson(result);

  if (sectionIndex === -1) {
    // Add new section at the end
    const sectionHeader: PlateNode = {
      type: 'h2',
      children: [{ text: 'Payment History' }],
    };
    const yearNodes = generateYearTableJson(year);
    result.push(sectionHeader, ...yearNodes);
  } else {
    // Section exists, check if year table exists
    const yearIndex = findYearTableJson(result, sectionIndex, year);
    if (yearIndex === -1) {
      // Add year table right after the h2
      const yearNodes = generateYearTableJson(year);
      result.splice(sectionIndex + 1, 0, ...yearNodes);
    }
  }

  return result;
}

/**
 * Update a month cell in Plate JSON
 */
function updateMonthCellJson(
  content: PlateNode[],
  year: number,
  month: number,
  bgColor: string | null,
  symbol: string
): PlateNode[] {
  const result = JSON.parse(JSON.stringify(content)); // Deep clone
  const sectionIndex = findPaymentHistorySectionJson(result);
  if (sectionIndex === -1) return result;

  const yearIndex = findYearTableJson(result, sectionIndex, year);
  if (yearIndex === -1) return result;

  // The table should be right after the year label
  const tableIndex = yearIndex + 1;
  const table = result[tableIndex];
  if (!table || table.type !== 'table') return result;

  const { half, index } = getMonthInfo(month);
  // Row indices: 0=header-first, 1=data-first, 2=header-second, 3=data-second
  const dataRowIndex = half === 'first' ? 1 : 3;

  const rows = table.children;
  if (!rows || !rows[dataRowIndex]) return result;

  const cells = rows[dataRowIndex].children;
  if (!cells || !cells[index]) return result;

  // Update the cell
  cells[index].children = [{ text: symbol }];
  if (bgColor) {
    cells[index].backgroundColor = bgColor;
  } else {
    delete cells[index].backgroundColor;
  }

  return result;
}

/**
 * Get month status from Plate JSON
 */
function getMonthStatusJson(
  content: PlateNode[],
  year: number,
  month: number
): 'paid' | 'missed' | 'empty' {
  const sectionIndex = findPaymentHistorySectionJson(content);
  if (sectionIndex === -1) return 'empty';

  const yearIndex = findYearTableJson(content, sectionIndex, year);
  if (yearIndex === -1) return 'empty';

  const tableIndex = yearIndex + 1;
  const table = content[tableIndex];
  if (!table || table.type !== 'table') return 'empty';

  const { half, index } = getMonthInfo(month);
  const dataRowIndex = half === 'first' ? 1 : 3;

  const rows = table.children;
  if (!rows || !rows[dataRowIndex]) return 'empty';

  const cells = rows[dataRowIndex].children;
  if (!cells || !cells[index]) return 'empty';

  const text = extractTextFromNode(cells[index]).trim();
  if (text === '✓') return 'paid';
  if (text === '✗') return 'missed';

  // Also check background color
  const bgColor = cells[index].backgroundColor;
  if (bgColor === COLOR_PAID) return 'paid';
  if (bgColor === COLOR_MISSED) return 'missed';

  return 'empty';
}
