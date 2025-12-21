/**
 * Admin endpoint to clean up duplicate workspaces
 * Keeps only the oldest workspace (the original) and deletes the rest
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';

export async function POST() {
  const supabase = await createClient();

  // Get the authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get all workspaces for this user, ordered by creation date
    const workspaces = await prisma.workspace.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        createdAt: true,
        isDefault: true,
        _count: {
          select: { cards: true }
        }
      }
    });

    if (workspaces.length <= 1) {
      return NextResponse.json({
        message: 'No duplicate workspaces to clean up',
        count: workspaces.length,
      });
    }

    // Find the workspace with the most cards (that's the real one)
    // If all have 0 cards, use the oldest
    const workspaceWithMostCards = workspaces.reduce((best, current) => {
      if (current._count.cards > best._count.cards) return current;
      return best;
    }, workspaces[0]);

    const workspaceToKeep = workspaceWithMostCards._count.cards > 0
      ? workspaceWithMostCards
      : workspaces[0]; // Fall back to oldest if all empty

    const workspacesToDelete = workspaces.filter(w => w.id !== workspaceToKeep.id);

    console.log('[cleanup-workspaces] Keeping workspace:', workspaceToKeep.id, workspaceToKeep.name, `(${workspaceToKeep._count.cards} cards)`);
    console.log('[cleanup-workspaces] Deleting', workspacesToDelete.length, 'duplicate workspaces');

    // Delete duplicate workspaces (cascade will handle cards, collections, etc.)
    const deleteIds = workspacesToDelete.map((w) => w.id);

    await prisma.workspace.deleteMany({
      where: { id: { in: deleteIds } }
    });

    // Make sure the kept workspace is marked as default
    await prisma.workspace.update({
      where: { id: workspaceToKeep.id },
      data: { isDefault: true }
    });

    return NextResponse.json({
      message: `Cleaned up ${workspacesToDelete.length} duplicate workspace(s)`,
      kept: {
        id: workspaceToKeep.id,
        name: workspaceToKeep.name,
        createdAt: workspaceToKeep.createdAt,
        cardCount: workspaceToKeep._count.cards,
      },
      deletedCount: workspacesToDelete.length,
    });
  } catch (error) {
    console.error('[cleanup-workspaces] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
