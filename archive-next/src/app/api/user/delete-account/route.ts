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
    // 1. Delete all user's workspaces (cascades to all content via Prisma schema)
    await prisma.workspace.deleteMany({
      where: { userId: user.id },
    });

    // 2. Delete the Supabase auth user using admin client
    const adminClient = createAdminClient();
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      return NextResponse.json(
        { error: 'Failed to delete user account. Please try again or contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account successfully deleted',
    });
  } catch (error) {
    // Log errors server-side only, don't expose details to client
    if (process.env.NODE_ENV === 'development') {
      console.error('[delete-account] Error:', error);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
