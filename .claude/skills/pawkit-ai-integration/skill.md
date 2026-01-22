# Pawkit AI Integration Patterns

**Purpose**: Ensure all Pawkit features are built with AI-ready foundations for Kit (AI assistant), MCP integration, and Omnibar commands.

**Philosophy**: Every user-facing action should be callable by AI. Build once, use everywhere - UI, keyboard shortcuts, Omnibar, Kit, and MCP tools.

---

## Core Architecture: Action Registry

All features MUST expose their actions through a centralized action registry. This enables:
1. **Kit (AI Assistant)** - Voice/text commands like "Hey Kit, save this URL"
2. **MCP Tools** - Desktop AI integration (Claude, etc.) can call Pawkit actions
3. **Omnibar** - Natural language command parsing
4. **Keyboard Shortcuts** - Consistent action execution
5. **UI Components** - Buttons, menus, context menus all use same actions

### Action Interface

```typescript
// lib/actions/types.ts
interface PawkitAction {
  id: string;                          // Unique identifier: "cards.create", "pockets.move"
  name: string;                        // Human-readable: "Create Card"
  description: string;                 // For AI context: "Creates a new card from a URL or note"
  category: ActionCategory;            // "cards" | "pockets" | "calendar" | "settings" | etc.

  // Schema for AI/MCP
  parameters: ActionParameter[];       // What inputs this action accepts
  returns: ActionReturn;               // What the action returns

  // Execution
  execute: (params: Record<string, unknown>, context: ActionContext) => Promise<ActionResult>;

  // Permissions
  requiresAuth: boolean;
  scopes?: string[];                   // For fine-grained permissions: ["cards:write", "pockets:read"]

  // AI hints
  examples?: string[];                 // Example natural language triggers
  aliases?: string[];                  // Alternative names: ["save", "bookmark", "add"]
}

interface ActionParameter {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  description: string;
  required: boolean;
  default?: unknown;
  enum?: unknown[];                    // For constrained values
}

interface ActionContext {
  userId: string;
  workspaceId: string;
  source: "ui" | "keyboard" | "omnibar" | "kit" | "mcp";
  metadata?: Record<string, unknown>;
}

interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  toast?: { type: "success" | "error" | "info"; message: string };
}
```

---

## Action Categories

### 1. Cards Actions

```typescript
// lib/actions/cards.ts

export const cardsActions: PawkitAction[] = [
  {
    id: "cards.create",
    name: "Create Card",
    description: "Creates a new card from a URL, note content, or file",
    category: "cards",
    parameters: [
      { name: "url", type: "string", description: "URL to bookmark", required: false },
      { name: "title", type: "string", description: "Card title", required: false },
      { name: "content", type: "string", description: "Note content (for notes)", required: false },
      { name: "type", type: "string", description: "Card type", required: false, enum: ["url", "md-note", "text-note", "quick-note"] },
      { name: "tags", type: "array", description: "Tags to apply", required: false },
      { name: "pockets", type: "array", description: "Pocket slugs to add to", required: false },
      { name: "scheduledDate", type: "string", description: "ISO date for calendar", required: false },
    ],
    returns: { type: "object", description: "Created card object with id" },
    execute: async (params, context) => {
      // Implementation calls useDataStore.getState().addCard()
    },
    requiresAuth: true,
    scopes: ["cards:write"],
    examples: [
      "Save this URL",
      "Bookmark https://example.com",
      "Create a note about project ideas",
      "Add this to my reading list",
    ],
    aliases: ["save", "bookmark", "add", "create"],
  },

  {
    id: "cards.update",
    name: "Update Card",
    description: "Updates an existing card's properties",
    category: "cards",
    parameters: [
      { name: "cardId", type: "string", description: "Card ID to update", required: true },
      { name: "title", type: "string", description: "New title", required: false },
      { name: "content", type: "string", description: "New content", required: false },
      { name: "tags", type: "array", description: "New tags", required: false },
      { name: "pinned", type: "boolean", description: "Pin status", required: false },
    ],
    returns: { type: "object", description: "Updated card object" },
    execute: async (params, context) => {
      // Implementation calls useDataStore.getState().updateCard()
    },
    requiresAuth: true,
    scopes: ["cards:write"],
    examples: [
      "Rename this card to Project Notes",
      "Pin this bookmark",
      "Add the 'work' tag to this",
    ],
    aliases: ["edit", "modify", "change"],
  },

  {
    id: "cards.delete",
    name: "Delete Card",
    description: "Moves a card to trash",
    category: "cards",
    parameters: [
      { name: "cardId", type: "string", description: "Card ID to delete", required: true },
      { name: "permanent", type: "boolean", description: "Skip trash, delete permanently", required: false, default: false },
    ],
    returns: { type: "boolean", description: "Success status" },
    execute: async (params, context) => {
      // Implementation calls useDataStore.getState().deleteCard()
    },
    requiresAuth: true,
    scopes: ["cards:delete"],
    examples: [
      "Delete this bookmark",
      "Remove this card",
      "Trash the selected items",
    ],
    aliases: ["remove", "trash"],
  },

  {
    id: "cards.move",
    name: "Move Card to Pocket",
    description: "Adds or moves a card to a pocket (collection)",
    category: "cards",
    parameters: [
      { name: "cardId", type: "string", description: "Card ID to move", required: true },
      { name: "pocketSlug", type: "string", description: "Pocket slug to move to", required: true },
      { name: "removeFromOthers", type: "boolean", description: "Remove from other pockets", required: false, default: false },
    ],
    returns: { type: "object", description: "Updated card object" },
    execute: async (params, context) => {
      // Implementation uses addCollectionWithHierarchy()
    },
    requiresAuth: true,
    scopes: ["cards:write", "pockets:read"],
    examples: [
      "Move this to Recipes",
      "Add to my Work pocket",
      "File this under Projects",
    ],
    aliases: ["file", "organize", "put"],
  },

  {
    id: "cards.search",
    name: "Search Cards",
    description: "Searches cards by query, tags, or filters",
    category: "cards",
    parameters: [
      { name: "query", type: "string", description: "Search query", required: false },
      { name: "tags", type: "array", description: "Filter by tags", required: false },
      { name: "type", type: "string", description: "Filter by card type", required: false },
      { name: "pocket", type: "string", description: "Filter by pocket slug", required: false },
      { name: "limit", type: "number", description: "Max results", required: false, default: 50 },
    ],
    returns: { type: "array", description: "Array of matching cards" },
    execute: async (params, context) => {
      // Implementation searches local store
    },
    requiresAuth: true,
    scopes: ["cards:read"],
    examples: [
      "Find my recipe bookmarks",
      "Search for React tutorials",
      "Show cards tagged 'urgent'",
    ],
    aliases: ["find", "lookup", "query"],
  },
];
```

### 2. Pockets (Collections) Actions

```typescript
// lib/actions/pockets.ts

export const pocketsActions: PawkitAction[] = [
  {
    id: "pockets.create",
    name: "Create Pocket",
    description: "Creates a new pocket (collection) for organizing cards",
    category: "pockets",
    parameters: [
      { name: "name", type: "string", description: "Pocket name", required: true },
      { name: "parentSlug", type: "string", description: "Parent pocket slug for nesting", required: false },
      { name: "isPrivate", type: "boolean", description: "Make pocket private", required: false, default: false },
      { name: "icon", type: "string", description: "Icon or emoji", required: false },
    ],
    returns: { type: "object", description: "Created pocket with id and slug" },
    execute: async (params, context) => {
      // Implementation calls collection creation API
    },
    requiresAuth: true,
    scopes: ["pockets:write"],
    examples: [
      "Create a pocket called Recipes",
      "Make a new folder for Work",
      "Add a sub-pocket under Projects",
    ],
    aliases: ["folder", "collection", "category"],
  },

  {
    id: "pockets.rename",
    name: "Rename Pocket",
    description: "Renames an existing pocket",
    category: "pockets",
    parameters: [
      { name: "pocketSlug", type: "string", description: "Pocket slug to rename", required: true },
      { name: "newName", type: "string", description: "New name", required: true },
    ],
    returns: { type: "object", description: "Updated pocket object" },
    execute: async (params, context) => {
      // Implementation calls collection update API
    },
    requiresAuth: true,
    scopes: ["pockets:write"],
    examples: [
      "Rename Recipes to Cooking",
      "Change Work folder name to Career",
    ],
    aliases: ["rename folder"],
  },

  {
    id: "pockets.delete",
    name: "Delete Pocket",
    description: "Deletes a pocket and optionally its contents",
    category: "pockets",
    parameters: [
      { name: "pocketSlug", type: "string", description: "Pocket slug to delete", required: true },
      { name: "deleteContents", type: "boolean", description: "Also delete cards inside", required: false, default: false },
    ],
    returns: { type: "boolean", description: "Success status" },
    execute: async (params, context) => {
      // Implementation calls collection delete API
    },
    requiresAuth: true,
    scopes: ["pockets:delete"],
    examples: [
      "Delete the Archive pocket",
      "Remove this folder and all its contents",
    ],
    aliases: ["remove folder"],
  },

  {
    id: "pockets.move",
    name: "Move Pocket",
    description: "Moves a pocket to a new parent (or root)",
    category: "pockets",
    parameters: [
      { name: "pocketSlug", type: "string", description: "Pocket slug to move", required: true },
      { name: "newParentSlug", type: "string", description: "New parent slug (null for root)", required: false },
    ],
    returns: { type: "object", description: "Updated pocket object" },
    execute: async (params, context) => {
      // Implementation calls collection move API
    },
    requiresAuth: true,
    scopes: ["pockets:write"],
    examples: [
      "Move Recipes under Hobbies",
      "Move this folder to root level",
    ],
    aliases: ["reorganize"],
  },

  {
    id: "pockets.list",
    name: "List Pockets",
    description: "Gets all pockets as a tree structure",
    category: "pockets",
    parameters: [
      { name: "includePrivate", type: "boolean", description: "Include private pockets", required: false, default: true },
      { name: "flat", type: "boolean", description: "Return flat list instead of tree", required: false, default: false },
    ],
    returns: { type: "array", description: "Array of pocket objects" },
    execute: async (params, context) => {
      // Implementation returns from local store
    },
    requiresAuth: true,
    scopes: ["pockets:read"],
    examples: [
      "Show my pockets",
      "List all folders",
    ],
    aliases: ["folders", "collections"],
  },
];
```

### 3. Calendar Actions (Future)

```typescript
// lib/actions/calendar.ts

export const calendarActions: PawkitAction[] = [
  {
    id: "calendar.schedule",
    name: "Schedule Event",
    description: "Schedules a card or creates an event on the calendar",
    category: "calendar",
    parameters: [
      { name: "cardId", type: "string", description: "Card to schedule (optional)", required: false },
      { name: "title", type: "string", description: "Event title", required: true },
      { name: "date", type: "string", description: "ISO date or natural language", required: true },
      { name: "time", type: "string", description: "Time (HH:MM or natural)", required: false },
      { name: "duration", type: "number", description: "Duration in minutes", required: false },
      { name: "notes", type: "string", description: "Event notes", required: false },
    ],
    returns: { type: "object", description: "Created calendar event" },
    execute: async (params, context) => {
      // Implementation creates calendar event
    },
    requiresAuth: true,
    scopes: ["calendar:write"],
    examples: [
      "Schedule dentist appointment for tomorrow at 2pm",
      "Add this to my calendar for next Monday",
      "Remind me about this on Friday",
    ],
    aliases: ["remind", "event", "appointment"],
  },

  {
    id: "calendar.list",
    name: "List Events",
    description: "Gets calendar events for a date range",
    category: "calendar",
    parameters: [
      { name: "startDate", type: "string", description: "Start date", required: false },
      { name: "endDate", type: "string", description: "End date", required: false },
      { name: "limit", type: "number", description: "Max events", required: false, default: 50 },
    ],
    returns: { type: "array", description: "Array of calendar events" },
    execute: async (params, context) => {
      // Implementation queries calendar store
    },
    requiresAuth: true,
    scopes: ["calendar:read"],
    examples: [
      "What's on my calendar this week?",
      "Show upcoming events",
    ],
    aliases: ["agenda", "schedule", "upcoming"],
  },
];
```

---

## Action Registry

```typescript
// lib/actions/registry.ts

import { cardsActions } from "./cards";
import { pocketsActions } from "./pockets";
import { calendarActions } from "./calendar";

class ActionRegistry {
  private actions: Map<string, PawkitAction> = new Map();

  constructor() {
    // Register all actions
    [...cardsActions, ...pocketsActions, ...calendarActions].forEach(action => {
      this.actions.set(action.id, action);
    });
  }

  get(actionId: string): PawkitAction | undefined {
    return this.actions.get(actionId);
  }

  getByCategory(category: ActionCategory): PawkitAction[] {
    return Array.from(this.actions.values()).filter(a => a.category === category);
  }

  getAll(): PawkitAction[] {
    return Array.from(this.actions.values());
  }

  // Find action by natural language (for Omnibar/Kit)
  findByIntent(query: string): PawkitAction[] {
    const queryLower = query.toLowerCase();
    return Array.from(this.actions.values()).filter(action => {
      // Check name, aliases, examples
      if (action.name.toLowerCase().includes(queryLower)) return true;
      if (action.aliases?.some(a => queryLower.includes(a))) return true;
      if (action.examples?.some(e => queryLower.includes(e.toLowerCase()))) return true;
      return false;
    });
  }

  async execute(actionId: string, params: Record<string, unknown>, context: ActionContext): Promise<ActionResult> {
    const action = this.get(actionId);
    if (!action) {
      return { success: false, error: `Unknown action: ${actionId}` };
    }

    // Validate required params
    for (const param of action.parameters) {
      if (param.required && !(param.name in params)) {
        return { success: false, error: `Missing required parameter: ${param.name}` };
      }
    }

    try {
      return await action.execute(params, context);
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}

export const actionRegistry = new ActionRegistry();
```

---

## MCP Tool Generation

Actions automatically generate MCP tool definitions:

```typescript
// lib/mcp/tools.ts

import { actionRegistry } from "../actions/registry";

export function generateMCPTools() {
  return actionRegistry.getAll().map(action => ({
    name: `pawkit_${action.id.replace(".", "_")}`,
    description: action.description,
    inputSchema: {
      type: "object",
      properties: Object.fromEntries(
        action.parameters.map(p => [
          p.name,
          {
            type: p.type,
            description: p.description,
            ...(p.enum ? { enum: p.enum } : {}),
            ...(p.default !== undefined ? { default: p.default } : {}),
          },
        ])
      ),
      required: action.parameters.filter(p => p.required).map(p => p.name),
    },
  }));
}

// Example output for cards.create:
// {
//   name: "pawkit_cards_create",
//   description: "Creates a new card from a URL, note content, or file",
//   inputSchema: {
//     type: "object",
//     properties: {
//       url: { type: "string", description: "URL to bookmark" },
//       title: { type: "string", description: "Card title" },
//       ...
//     },
//     required: []
//   }
// }
```

---

## Omnibar Integration

```typescript
// lib/omnibar/parser.ts

import { actionRegistry } from "../actions/registry";

interface ParsedCommand {
  action: PawkitAction;
  params: Record<string, unknown>;
  confidence: number;
}

export function parseOmnibarInput(input: string): ParsedCommand | null {
  // Check for explicit command prefix
  if (input.startsWith("/")) {
    const [command, ...args] = input.slice(1).split(" ");
    const action = actionRegistry.get(`cards.${command}`)
      || actionRegistry.get(`pockets.${command}`)
      || actionRegistry.get(`calendar.${command}`);
    if (action) {
      return { action, params: parseArgs(args, action), confidence: 1.0 };
    }
  }

  // Natural language matching
  const matches = actionRegistry.findByIntent(input);
  if (matches.length > 0) {
    return {
      action: matches[0],
      params: extractParams(input, matches[0]),
      confidence: 0.8,
    };
  }

  return null;
}
```

---

## Kit (AI Assistant) Integration

```typescript
// lib/kit/agent.ts

import { actionRegistry } from "../actions/registry";

export class KitAgent {
  private context: ActionContext;

  constructor(userId: string, workspaceId: string) {
    this.context = {
      userId,
      workspaceId,
      source: "kit",
    };
  }

  // Called when user says "Hey Kit, ..."
  async handleCommand(naturalLanguage: string): Promise<string> {
    // Use AI to parse intent and extract parameters
    const parsed = await this.parseIntent(naturalLanguage);

    if (!parsed) {
      return "I'm not sure what you want me to do. Try something like 'save this URL' or 'create a pocket called Work'.";
    }

    const result = await actionRegistry.execute(
      parsed.actionId,
      parsed.params,
      this.context
    );

    if (result.success) {
      return this.formatSuccessResponse(parsed.actionId, result.data);
    } else {
      return `Sorry, I couldn't do that: ${result.error}`;
    }
  }

  private async parseIntent(input: string) {
    // This would use AI (local or API) to parse natural language
    // For now, use simple pattern matching
    const actions = actionRegistry.getAll();
    // ... AI parsing logic
  }

  private formatSuccessResponse(actionId: string, data: unknown): string {
    switch (actionId) {
      case "cards.create":
        return `I've saved that for you!`;
      case "pockets.create":
        return `Created your new pocket: ${(data as any).name}`;
      case "calendar.schedule":
        return `Added to your calendar!`;
      default:
        return "Done!";
    }
  }
}
```

---

## Implementation Checklist

When building ANY new feature, ensure:

### 1. Action Definition
- [ ] Create action in appropriate file (cards.ts, pockets.ts, etc.)
- [ ] Define all parameters with types and descriptions
- [ ] Add natural language examples and aliases
- [ ] Implement execute function that calls store/API

### 2. Registry Integration
- [ ] Action is registered in ActionRegistry
- [ ] Action has unique ID following pattern: `category.verb`

### 3. MCP Compatibility
- [ ] Parameters use MCP-compatible types (string, number, boolean, array, object)
- [ ] Description is clear enough for AI to understand
- [ ] Required/optional params are correctly marked

### 4. Omnibar/Kit Support
- [ ] Examples cover common natural language triggers
- [ ] Aliases include common synonyms
- [ ] Parameters can be extracted from natural language

### 5. UI Parity
- [ ] UI buttons/menus call same action via registry
- [ ] Keyboard shortcuts call same action
- [ ] Context menus call same action

---

## Current Feature Status

| Feature | Action Registry | MCP Ready | Kit Ready | Omnibar Ready |
|---------|-----------------|-----------|-----------|---------------|
| Create Card |  TODO |  |  |  |
| Update Card |  TODO |  |  |  |
| Delete Card |  TODO |  |  |  |
| Move Card |  TODO |  |  |  |
| Search Cards |  TODO |  |  |  |
| Create Pocket |  TODO |  |  |  |
| Rename Pocket |  TODO |  |  |  |
| Delete Pocket |  TODO |  |  |  |
| Move Pocket |  TODO |  |  |  |
| Calendar Schedule |  TODO |  |  |  |

**Legend**:  Implemented |  In Progress |  TODO

---

## Migration Priority

1. **Phase 1 - Foundation** (Do Now)
   - Create `lib/actions/types.ts` with interfaces
   - Create `lib/actions/registry.ts` skeleton
   - Create this skill document

2. **Phase 2 - Core Actions** (Next Sprint)
   - Implement cards.create, cards.delete, cards.move
   - Implement pockets.create, pockets.delete
   - Wire existing UI to use action registry

3. **Phase 3 - MCP Integration** (Future)
   - Add MCP server to extension/desktop app
   - Generate tool definitions from registry
   - Test with Claude Desktop

4. **Phase 4 - Kit Assistant** (Future)
   - Implement natural language parser
   - Add voice input support
   - Train on Pawkit-specific intents

---

**Last Updated**: December 21, 2025
**Status**: Foundation created, implementation TODO
**Next Step**: Create lib/actions/types.ts with base interfaces
