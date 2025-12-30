/**
 * Delete User Data API
 *
 * Permanently deletes all of the authenticated user's data including:
 * - All workspaces and their content (cards, collections, events, todos)
 *
 * Does NOT delete the user account itself.
 * This action cannot be undone.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/db/prisma';

export async function DELETE() {
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
    console.log('[delete-data] Starting data deletion for user:', user.id);

    // Delete all user's workspaces (cascades to all content via Prisma schema)
    const deletedWorkspaces = await prisma.workspace.deleteMany({
      where: { userId: user.id },
    });

    console.log('[delete-data] Deleted', deletedWorkspaces.count, 'workspaces and all associated data');

    return NextResponse.json({
      success: true,
      message: 'All data successfully deleted',
      deletedWorkspaces: deletedWorkspaces.count,
    });
  } catch (error) {
    console.error('[delete-data] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
