import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireWorkspaceAccess } from "./users";

// =================================================================
// CALENDAR EVENT QUERIES
// =================================================================

/**
 * List all non-deleted events for a workspace.
 */
export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, { workspaceId }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("calendarEvents")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .collect();
  },
});

/**
 * Get a single event by ID.
 */
export const get = query({
  args: { id: v.id("calendarEvents") },
  handler: async (ctx, { id }) => {
    const event = await ctx.db.get(id);
    if (!event) return null;

    await requireWorkspaceAccess(ctx, event.workspaceId);
    return event;
  },
});

/**
 * List events for a specific date.
 */
export const listByDate = query({
  args: {
    workspaceId: v.id("workspaces"),
    date: v.string(),
  },
  handler: async (ctx, { workspaceId, date }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("calendarEvents")
      .withIndex("by_workspace_date", (q) =>
        q.eq("workspaceId", workspaceId).eq("date", date)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();
  },
});

/**
 * List events for a date range.
 */
export const listByDateRange = query({
  args: {
    workspaceId: v.id("workspaces"),
    startDate: v.string(),
    endDate: v.string(),
  },
  handler: async (ctx, { workspaceId, startDate, endDate }) => {
    await requireWorkspaceAccess(ctx, workspaceId);

    return await ctx.db
      .query("calendarEvents")
      .withIndex("by_workspace_deleted", (q) =>
        q.eq("workspaceId", workspaceId).eq("deleted", false)
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), startDate),
          q.lte(q.field("date"), endDate)
        )
      )
      .collect();
  },
});

/**
 * List recurring events with their instances.
 */
export const listRecurringInstances = query({
  args: {
    parentId: v.id("calendarEvents"),
  },
  handler: async (ctx, { parentId }) => {
    const parent = await ctx.db.get(parentId);
    if (!parent) return [];

    await requireWorkspaceAccess(ctx, parent.workspaceId);

    return await ctx.db
      .query("calendarEvents")
      .withIndex("by_recurrence_parent", (q) =>
        q.eq("recurrenceParentId", parentId)
      )
      .filter((q) => q.eq(q.field("deleted"), false))
      .collect();
  },
});

// =================================================================
// CALENDAR EVENT MUTATIONS
// =================================================================

/**
 * Create a new calendar event.
 */
export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    date: v.string(),
    endDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    isAllDay: v.optional(v.boolean()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    url: v.optional(v.string()),
    color: v.optional(v.string()),
    recurrence: v.optional(v.any()),
    source: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await requireWorkspaceAccess(ctx, args.workspaceId);

    const now = Date.now();

    const eventId = await ctx.db.insert("calendarEvents", {
      workspaceId: args.workspaceId,
      title: args.title,
      date: args.date,
      endDate: args.endDate,
      startTime: args.startTime,
      endTime: args.endTime,
      isAllDay: args.isAllDay ?? true,
      description: args.description,
      location: args.location,
      url: args.url,
      color: args.color,
      recurrence: args.recurrence,
      source: args.source,
      excludedDates: [],
      isException: false,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    });

    return eventId;
  },
});

/**
 * Update a calendar event.
 */
export const update = mutation({
  args: {
    id: v.id("calendarEvents"),
    title: v.optional(v.string()),
    date: v.optional(v.string()),
    endDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    isAllDay: v.optional(v.boolean()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    url: v.optional(v.string()),
    color: v.optional(v.string()),
    recurrence: v.optional(v.any()),
    excludedDates: v.optional(v.array(v.string())),
    source: v.optional(v.any()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const event = await ctx.db.get(id);
    if (!event) throw new Error("Event not found");

    await requireWorkspaceAccess(ctx, event.workspaceId);

    // Filter out undefined values
    const filteredUpdates: Record<string, unknown> = { updatedAt: Date.now() };
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
 * Delete an event (soft delete).
 */
export const remove = mutation({
  args: { id: v.id("calendarEvents") },
  handler: async (ctx, { id }) => {
    const event = await ctx.db.get(id);
    if (!event) throw new Error("Event not found");

    await requireWorkspaceAccess(ctx, event.workspaceId);

    await ctx.db.patch(id, {
      deleted: true,
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Delete a recurring event and all its instances.
 */
export const removeRecurring = mutation({
  args: { id: v.id("calendarEvents") },
  handler: async (ctx, { id }) => {
    const event = await ctx.db.get(id);
    if (!event) throw new Error("Event not found");

    await requireWorkspaceAccess(ctx, event.workspaceId);

    const now = Date.now();

    // Delete all instances
    const instances = await ctx.db
      .query("calendarEvents")
      .withIndex("by_recurrence_parent", (q) => q.eq("recurrenceParentId", id))
      .collect();

    for (const instance of instances) {
      await ctx.db.patch(instance._id, {
        deleted: true,
        deletedAt: now,
        updatedAt: now,
      });
    }

    // Delete the parent
    await ctx.db.patch(id, {
      deleted: true,
      deletedAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Add an exception to a recurring event.
 */
export const addException = mutation({
  args: {
    parentId: v.id("calendarEvents"),
    exceptionDate: v.string(),
    newEvent: v.optional(
      v.object({
        title: v.string(),
        date: v.string(),
        startTime: v.optional(v.string()),
        endTime: v.optional(v.string()),
        isAllDay: v.optional(v.boolean()),
        description: v.optional(v.string()),
        location: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, { parentId, exceptionDate, newEvent }) => {
    const parent = await ctx.db.get(parentId);
    if (!parent) throw new Error("Parent event not found");

    await requireWorkspaceAccess(ctx, parent.workspaceId);

    const now = Date.now();

    // Add to excluded dates
    const excludedDates = [...parent.excludedDates, exceptionDate];
    await ctx.db.patch(parentId, {
      excludedDates,
      updatedAt: now,
    });

    // Create exception event if provided
    if (newEvent) {
      return await ctx.db.insert("calendarEvents", {
        workspaceId: parent.workspaceId,
        ...newEvent,
        isAllDay: newEvent.isAllDay ?? true,
        recurrenceParentId: parentId,
        isException: true,
        excludedDates: [],
        deleted: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    return null;
  },
});

/**
 * Restore a deleted event.
 */
export const restore = mutation({
  args: { id: v.id("calendarEvents") },
  handler: async (ctx, { id }) => {
    const event = await ctx.db.get(id);
    if (!event) throw new Error("Event not found");

    await requireWorkspaceAccess(ctx, event.workspaceId);

    await ctx.db.patch(id, {
      deleted: false,
      deletedAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Permanently delete an event.
 */
export const permanentDelete = mutation({
  args: { id: v.id("calendarEvents") },
  handler: async (ctx, { id }) => {
    const event = await ctx.db.get(id);
    if (!event) throw new Error("Event not found");

    await requireWorkspaceAccess(ctx, event.workspaceId);

    await ctx.db.delete(id);
  },
});
