import { internalMutation } from "./_generated/server";

// =================================================================
// CLEANUP INTERNAL FUNCTIONS
// =================================================================

/**
 * Purge items that have been deleted for over 30 days.
 * This is called by the monthly cron job.
 */
export const purgeOldDeletedItems = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

    let purgedCards = 0;
    let purgedCollections = 0;
    let purgedEvents = 0;
    let purgedTodos = 0;
    let purgedReferences = 0;

    // Purge old deleted cards
    const deletedCards = await ctx.db
      .query("cards")
      .filter((q) =>
        q.and(
          q.eq(q.field("deleted"), true),
          q.lt(q.field("deletedAt"), cutoff)
        )
      )
      .collect();

    for (const card of deletedCards) {
      // Delete associated collection notes
      const collectionNotes = await ctx.db
        .query("collectionNotes")
        .withIndex("by_card", (q) => q.eq("cardId", card._id))
        .collect();

      for (const note of collectionNotes) {
        await ctx.db.delete(note._id);
      }

      // Delete associated references
      const references = await ctx.db
        .query("references")
        .withIndex("by_source", (q) => q.eq("sourceId", card._id))
        .collect();

      for (const ref of references) {
        await ctx.db.delete(ref._id);
        purgedReferences++;
      }

      // Delete the card
      await ctx.db.delete(card._id);
      purgedCards++;
    }

    // Purge old deleted collections
    const deletedCollections = await ctx.db
      .query("collections")
      .filter((q) =>
        q.and(
          q.eq(q.field("deleted"), true),
          q.lt(q.field("deletedAt"), cutoff)
        )
      )
      .collect();

    for (const collection of deletedCollections) {
      // Delete associated collection notes
      const collectionNotes = await ctx.db
        .query("collectionNotes")
        .withIndex("by_collection", (q) => q.eq("collectionId", collection._id))
        .collect();

      for (const note of collectionNotes) {
        await ctx.db.delete(note._id);
      }

      // Delete the collection
      await ctx.db.delete(collection._id);
      purgedCollections++;
    }

    // Purge old deleted events
    const deletedEvents = await ctx.db
      .query("calendarEvents")
      .filter((q) =>
        q.and(
          q.eq(q.field("deleted"), true),
          q.lt(q.field("deletedAt"), cutoff)
        )
      )
      .collect();

    for (const event of deletedEvents) {
      await ctx.db.delete(event._id);
      purgedEvents++;
    }

    // Purge old deleted todos
    const deletedTodos = await ctx.db
      .query("todos")
      .filter((q) =>
        q.and(
          q.eq(q.field("deleted"), true),
          q.lt(q.field("deletedAt"), cutoff)
        )
      )
      .collect();

    for (const todo of deletedTodos) {
      await ctx.db.delete(todo._id);
      purgedTodos++;
    }

    // Purge old deleted references
    const deletedRefs = await ctx.db
      .query("references")
      .filter((q) =>
        q.and(
          q.eq(q.field("deleted"), true),
          q.lt(q.field("deletedAt"), cutoff)
        )
      )
      .collect();

    for (const ref of deletedRefs) {
      await ctx.db.delete(ref._id);
      purgedReferences++;
    }

    console.log("Cleanup complete:", {
      purgedCards,
      purgedCollections,
      purgedEvents,
      purgedTodos,
      purgedReferences,
    });

    return {
      purgedCards,
      purgedCollections,
      purgedEvents,
      purgedTodos,
      purgedReferences,
    };
  },
});
