import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceAccess } from "./users";

// =================================================================
// TODO QUERIES
// =================================================================

/**
 * List all non-deleted todos for a workspace.
 */
export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("todos")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .collect();
  },
});

/**
 * Get a single todo by ID.
 */
export const get = query({
  args: { id: v.id("todos") },
  handler: async (ctx, { id }) => {
    const todo = await ctx.db.get(id);
    if (!todo) return null;

    await requireWorkspaceAccess(ctx, todo.workspaceId);
    return todo;
  },
});

/**
 * List incomplete todos.
 */
export const listIncomplete = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("todos")
      .withIndex("by_workspace_completed", (q) =>
        q.eq("workspaceId", workspaceId).eq("completed", false)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();
  },
});

/**
 * List completed todos.
 */
export const listCompleted = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("todos")
      .withIndex("by_workspace_completed", (q) =>
        q.eq("workspaceId", workspaceId).eq("completed", true)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();
  },
});

/**
 * List todos due on or before a specific date.
 */
export const listDueBefore = query({
  args: {
    workspaceId: v.id("workspaces"),
    dueDate: v.number(),
  },
  handler: async (ctx, { workspaceId, dueDate }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("todos")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("completed"), false),
          q.neq(q.field("dueDate"), undefined),
          q.lte(q.field("dueDate"), dueDate)
        )
      )
      .collect();
  },
});

/**
 * List todos linked to a specific card.
 */
export const listByCard = query({
  args: { cardId: v.id("cards") },
  handler: async (ctx, { cardId }) => {
    const card = await ctx.db.get(cardId);
    if (!card) return [];

    await requireWorkspaceAccess(ctx, card.workspaceId);

    return await ctx.db
      .query("todos")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", card.workspaceId).eq("deleted", false)
      )
      .filter((q) => q.eq(q.field("linkedCardId"), cardId))
      .collect();
  },
});

// =================================================================
// TODO MUTATIONS
// =================================================================

/**
 * Create a new todo.
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    text: v.string(),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.string()),
    linkedCardId: v.optional(v.id("cards")),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId);

    const now = Date.now();

    const todoId = await ctx.db.insert("todos", {
      workspaceId: args.workspaceId,
      text: args.text,
      completed: false,
      dueDate: args.dueDate,
      priority: args.priority,
      linkedCardId: args.linkedCardId,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });

    return todoId;
  },
});

/**
 * Update a todo.
 */
export const update = mutation({
  args: {
    id: v.id("todos"),
    text: v.optional(v.string()),
    completed: v.optional(v.boolean()),
    dueDate: v.optional(v.number()),
    priority: v.optional(v.string()),
    linkedCardId: v.optional(v.id("cards")),
  },
  handler: async (ctx, { id, completed, ...updates }) => {
    const todo = await ctx.db.get(id);
    if (!todo) throw new Error("Todo not found");

    await requireWorkspaceAccess(ctx, todo.workspaceId);

    const now = Date.now();

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = { updatedAt: now };

    // Handle completion status change
    if (completed !== undefined) {
      filteredUpdates.completed = completed;
      filteredUpdates.completedAt = completed ? now : undefined;
    }

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        filteredUpdates[key] = value;
      }
    }

    await ctx.db.patch(id, filteredUpdates);
    return await ctx.db.get(id);
  },
});

/**
 * Toggle todo completion status.
 */
export const toggle = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, { id }) => {
    const todo = await ctx.db.get(id);
    if (!todo) throw new Error("Todo not found");

    await requireWorkspaceAccess(ctx, todo.workspaceId);

    const now = Date.now();
    const newCompleted = !todo.completed;

    await ctx.db.patch(id, {
      completed: newCompleted,
      completedAt: newCompleted ? now : undefined,
      updatedAt: now,
    });

    return await ctx.db.get(id);
  },
});

/**
 * Delete a todo (soft delete).
 */
export const remove = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, { id }) => {
    const todo = await ctx.db.get(id);
    if (!todo) throw new Error("Todo not found");

    await requireWorkspaceAccess(ctx, todo.workspaceId);

    await ctx.db.patch(id, {
      deleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Restore a deleted todo.
 */
export const restore = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, { id }) => {
    const todo = await ctx.db.get(id);
    if (!todo) throw new Error("Todo not found");

    await requireWorkspaceAccess(ctx, todo.workspaceId);

    await ctx.db.patch(id, {
      deleted: false,
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Permanently delete a todo.
 */
export const permanentDelete = mutation({
  args: { id: v.id("todos") },
  handler: async (ctx, { id }) => {
    const todo = await ctx.db.get(id);
    if (!todo) throw new Error("Todo not found");

    await requireWorkspaceAccess(ctx, todo.workspaceId);

    await ctx.db.delete(id);
  },
});

/**
 * Bulk complete todos.
 */
export const bulkComplete = mutation({
  args: { todoIds: v.array(v.id("todos")) },
  handler: async (ctx, { todoIds }) => {
    const now = Date.now();

    for (const todoId of todoIds) {
      const todo = await ctx.db.get(todoId);
      if (!todo) continue;

      await requireWorkspaceAccess(ctx, todo.workspaceId);

      await ctx.db.patch(todoId, {
        completed: true,
        completedAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Bulk delete todos (soft delete).
 */
export const bulkDelete = mutation({
  args: { todoIds: v.array(v.id("todos")) },
  handler: async (ctx, { todoIds }) => {
    const now = Date.now();

    for (const todoId of todoIds) {
      const todo = await ctx.db.get(todoId);
      if (!todo) continue;

      await requireWorkspaceAccess(ctx, todo.workspaceId);

      await ctx.db.patch(todoId, {
        deleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }
  },
});

/**
 * Clear completed todos (soft delete all completed).
 */
export const clearCompleted = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    const now = Date.now();

    const completedTodos = await ctx.db
      .query("todos")
      .withIndex("by_workspace_completed", (q) =>
        q.eq("workspaceId", workspaceId).eq("completed", true)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();

    for (const todo of completedTodos) {
      await ctx.db.patch(todo._id, {
        deleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }

    return { deleted: completedTodos.length };
  },
});
