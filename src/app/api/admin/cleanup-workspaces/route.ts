/**
 * Admin endpoint to clean up duplicate workspaces
 * Keeps only the oldest workspace (the original) and deletes the rest
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  // Get all workspaces for this user, ordered by creation date
  const { data: workspaces, error: fetchError } = await supabase
    .from('workspaces')
    .select('id, name, created_at, is_default')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true });

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!workspaces || workspaces.length <= 1) {
    return NextResponse.json({
      message: 'No duplicate workspaces to clean up',
      count: workspaces?.length || 0,
    });
  }

  // Keep the first (oldest) workspace, delete the rest
  const workspaceToKeep = workspaces[0];
  const workspacesToDelete = workspaces.slice(1);

  console.log('[cleanup-workspaces] Keeping workspace:', workspaceToKeep.id, workspaceToKeep.name);
  console.log('[cleanup-workspaces] Deleting', workspacesToDelete.length, 'duplicate workspaces');

  // Delete duplicate workspaces (this will cascade to cards, collections, etc.)
  const deleteIds = workspacesToDelete.map((w) => w.id);
  const { error: deleteError } = await supabase
    .from('workspaces')
    .delete()
    .in('id', deleteIds);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Make sure the kept workspace is marked as default
  await supabase
    .from('workspaces')
    .update({ is_default: true })
    .eq('id', workspaceToKeep.id);

  return NextResponse.json({
    message: `Cleaned up ${workspacesToDelete.length} duplicate workspace(s)`,
    kept: {
      id: workspaceToKeep.id,
      name: workspaceToKeep.name,
      createdAt: workspaceToKeep.created_at,
    },
    deleted: workspacesToDelete.map((w) => ({
      id: w.id,
      name: w.name,
      createdAt: w.created_at,
    })),
  });
}
