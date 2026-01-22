"use client";

import { useQuery, useMutation } from "convex/react";
import { useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

/**
 * Hook for workspace operations with Convex
 * Returns native Convex documents
 */
export function useConvexWorkspace() {
  const { isAuthenticated } = useConvexAuth();

  // Only query when authenticated - skip otherwise to avoid Unauthenticated errors
  const workspaces = useQuery(
    api.workspaces.list,
    isAuthenticated ? {} : "skip"
  );

  // Get the default workspace
  const defaultWorkspace = useQuery(
    api.workspaces.getDefault,
    isAuthenticated ? {} : "skip"
  );

  // Mutations
  const createWorkspaceMutation = useMutation(api.workspaces.create);
  const updateWorkspaceMutation = useMutation(api.workspaces.update);
  const deleteWorkspaceMutation = useMutation(api.workspaces.remove);

  // Wrapper functions
  const updateWorkspace = async (id: Id<"workspaces">, updates: Partial<{ name: string; icon: string }>) => {
    return updateWorkspaceMutation({ id, ...updates });
  };

  const deleteWorkspace = async (id: Id<"workspaces">) => {
    return deleteWorkspaceMutation({ id });
  };

  return {
    // Data (raw Convex docs)
    workspaces: workspaces ?? [],
    defaultWorkspace: defaultWorkspace ?? null,
    isLoading: !isAuthenticated || workspaces === undefined,

    // Mutations
    createWorkspace: createWorkspaceMutation,
    updateWorkspace,
    deleteWorkspace,
  };
}

/**
 * Hook for a specific workspace by ID
 */
export function useConvexWorkspaceById(id: Id<"workspaces"> | undefined) {
  const workspace = useQuery(
    api.workspaces.get,
    id ? { id } : "skip"
  );

  const stats = useQuery(
    api.workspaces.getStats,
    id ? { id } : "skip"
  );

  return {
    workspace: workspace ?? null,
    stats,
    isLoading: workspace === undefined,
  };
}
