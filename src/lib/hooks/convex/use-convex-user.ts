'use client';

import { useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';

export function useConvexUser() {
  const user = useQuery(api.users.me);
  return {
    user: user ?? null,
    isLoading: user === undefined,
    isAuthenticated: user !== null && user !== undefined,
  };
}
