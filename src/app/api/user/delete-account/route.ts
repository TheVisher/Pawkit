/**
 * Delete User Account API
 *
 * Permanently deletes the authenticated user's account including:
 * - All workspaces and their content (cards, collections, events, todos)
 * - The Supabase auth user account
 *
 * This action cannot be undone.
 */

import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
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
    console.log('[delete-account] Starting account deletion for user:', user.id);

    // 1. Delete all user's workspaces (cascades to all content via Prisma schema)
    const deletedWorkspaces = await prisma.workspace.deleteMany({
      where: { userId: user.id },
    });

    console.log('[delete-account] Deleted', deletedWorkspaces.count, 'workspaces');

    // 2. Delete the Supabase auth user using admin client
    const adminClient = createAdminClient();
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      console.error('[delete-account] Failed to delete auth user:', deleteUserError);
      return NextResponse.json(
        { error: 'Failed to delete user account. Please try again or contact support.' },
        { status: 500 }
      );
    }

    console.log('[delete-account] Successfully deleted user account:', user.id);

    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted',
    });
  } catch (error) {
    console.error('[delete-account] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
