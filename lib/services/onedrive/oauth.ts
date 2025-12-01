/**
 * OneDrive OAuth Utilities
 *
 * Handles OAuth 2.0 flow with Microsoft Identity Platform for OneDrive access.
 * Uses Microsoft Graph API for file operations.
 */

// Microsoft OAuth endpoints
const MICROSOFT_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize";
const MICROSOFT_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token";
const GRAPH_API_URL = "https://graph.microsoft.com/v1.0";

// Required scopes for OneDrive access
const SCOPES = [
  "Files.ReadWrite",      // Read and write files
  "User.Read",            // Get user profile/email
  "offline_access",       // Get refresh token
].join(" ");

/**
 * Check if OneDrive OAuth is configured
 */
export function isOneDriveOAuthConfigured(): boolean {
  return !!(
    process.env.MICROSOFT_CLIENT_ID &&
    process.env.MICROSOFT_CLIENT_SECRET
  );
}

/**
 * Get the OAuth authorization URL
 */
export function getAuthorizationUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID!,
    response_type: "code",
    redirect_uri: redirectUri,
    scope: SCOPES,
    state: state,
    response_mode: "query",
  });

  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      code: code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Failed to exchange code for tokens");
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh an expired access token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const response = await fetch(MICROSOFT_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.MICROSOFT_CLIENT_ID!,
      client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Failed to refresh token");
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken, // Microsoft may not return new refresh token
    expiresIn: data.expires_in,
  };
}

/**
 * Get user info from Microsoft Graph
 */
export async function getUserInfo(accessToken: string): Promise<{
  email: string;
  name: string;
}> {
  const response = await fetch(`${GRAPH_API_URL}/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get user info");
  }

  const data = await response.json();

  return {
    email: data.mail || data.userPrincipalName,
    name: data.displayName,
  };
}

/**
 * Revoke token (Microsoft doesn't have a direct revoke endpoint, just clear locally)
 */
export async function revokeToken(_accessToken: string): Promise<void> {
  // Microsoft Graph API doesn't have a token revocation endpoint
  // Tokens are invalidated by clearing them from storage
  // The token will naturally expire
  return;
}
