"use client";

import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

/**
 * Hook for workspace operations with Convex
 * Returns native Convex documents
 */
export function useConvexWorkspace() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();

  // Get all workspaces for the current user
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
  const ensureDefaultWorkspaceMutation = useMutation(api.users.ensureDefaultWorkspace);

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
    isLoading: authLoading || (isAuthenticated && workspaces === undefined),
    isAuthenticated,

    // Mutations
    createWorkspace: createWorkspaceMutation,
    ensureDefaultWorkspace: ensureDefaultWorkspaceMutation,
    updateWorkspace,
    deleteWorkspace,
  };
}

/**
 * Hook for a specific workspace by ID
 */
export function useConvexWorkspaceById(id: Id<"workspaces"> | undefined) {
  const { isAuthenticated } = useConvexAuth();

  const workspace = useQuery(
    api.workspaces.get,
    id && isAuthenticated ? { id } : "skip"
  );

  const stats = useQuery(
    api.workspaces.getStats,
    id && isAuthenticated ? { id } : "skip"
  );

  return {
    workspace: workspace ?? null,
    stats,
    isLoading: workspace === undefined,
  };
}
