/**
 * Auth Store
 * Manages user authentication state from Supabase
 */

import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Minimal user info for cases where we only have id/email from server props
 * (e.g., DashboardShell receives these from the layout server component)
 */
export interface BasicUserInfo {
  id: string;
  email: string;
}

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setBasicUserInfo: (info: BasicUserInfo) => void;
  setSession: (session: Session | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearUser: () => void;
  initialize: (user: User | null, session: Session | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  // Actions
  setUser: (user) => set({ user }),

  // Set minimal user info when full User object isn't available
  // Creates a partial User-like object that satisfies common usage patterns
  setBasicUserInfo: ({ id, email }) =>
    set({
      user: {
        id,
        email,
        // Required Supabase User fields with sensible defaults
        app_metadata: {},
        user_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
      } as User,
    }),

  setSession: (session) => set({ session }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearUser: () =>
    set({
      user: null,
      session: null,
      error: null,
    }),

  initialize: (user, session) =>
    set({
      user,
      session,
      isLoading: false,
      isInitialized: true,
      error: null,
    }),
}));

// =============================================================================
// SELECTORS
// =============================================================================

export const selectUser = (state: AuthState) => state.user;
export const selectSession = (state: AuthState) => state.session;
export const selectIsAuthenticated = (state: AuthState) => !!state.user;
export const selectIsLoading = (state: AuthState) => state.isLoading;
export const selectUserId = (state: AuthState) => state.user?.id ?? null;

// =============================================================================
// HOOKS
// =============================================================================

export function useUser() {
  return useAuthStore(selectUser);
}

export function useSession() {
  return useAuthStore(selectSession);
}

export function useIsAuthenticated() {
  return useAuthStore(selectIsAuthenticated);
}

export function useUserId() {
  return useAuthStore(selectUserId);
}

export function useAuthLoading() {
  return useAuthStore(selectIsLoading);
}
