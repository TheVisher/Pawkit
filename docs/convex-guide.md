# Convex Guide

A comprehensive guide to Convex for this project.

## Overview

Convex is a complete backend solution with cloud functions, database, scheduling, and real-time synchronization. It uses a document-relational database storing JSON-like documents in tables.

## Core Concepts

### Database

Tables automatically create themselves upon first document insertion:

```typescript
// `friends` table doesn't exist.
await ctx.db.insert("friends", { name: "Jamie" });
// Now it does, and it has one document.
```

Documents contain fields, values, and nested arrays/objects. Convex automatically adds `_id` and `_creationTime` fields.

### Functions

Convex has three function types:

| Feature | Queries | Mutations | Actions |
|---------|---------|-----------|---------|
| Database Access | Yes | Yes | No |
| Transactional | Yes | Yes | No |
| Cached Results | Yes | No | No |
| Real-time Updates | Yes | No | No |
| External API Calls | No | No | Yes |

## Schema Definition

Define schemas using `defineSchema` and `defineTable`:

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    body: v.string(),
    user: v.id("users"),
  }),
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),
});
```

### Validators

Common validators from `v`:

- `v.string()` - String values
- `v.number()` - Number values
- `v.boolean()` - Boolean values
- `v.id("tableName")` - Reference to another document
- `v.array(v.string())` - Array of values
- `v.object({...})` - Nested object
- `v.optional(v.string())` - Optional field
- `v.union(v.literal("a"), v.literal("b"))` - Union type
- `v.null()` - Null value
- `v.any()` - Any value (avoid when possible)

### Best Practices for Schemas

**1. Export and reuse validators:**

```typescript
// convex/schema.ts
export const courseValidator = v.union(
  v.literal('appetizer'),
  v.literal('main'),
  v.literal('dessert')
);

export const recipeFields = {
  name: v.string(),
  course: courseValidator,
  ingredients: v.array(v.string()),
  steps: v.array(v.string()),
};

export default defineSchema({
  recipes: defineTable(recipeFields).index("by_course", ["course"]),
});
```

**2. Extract TypeScript types from validators:**

```typescript
import { v, Infer } from "convex/values";

export const courseValidator = v.union(
  v.literal('appetizer'),
  v.literal('main'),
  v.literal('dessert')
);
export type Course = Infer<typeof courseValidator>;
```

**3. Use generated types:**

```typescript
import type { Doc, Id } from "../convex/_generated/dataModel";

function RecipePreview({ recipe }: { recipe: Doc<"recipes"> }) {
  return <div>{recipe.name}</div>;
}

function RecipeDetails({ id }: { id: Id<"recipes"> }) {
  // ...
}
```

**4. Remove system fields for inserts:**

```typescript
import type { WithoutSystemFields } from "convex/server";
import type { Doc } from "../convex/_generated/dataModel";

type NewRecipe = WithoutSystemFields<Doc<"recipes">>;
```

## Writing Queries

Queries are read-only functions with real-time subscriptions:

```typescript
// convex/chat.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getMessages = query({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").order("desc").take(50);
    return messages.reverse();
  },
});

export const getMessagesByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
```

## Writing Mutations

Mutations modify data and run as atomic transactions:

```typescript
// convex/chat.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const sendMessage = mutation({
  args: {
    user: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("messages", {
      user: args.user,
      body: args.body,
    });
  },
});

export const updateMessage = mutation({
  args: {
    id: v.id("messages"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { body: args.body });
  },
});

export const deleteMessage = mutation({
  args: { id: v.id("messages") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
```

## Writing Actions

Actions call external APIs but cannot access the database directly:

```typescript
// convex/actions.ts
import { action } from "./_generated/server";
import { v } from "convex/values";

export const fetchExternalData = action({
  args: { url: v.string() },
  handler: async (ctx, args) => {
    const response = await fetch(args.url);
    return await response.json();
  },
});
```

## React Integration

### Setup

```typescript
import { ConvexProvider, ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

reactDOMRoot.render(
  <ConvexProvider client={convex}>
    <App />
  </ConvexProvider>
);
```

### useQuery

Subscribe to real-time data:

```typescript
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

function MessageList() {
  const messages = useQuery(api.chat.getMessages);

  if (messages === undefined) {
    return <div>Loading...</div>;
  }

  return messages.map((msg) => <div key={msg._id}>{msg.body}</div>);
}
```

**With arguments:**

```typescript
const messages = useQuery(api.chat.getMessagesByUser, { userId: user._id });
```

**Conditional/skipped queries:**

```typescript
const messages = useQuery(
  api.chat.getMessagesByUser,
  userId ? { userId } : "skip"
);
```

### useMutation

Execute mutations:

```typescript
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

function SendButton() {
  const sendMessage = useMutation(api.chat.sendMessage);

  const handleClick = async () => {
    try {
      await sendMessage({ user: "Alice", body: "Hello!" });
    } catch (error) {
      console.error(error);
    }
  };

  return <button onClick={handleClick}>Send</button>;
}
```

### useAction

Call actions:

```typescript
import { useAction } from "convex/react";
import { api } from "../convex/_generated/api";

function FetchButton() {
  const fetchData = useAction(api.actions.fetchExternalData);

  return (
    <button onClick={() => fetchData({ url: "https://api.example.com/data" })}>
      Fetch
    </button>
  );
}
```

### One-off queries with useConvex

```typescript
import { useConvex } from "convex/react";

function CheckButton() {
  const convex = useConvex();

  return (
    <button onClick={async () => {
      const result = await convex.query(api.chat.getMessages);
      console.log(result);
    }}>
      Check
    </button>
  );
}
```

## Authentication

Convex supports multiple auth providers (Clerk, Auth0, WorkOS) or the built-in Convex Auth library.

Check authentication in functions:

```typescript
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const removeUserImage = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return; // Not authenticated
    }
    await ctx.db.patch(userId, { imageId: undefined });
  },
});
```

## File Storage

Convex provides built-in file storage:

```typescript
// Upload a file
const uploadUrl = await generateUploadUrl();
await fetch(uploadUrl, {
  method: "POST",
  body: file,
});

// Store file reference
await ctx.db.insert("files", {
  storageId: result.storageId,
  name: file.name,
});

// Get file URL
const url = await ctx.storage.getUrl(storageId);
```

## Indexes

Define indexes for efficient queries:

```typescript
defineTable({
  userId: v.id("users"),
  body: v.string(),
  timestamp: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_and_time", ["userId", "timestamp"])
```

Query with indexes:

```typescript
await ctx.db
  .query("messages")
  .withIndex("by_user_and_time", (q) =>
    q.eq("userId", userId).gt("timestamp", since)
  )
  .collect();
```

## Internal Functions

Use internal functions for code that shouldn't be exposed to clients:

```typescript
import { internalMutation, internalQuery } from "./_generated/server";

export const internalUpdateUser = internalMutation({
  args: { userId: v.id("users"), data: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, args.data);
  },
});
```

Call internal functions from other functions:

```typescript
import { internal } from "./_generated/api";

export const someAction = action({
  handler: async (ctx) => {
    await ctx.runMutation(internal.users.internalUpdateUser, {
      userId,
      data: { lastSeen: Date.now() },
    });
  },
});
```

## Resources

- [Convex Documentation](https://docs.convex.dev/)
- [Convex Dashboard](https://dashboard.convex.dev/)
- [Convex Discord](https://convex.dev/community)
