# Pawkit V2 Kit AI & MCP

**Purpose**: AI tools, context awareness, MCP server, confirmation flows

**Created**: December 20, 2025

---

## KIT OVERVIEW

Kit is Pawkit's built-in AI assistant that can:
- Create bookmarks, notes, events, and tasks
- Search and organize content
- Extract structured data from pages
- Provide context-aware assistance

---

## KIT TOOLS

```typescript
// lib/services/kit-service.ts

const kitTools = {
  createCard: {
    description: 'Create a new bookmark or note',
    parameters: {
      type: { type: 'string', enum: ['url', 'md-note'] },
      title: { type: 'string' },
      url: { type: 'string', optional: true },
      content: { type: 'string', optional: true },
      collections: { type: 'array', items: { type: 'string' }, optional: true }
    },
    execute: async (params, { workspaceId }) => {
      const card = await createCard({ ...params, workspaceId });
      return { success: true, card };
    }
  },

  createEvent: {
    description: 'Create a calendar event',
    parameters: {
      title: { type: 'string' },
      date: { type: 'string' },
      startTime: { type: 'string', optional: true },
      endTime: { type: 'string', optional: true }
    },
    execute: async (params, { workspaceId }) => {
      const event = await createEvent({ ...params, workspaceId });
      return { success: true, event };
    }
  },

  createTodo: {
    description: 'Create a task',
    parameters: {
      text: { type: 'string' },
      dueDate: { type: 'string', optional: true }
    },
    execute: async (params, { workspaceId }) => {
      const todo = await createTodo({ ...params, workspaceId });
      return { success: true, todo };
    }
  },

  addToCollection: {
    description: 'Add a card to a Pawkit',
    parameters: {
      cardId: { type: 'string' },
      collectionSlug: { type: 'string' }
    },
    execute: async (params, { workspaceId }) => {
      await addCardToCollection(params.cardId, params.collectionSlug);
      return { success: true };
    }
  },

  search: {
    description: 'Search across cards and notes',
    parameters: {
      query: { type: 'string' },
      type: { type: 'string', enum: ['all', 'bookmarks', 'notes'], optional: true }
    },
    execute: async (params, { workspaceId }) => {
      const results = await searchCards({ ...params, workspaceId });
      return { results };
    }
  }
};
```

---

## CONTEXT AWARENESS

Kit receives different context based on current view:

```typescript
interface KitContext {
  viewContext: 'library' | 'notes' | 'calendar' | 'pawkit' | 'home';
  pawkitSlug?: string;  // If viewing a specific Pawkit

  // Card context when viewing a specific card
  activeCardContext?: {
    id: string;
    title: string;
    url?: string;
    content?: string;
    notes?: string;
  };

  // Video context for YouTube cards
  videoContext?: {
    cardId: string;
    cardTitle: string;
    summary?: string;
    transcript?: string;  // Truncated for token limits
  };
}
```

### Context Examples

**In Library View**:
```typescript
{
  viewContext: 'library',
  // Kit knows user is browsing all content
}
```

**In Pawkit View**:
```typescript
{
  viewContext: 'pawkit',
  pawkitSlug: 'restaurants',
  // Kit can suggest adding to this Pawkit
}
```

**Viewing a Card**:
```typescript
{
  viewContext: 'library',
  activeCardContext: {
    id: 'clxyz...',
    title: 'Best Restaurants in NYC',
    url: 'https://...',
    content: '...'
  },
  // Kit can answer questions about this card
}
```

**YouTube Card**:
```typescript
{
  viewContext: 'library',
  videoContext: {
    cardId: 'clxyz...',
    cardTitle: 'React Conf 2024',
    transcript: '[00:00] Welcome to...'
  },
  // Kit can answer questions about the video
}
```

---

## CONFIRMATION FLOW

When Kit wants to perform an action:

### 1. Kit Returns Tool Call
```typescript
{
  tool: 'createEvent',
  params: {
    title: 'Team Meeting',
    date: '2025-12-20',
    startTime: '14:00'
  },
  requiresConfirmation: true
}
```

### 2. UI Shows Confirmation Dialog
```
┌─────────────────────────────────────────┐
│ Kit wants to create an event           │
├─────────────────────────────────────────┤
│ 📅 Team Meeting                         │
│ December 20, 2025 at 2:00 PM           │
├─────────────────────────────────────────┤
│ ☐ Don't ask again for this action      │
│                                         │
│              [Cancel] [Create]          │
└─────────────────────────────────────────┘
```

### 3. User Confirms
- Action executes
- If "Don't ask again" checked → store preference

### 4. Store Preferences
```typescript
interface KitPreferences {
  autoConfirm: {
    createEvent: boolean;
    createTodo: boolean;
    addToCollection: boolean;
    // Other tools...
  };
}
```

---

## MCP SERVER

### Package Location
```
packages/mcp-server/
├── src/
│   ├── index.ts
│   ├── tools/
│   │   ├── cards.ts
│   │   ├── collections.ts
│   │   ├── events.ts
│   │   └── todos.ts
│   └── auth.ts
└── package.json
```

### Server Setup
```typescript
// packages/mcp-server/src/index.ts
import { Server } from '@modelcontextprotocol/sdk/server';

const server = new Server({
  name: 'pawkit',
  version: '1.0.0'
});

// Register tools
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'pawkit_list_cards',
      description: 'List cards with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['all', 'url', 'md-note'] },
          collection: { type: 'string' },
          limit: { type: 'number' }
        }
      }
    },
    {
      name: 'pawkit_create_card',
      description: 'Create a new card',
      inputSchema: { /* ... */ }
    },
    {
      name: 'pawkit_update_card',
      description: 'Update an existing card',
      inputSchema: { /* ... */ }
    },
    {
      name: 'pawkit_delete_card',
      description: 'Delete a card',
      inputSchema: { /* ... */ }
    },
    {
      name: 'pawkit_list_collections',
      description: 'List Pawkits',
      inputSchema: { /* ... */ }
    },
    {
      name: 'pawkit_search',
      description: 'Search across all content',
      inputSchema: { /* ... */ }
    },
    {
      name: 'pawkit_create_todo',
      description: 'Create a task',
      inputSchema: { /* ... */ }
    },
    {
      name: 'pawkit_create_event',
      description: 'Create a calendar event',
      inputSchema: { /* ... */ }
    }
  ]
}));
```

### Tool Execution
```typescript
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  // Authenticate via token
  const token = request.headers?.['x-pawkit-token'];
  const connection = await verifyMcpToken(token);

  if (!connection) {
    throw new Error('Invalid MCP token');
  }

  // Execute tool
  switch (name) {
    case 'pawkit_list_cards':
      return await listCards(connection.userId, args);
    case 'pawkit_create_card':
      return await createCard(connection.userId, args);
    case 'pawkit_search':
      return await searchCards(connection.userId, args);
    // ... etc
  }
});
```

---

## MCP TOKEN MANAGEMENT

### Token Generation (Settings → Connections → MCP)
```typescript
// Generate token
const token = `pk_live_${randomBytes(24).toString('hex')}`;

// Hash and store
await prisma.connection.create({
  data: {
    userId,
    provider: 'mcp',
    apiToken: token,  // Plain token shown once
    apiTokenHash: await bcrypt.hash(token, 10),
    status: 'connected'
  }
});
```

### Token Format
- **Prefix**: `pk_live_`
- **Body**: 48-character hex string
- **Example**: `pk_live_a1b2c3d4e5f6g7h8...`

### Token Verification
```typescript
async function verifyMcpToken(token: string): Promise<Connection | null> {
  const connections = await prisma.connection.findMany({
    where: { provider: 'mcp', status: 'connected' }
  });

  for (const conn of connections) {
    if (await bcrypt.compare(token, conn.apiTokenHash)) {
      return conn;
    }
  }

  return null;
}
```

---

## KIT UI COMPONENTS

### Chat Panel
```typescript
// components/kit/kit-chat-panel.tsx
export function KitChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const context = useKitContext();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // Send to AI with context
    const response = await sendToKit(input, context);
    // Handle response and tool calls
  };

  return (
    <div className="kit-panel">
      <KitMessages messages={messages} />
      <KitInput value={input} onChange={setInput} onSubmit={handleSubmit} />
    </div>
  );
}
```

### Overlay Mode
```typescript
// components/kit/kit-overlay.tsx
export function KitOverlay() {
  const isOpen = useUIStore(state => state.kitOverlayOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60">
      <div className="absolute right-4 top-4 bottom-4 w-[400px]">
        <KitChatPanel />
      </div>
    </div>
  );
}
```

---

## VERCEL AI SDK INTEGRATION

```typescript
// lib/services/kit-service.ts
import { generateText, streamText } from 'ai';
import { openai } from '@ai-sdk/openai';

async function sendToKit(message: string, context: KitContext) {
  const result = await streamText({
    model: openai('gpt-4-turbo'),
    system: buildSystemPrompt(context),
    messages: [{ role: 'user', content: message }],
    tools: kitTools
  });

  return result;
}

function buildSystemPrompt(context: KitContext): string {
  let prompt = `You are Kit, the AI assistant for Pawkit.
You help users organize their bookmarks, notes, and tasks.`;

  if (context.activeCardContext) {
    prompt += `\n\nUser is currently viewing: ${context.activeCardContext.title}`;
  }

  if (context.videoContext?.transcript) {
    prompt += `\n\nVideo transcript available for context.`;
  }

  return prompt;
}
```

---

**Last Updated**: December 20, 2025
