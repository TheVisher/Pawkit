# Plan: Clean Up Extracted Article Content

## Problem
Readability extraction works well for news articles and recipes, but produces garbage for non-article pages (e-commerce, product pages). The extracted content often includes:
- Excessive whitespace and empty elements
- Orphaned characters (`/`, `|`, `·`)
- Form field labels and empty form elements
- UI artifacts ("Keep Screen Awake", zoom buttons, scaling controls)
- Navigation fragments

## Solution
Add a post-processing cleanup step in `article-extractor.ts` after Readability parses the content. This cleans up garbage patterns while preserving good content like recipes and articles.

---

## Files to Modify

1. `/src/lib/services/article-extractor.ts` - Add `cleanupExtractedContent()` function

---

## Implementation

### Phase 1: Create Cleanup Function

Add a new function `cleanupExtractedContent(html: string): string` that uses cheerio to:

1. **Remove form elements entirely:**
   - `<form>`, `<input>`, `<select>`, `<textarea>`, `<button type="submit">`, `<fieldset>`, `<label>`

2. **Remove UI artifact text patterns:**
   - Elements containing: "Keep Screen Awake", "Skip to", "Subscribe", "Sign in", "Log in"
   - Zoom/scale controls: "+", "-", "1x", "2x", "1/2x" (when standalone)
   - "Share:", "Print", "Email" (standalone UI buttons)

3. **Remove orphaned characters:**
   - Elements that contain only: `/`, `|`, `·`, `•`, `-`, `*`, `:`
   - Very short elements (<3 chars) that are just punctuation

4. **Collapse excessive whitespace:**
   - Remove consecutive empty `<p>` tags (keep max 1)
   - Remove consecutive `<br>` tags (keep max 2)
   - Trim excessive whitespace in text nodes

5. **Remove empty structural elements:**
   - Empty `<div>`, `<span>`, `<section>`, `<article>` with no meaningful content

### Phase 2: Integrate into Extraction Flow

In `extractArticle()`, after Readability parses:

```typescript
const article = reader.parse();

if (article?.content) {
  article.content = cleanupExtractedContent(article.content);
}
```

---

## Cleanup Patterns (Detailed)

```typescript
// Form elements to remove
const FORM_ELEMENTS = ['form', 'input', 'select', 'textarea', 'fieldset', 'label', 'button[type="submit"]'];

// UI text patterns to remove (case-insensitive, whole element if matches)
const UI_PATTERNS = [
  /^keep screen awake$/i,
  /^skip to /i,
  /^subscribe$/i,
  /^sign in$/i,
  /^log in$/i,
  /^share:?$/i,
  /^print$/i,
  /^email$/i,
  /^[+-]$/,           // Zoom buttons
  /^[12]x$/,          // Scale buttons
  /^1\/2x$/,          // Scale buttons
];

// Orphaned character patterns (elements with only these chars)
const ORPHAN_CHARS = /^[\s\/|·•\-*:]+$/;

// Empty element check
const isEmpty = (el) => !el.text().trim() && !el.find('img, video, iframe').length;
```

---

## What This Preserves

- **Recipe content**: Ingredients, directions, prep times (these are in proper `<ul>`, `<ol>`, `<p>` tags)
- **Article body text**: Paragraphs, headings, lists
- **Images and media**: Preserved with their containers
- **Links**: Preserved (unless in removed form/nav context)
- **Tables**: Preserved for data tables

---

## Edge Cases

1. **Recipe scaling buttons**: "1x 2x" gets removed but ingredient lists stay
2. **Price information**: Preserved if in proper text elements
3. **Product descriptions**: Preserved if Readability captured them
4. **Empty pages**: If cleanup removes everything, return original (fallback)

---

## Verification Steps

1. Test on Amazon product page - should remove form garbage
2. Test on AllRecipes recipe - should preserve ingredients/directions
3. Test on CNN article - should stay unchanged (already clean)
4. Test on product page with good description - should preserve description
5. Verify no regression on existing extracted cards

---

## Future Enhancement (Not This PR)

For recipes specifically, could later add:
- Detect Recipe JSON-LD schema
- Extract structured data (ingredients, steps, times)
- Convert to structured markdown format

This is out of scope for now - focus is on cleaning up Readability output.
