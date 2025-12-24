/**
 * Smart detection of action items / todos in text content
 * Used by QuickNotes to suggest adding items to the Todos list
 */

const TODO_PATTERNS = [
  // Shopping / acquiring
  /^(buy|get|pick up|pickup|purchase|order|grab)\s+(.+)/i,

  // Communication
  /^(call|text|email|message|contact|reach out to|reply to)\s+(.+)/i,

  // Reminders / obligations
  /^(remind me to|need to|have to|must|should|gotta|gonna)\s+(.+)/i,

  // Scheduling
  /^(schedule|book|set up|arrange|plan|organize)\s+(.+)/i,

  // Task completion
  /^(finish|complete|work on|do|start|begin|continue)\s+(.+)/i,

  // Payments / administrative
  /^(pay|renew|cancel|submit|send|file|register)\s+(.+)/i,

  // Review / consumption
  /^(check|review|read|watch|look at|look into|research)\s+(.+)/i,

  // Cleaning / organizing
  /^(clean|organize|sort|fix|repair|update)\s+(.+)/i,

  // Making / creating
  /^(make|create|write|prepare|draft)\s+(.+)/i,
];

export interface TodoDetectionResult {
  isTodo: boolean;
  task: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Analyzes text to detect if it's an action item / todo
 * Only analyzes the first line of multi-line text
 */
export function detectTodo(text: string): TodoDetectionResult {
  if (!text?.trim()) {
    return { isTodo: false, task: '', confidence: 'low' };
  }

  // Only analyze first line
  const firstLine = text.split('\n')[0].trim();

  // Skip if too short or too long
  if (firstLine.length < 5 || firstLine.length > 200) {
    return { isTodo: false, task: '', confidence: 'low' };
  }

  for (const pattern of TODO_PATTERNS) {
    const match = firstLine.match(pattern);
    if (match) {
      // The captured group (match[2]) is the task without the verb
      // For display, we use the full first line as the task
      return {
        isTodo: true,
        task: firstLine,
        confidence: 'high',
      };
    }
  }

  // Check for common todo indicators that might not match patterns
  const lowerText = firstLine.toLowerCase();
  const hasQuestionMark = firstLine.includes('?');

  // Questions are usually not todos
  if (hasQuestionMark) {
    return { isTodo: false, task: '', confidence: 'low' };
  }

  // Check for imperative mood (starts with a verb-like word)
  const imperativeStarters = [
    'add', 'ask', 'bring', 'change', 'discuss', 'download',
    'find', 'follow', 'go', 'help', 'install', 'learn',
    'look', 'meet', 'move', 'print', 'put', 'remove',
    'return', 'run', 'save', 'setup', 'share', 'sign',
    'stop', 'take', 'talk', 'tell', 'test', 'try',
    'turn', 'upload', 'use', 'verify', 'visit', 'wait',
  ];

  const firstWord = lowerText.split(/\s+/)[0];
  if (imperativeStarters.includes(firstWord)) {
    return {
      isTodo: true,
      task: firstLine,
      confidence: 'medium',
    };
  }

  return { isTodo: false, task: '', confidence: 'low' };
}

/**
 * Strips HTML tags from content for plain text display
 */
export function stripHtmlForDisplay(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
