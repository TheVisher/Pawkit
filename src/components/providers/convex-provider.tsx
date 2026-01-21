import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { ReactNode, useMemo, createContext, useContext } from "react";

/**
 * Context to track Convex availability
 */
interface ConvexContextValue {
  isEnabled: boolean;
}

const ConvexEnabledContext = createContext<ConvexContextValue>({
  isEnabled: false,
});

export function useConvexEnabled() {
  return useContext(ConvexEnabledContext).isEnabled;
}

/**
 * Hook to get Convex auth state.
 * Returns isReady (authenticated) and isLoading state.
 */
export function useConvexAuthState() {
  const convexEnabled = useConvexEnabled();
  const { isLoading, isAuthenticated } = useConvexAuth();

  return {
    isEnabled: convexEnabled,
    isReady: isAuthenticated,
    isLoading,
  };
}

/**
 * Convex Provider with Auth
 *
 * Wraps the application with Convex client and auth provider.
 */
export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const url = import.meta.env.VITE_CONVEX_URL as string | undefined;

  // If no Convex URL, render children without Convex (local-only mode)
  if (!url) {
    console.warn(
      "VITE_CONVEX_URL not set. Running in local-only mode without Convex sync."
    );
    return (
      <ConvexEnabledContext.Provider value={{ isEnabled: false }}>
        {children}
      </ConvexEnabledContext.Provider>
    );
  }

  return <ConvexClientProviderInner url={url}>{children}</ConvexClientProviderInner>;
}

/**
 * Inner provider that only renders when Convex URL is available.
 */
function ConvexClientProviderInner({
  url,
  children
}: {
  url: string;
  children: ReactNode;
}) {
  const convex = useMemo(() => {
    return new ConvexReactClient(url);
  }, [url]);

  return (
    <ConvexAuthProvider client={convex}>
      <ConvexEnabledContext.Provider value={{ isEnabled: true }}>
        {children}
      </ConvexEnabledContext.Provider>
    </ConvexAuthProvider>
  );
}
