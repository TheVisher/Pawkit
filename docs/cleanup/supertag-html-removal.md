# Supertag HTML Legacy Code Removal

## Background

The supertag system was converted from HTML templates to Plate JSON templates. The conversion is complete and all sections now have native `listJson`/`tableJson` properties. Since V2 has no legacy data, all HTML-related code is now dead code.

## Items to Remove

### 1. Unused Helper Functions in `plate-builders.ts`

**File:** `src/lib/tags/supertags/plate-builders.ts`
**Lines:** 195-255

Functions that are exported but never imported anywhere:
- `listSection`
- `tableSection`
- `taskSection`
- `notesSection`
- `buildTemplate`
- `serializeTemplate`

### 2. Deprecated HTML Builder Functions

Remove from each supertag file:
- `build*Template` (e.g., `buildTodoTemplate`)
- `get*Template` (e.g., `getTodoTemplate`)
- `get*Section` (e.g., `getTodoSection`)

**Files:**
- `src/lib/tags/supertags/todo.ts` (lines 217-244)
- `src/lib/tags/supertags/contact.ts` (lines 372-399)
- `src/lib/tags/supertags/subscription.ts`
- `src/lib/tags/supertags/recipe.ts`
- `src/lib/tags/supertags/reading.ts`
- `src/lib/tags/supertags/project.ts`
- `src/lib/tags/supertags/meeting.ts`
- `src/lib/tags/supertags/habit.ts`
- `src/lib/tags/supertags/wishlist.ts` (lines 398-425)
- `src/lib/tags/supertags/warranty.ts`

### 3. Deprecated Exports from Index

**File:** `src/lib/tags/supertags/index.ts`

Remove exports of all the deprecated HTML functions (lines ~31-138 where `build*Template`, `get*Template`, `get*Section` are exported).

### 4. HTML Properties in Section Definitions

Remove `listHtml` and `tableHtml` from all section definitions in each supertag file. Update the `TemplateSection` type to make `listJson`/`tableJson` required instead of optional.

**File:** `src/lib/tags/supertags/types.ts`

Change:
```typescript
export interface TemplateSection {
  id: string;
  name: string;
  /** @deprecated */
  listHtml: string;
  /** @deprecated */
  tableHtml: string;
  listJson?: import('platejs').Descendant[];
  tableJson?: import('platejs').Descendant[];
}
```

To:
```typescript
export interface TemplateSection {
  id: string;
  name: string;
  listJson: import('platejs').Descendant[];
  tableJson: import('platejs').Descendant[];
}
```

### 5. SupertagPanel Fallback Code

**File:** `src/components/layout/right-sidebar/SupertagPanel.tsx`

- Remove `getSectionHtml()` function (lines 254-257)
- Remove HTML fallback in `getSectionJson()` (lines 247-249)
- Remove HTML fallback in `handleAddSection` (lines 561-572)

### 6. HTML Fallback Parsing in Extraction Functions (Optional)

The `extract*Info` and `extractFieldValues` functions in each supertag file have HTML regex fallbacks that will never execute. These can be removed for cleaner code but are low priority.

**Example in `contact.ts`:** Lines 592-641 (HTML parsing fallback in `extractContactInfo`)

## Why This is Safe

- V2 has no legacy HTML data in the database
- All section definitions have `listJson`/`tableJson` populated
- All default templates use the `get*TemplateJson()` functions
- JSON parsing doesn't randomly fail - the fallbacks are migration code, not resilience code

## Estimated Scope

- ~10 files to modify
- ~500 lines of dead code to remove
- No behavioral changes expected
