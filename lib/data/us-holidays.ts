/**
 * US Federal Holidays Data
 *
 * Includes both fixed-date holidays and floating holidays (calculated based on weekday occurrence)
 */

export interface Holiday {
  name: string;
  date?: string;  // MM-DD format for fixed dates
  type: 'major' | 'minor';
  // For floating holidays (like Thanksgiving = 4th Thursday of November)
  calculation?: {
    month: number;      // 0-11 (JavaScript month)
    weekday: number;    // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    occurrence: number; // 1st, 2nd, 3rd, 4th, or -1 for last
  };
}

export interface ResolvedHoliday {
  name: string;
  date: string;  // YYYY-MM-DD format
  type: 'major' | 'minor';
}

export const US_HOLIDAYS: Holiday[] = [
  // Major Holidays
  { name: "New Year's Day", date: "01-01", type: 'major' },
  { name: "Independence Day", date: "07-04", type: 'major' },
  { name: "Christmas Day", date: "12-25", type: 'major' },
  { name: "Thanksgiving", type: 'major', calculation: { month: 10, weekday: 4, occurrence: 4 } },  // 4th Thursday of November
  { name: "Memorial Day", type: 'major', calculation: { month: 4, weekday: 1, occurrence: -1 } },  // Last Monday of May
  { name: "Labor Day", type: 'major', calculation: { month: 8, weekday: 1, occurrence: 1 } },      // 1st Monday of September

  // Minor/Other Federal Holidays
  { name: "Martin Luther King Jr. Day", type: 'minor', calculation: { month: 0, weekday: 1, occurrence: 3 } },  // 3rd Monday of January
  { name: "Presidents' Day", type: 'minor', calculation: { month: 1, weekday: 1, occurrence: 3 } },              // 3rd Monday of February
  { name: "Columbus Day", type: 'minor', calculation: { month: 9, weekday: 1, occurrence: 2 } },                 // 2nd Monday of October
  { name: "Veterans Day", date: "11-11", type: 'minor' },

  // Common observances
  { name: "Valentine's Day", date: "02-14", type: 'minor' },
  { name: "St. Patrick's Day", date: "03-17", type: 'minor' },
  { name: "Halloween", date: "10-31", type: 'minor' },
  { name: "New Year's Eve", date: "12-31", type: 'minor' },
];

/**
 * Calculate the Nth occurrence of a weekday in a given month
 * @param year - The year
 * @param month - The month (0-11)
 * @param weekday - The day of week (0=Sun, 1=Mon, etc.)
 * @param occurrence - Which occurrence (1=1st, 2=2nd, etc., -1=last)
 */
function getNthWeekdayOfMonth(
  year: number,
  month: number,
  weekday: number,
  occurrence: number
): Date {
  if (occurrence === -1) {
    // Last occurrence of weekday in month
    // Start from the last day of the month and work backwards
    const lastDay = new Date(year, month + 1, 0); // Last day of month
    const lastDayWeekday = lastDay.getDay();

    // Calculate how many days to subtract to get to the target weekday
    let daysToSubtract = lastDayWeekday - weekday;
    if (daysToSubtract < 0) {
      daysToSubtract += 7;
    }

    return new Date(year, month, lastDay.getDate() - daysToSubtract);
  }

  // Nth occurrence (1st, 2nd, 3rd, 4th)
  const firstOfMonth = new Date(year, month, 1);
  const firstWeekday = firstOfMonth.getDay();

  // Calculate the date of the first occurrence of the target weekday
  let daysUntilFirst = weekday - firstWeekday;
  if (daysUntilFirst < 0) {
    daysUntilFirst += 7;
  }

  // Calculate the Nth occurrence
  const dayOfMonth = 1 + daysUntilFirst + (occurrence - 1) * 7;

  return new Date(year, month, dayOfMonth);
}

/**
 * Get the date for a holiday in a specific year
 */
export function getHolidayDate(holiday: Holiday, year: number): string {
  if (holiday.date) {
    // Fixed date holiday - format as YYYY-MM-DD
    return `${year}-${holiday.date}`;
  }

  if (holiday.calculation) {
    const { month, weekday, occurrence } = holiday.calculation;
    const date = getNthWeekdayOfMonth(year, month, weekday, occurrence);

    // Format as YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  return '';
}

/**
 * Get all holidays for a given year with their actual dates
 */
export function getHolidaysForYear(year: number): ResolvedHoliday[] {
  return US_HOLIDAYS.map(holiday => ({
    name: holiday.name,
    date: getHolidayDate(holiday, year),
    type: holiday.type,
  })).filter(h => h.date !== '');
}

/**
 * Get holidays within a date range (for calendar display)
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @param filter - 'all' for all holidays, 'major' for major holidays only
 */
export function getHolidaysInRange(
  startDate: string,
  endDate: string,
  filter: 'all' | 'major' = 'all'
): ResolvedHoliday[] {
  // Extract years from the range
  const startYear = parseInt(startDate.substring(0, 4), 10);
  const endYear = parseInt(endDate.substring(0, 4), 10);

  const holidays: ResolvedHoliday[] = [];

  // Get holidays for each year in the range
  for (let year = startYear; year <= endYear; year++) {
    const yearHolidays = getHolidaysForYear(year);
    holidays.push(...yearHolidays);
  }

  // Filter by date range and type
  return holidays.filter(holiday => {
    // Check date range
    if (holiday.date < startDate || holiday.date > endDate) {
      return false;
    }

    // Check type filter
    if (filter === 'major' && holiday.type !== 'major') {
      return false;
    }

    return true;
  });
}

/**
 * Check if a specific date is a holiday
 * @param date - Date in YYYY-MM-DD format
 * @param filter - 'all' for all holidays, 'major' for major holidays only
 */
export function getHolidayForDate(
  date: string,
  filter: 'all' | 'major' = 'all'
): ResolvedHoliday | null {
  const holidays = getHolidaysInRange(date, date, filter);
  return holidays.length > 0 ? holidays[0] : null;
}

/**
 * Get upcoming holidays from today
 * @param limit - Maximum number of holidays to return
 * @param filter - 'all' for all holidays, 'major' for major holidays only
 */
export function getUpcomingHolidays(
  limit: number = 5,
  filter: 'all' | 'major' = 'all'
): ResolvedHoliday[] {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Get holidays for this year and next year
  const thisYear = today.getFullYear();
  const holidays: ResolvedHoliday[] = [
    ...getHolidaysForYear(thisYear),
    ...getHolidaysForYear(thisYear + 1),
  ];

  // Filter to upcoming holidays only
  return holidays
    .filter(holiday => {
      if (holiday.date < todayStr) return false;
      if (filter === 'major' && holiday.type !== 'major') return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit);
}
