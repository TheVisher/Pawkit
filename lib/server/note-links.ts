/**
 * Server-side utilities for managing note links, card references, and tags
 */

import { PrismaClient } from "@prisma/client";
import { extractTags } from "@/lib/utils/tag-extractor";
import { parseWikiLinks, extractNoteReferences, extractCardReferences } from "@/lib/utils/wiki-link-parser";

const prisma = new PrismaClient();

/**
 * Update all links and tags for a note based on its content
 */
export async function updateNoteLinksAndTags(noteId: string, content: string, userId: string) {
  // Extract tags
  const tags = extractTags(content);

  // Extract note references
  const noteReferences = extractNoteReferences(content);

  // Extract card references
  const cardReferences = extractCardReferences(content);

  // Update in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Delete existing note links
    await tx.noteLink.deleteMany({
      where: { sourceNoteId: noteId }
    });

    // 2. Delete existing card links
    await tx.noteCardLink.deleteMany({
      where: { noteId }
    });

    // 3. Delete existing tags
    await tx.noteTag.deleteMany({
      where: { noteId }
    });

    // 4. Create new note links
    if (noteReferences.length > 0) {
      // Find target notes by title
      const targetNotes = await tx.card.findMany({
        where: {
          userId,
          type: { in: ['md-note', 'text-note'] },
          title: { in: noteReferences },
          deleted: false
        },
        select: { id: true, title: true }
      });

      const noteLinksToCreate = targetNotes.map(note => ({
        sourceNoteId: noteId,
        targetNoteId: note.id,
        linkText: note.title
      }));

      if (noteLinksToCreate.length > 0) {
        await tx.noteLink.createMany({
          data: noteLinksToCreate,
          skipDuplicates: true
        });
      }
    }

    // 5. Create new card links
    if (cardReferences.length > 0) {
      // Find cards by title or URL
      const targetCards = await tx.card.findMany({
        where: {
          userId,
          deleted: false,
          OR: [
            { title: { in: cardReferences } },
            { url: { in: cardReferences } }
          ]
        },
        select: { id: true }
      });

      const cardLinksToCreate = targetCards.map(card => ({
        noteId,
        cardId: card.id
      }));

      if (cardLinksToCreate.length > 0) {
        await tx.noteCardLink.createMany({
          data: cardLinksToCreate,
          skipDuplicates: true
        });
      }
    }

    // 6. Create new tags
    if (tags.length > 0) {
      const tagsToCreate = tags.map(tag => ({
        noteId,
        tag
      }));

      await tx.noteTag.createMany({
        data: tagsToCreate,
        skipDuplicates: true
      });
    }
  });

  return {
    noteLinksCreated: noteReferences.length,
    cardLinksCreated: cardReferences.length,
    tagsCreated: tags.length
  };
}

/**
 * Get all notes that link to a given note (backlinks)
 */
export async function getBacklinks(noteId: string) {
  const backlinks = await prisma.noteLink.findMany({
    where: { targetNoteId: noteId },
    include: {
      sourceNote: {
        select: {
          id: true,
          title: true,
          type: true,
          content: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  return backlinks;
}

/**
 * Get all cards linked to a note
 */
export async function getLinkedCards(noteId: string) {
  const links = await prisma.noteCardLink.findMany({
    where: { noteId },
    include: {
      card: {
        select: {
          id: true,
          title: true,
          url: true,
          image: true,
          domain: true,
          type: true,
          createdAt: true
        }
      }
    }
  });

  return links;
}

/**
 * Get all notes that reference a card
 */
export async function getNotesReferencingCard(cardId: string) {
  const links = await prisma.noteCardLink.findMany({
    where: { cardId },
    include: {
      note: {
        select: {
          id: true,
          title: true,
          type: true,
          content: true,
          createdAt: true,
          updatedAt: true
        }
      }
    }
  });

  return links;
}

/**
 * Get all tags for a note
 */
export async function getNoteTags(noteId: string) {
  const tags = await prisma.noteTag.findMany({
    where: { noteId },
    orderBy: { tag: 'asc' }
  });

  return tags.map(t => t.tag);
}

/**
 * Get all unique tags across all notes for a user
 */
export async function getAllTags(userId: string) {
  const tags = await prisma.noteTag.findMany({
    where: {
      note: {
        userId,
        deleted: false
      }
    },
    select: { tag: true },
    distinct: ['tag'],
    orderBy: { tag: 'asc' }
  });

  return tags.map(t => t.tag);
}

/**
 * Find notes by tag
 */
export async function findNotesByTag(userId: string, tag: string) {
  const noteTags = await prisma.noteTag.findMany({
    where: {
      tag,
      note: {
        userId,
        deleted: false
      }
    },
    include: {
      note: true
    }
  });

  return noteTags.map(nt => nt.note);
}
