/**
 * Dropbox OAuth Configuration
 *
 * Handles OAuth 2.0 flow for Dropbox integration.
 * Requires environment variables:
 * - DROPBOX_CLIENT_ID
 * - DROPBOX_CLIENT_SECRET
 * - NEXT_PUBLIC_APP_URL
 */

const DROPBOX_AUTH_URL = "https://www.dropbox.com/oauth2/authorize";
const DROPBOX_TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";
const DROPBOX_ACCOUNT_URL = "https://api.dropboxapi.com/2/users/get_current_account";

export interface DropboxTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  accountId: string;
}

export interface DropboxUserInfo {
  accountId: string;
  email: string;
  name: string;
}

export function isDropboxOAuthConfigured(): boolean {
  return !!(process.env.DROPBOX_CLIENT_ID && process.env.DROPBOX_CLIENT_SECRET);
}

export function getCallbackUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/api/auth/dropbox/callback`;
}

export function getAuthorizationUrl(state?: string): string {
  if (!isDropboxOAuthConfigured()) {
    throw new Error("Dropbox OAuth not configured");
  }

  const params = new URLSearchParams({
    client_id: process.env.DROPBOX_CLIENT_ID!,
    redirect_uri: getCallbackUrl(),
    response_type: "code",
    token_access_type: "offline", // Required for refresh token
  });

  if (state) {
    params.set("state", state);
  }

  return `${DROPBOX_AUTH_URL}?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<DropboxTokens> {
  const response = await fetch(DROPBOX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      client_id: process.env.DROPBOX_CLIENT_ID!,
      client_secret: process.env.DROPBOX_CLIENT_SECRET!,
      redirect_uri: getCallbackUrl(),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Dropbox OAuth] Token exchange failed:", error);
    throw new Error("Failed to exchange code for tokens");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    // Dropbox access tokens expire in 4 hours (14400 seconds)
    expiresAt: Date.now() + (data.expires_in || 14400) * 1000,
    accountId: data.account_id,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<DropboxTokens> {
  const response = await fetch(DROPBOX_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.DROPBOX_CLIENT_ID!,
      client_secret: process.env.DROPBOX_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Dropbox OAuth] Token refresh failed:", error);
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    // Dropbox doesn't return a new refresh token, keep the old one
    refreshToken: refreshToken,
    expiresAt: Date.now() + (data.expires_in || 14400) * 1000,
    accountId: data.account_id || "",
  };
}

export async function getUserInfo(accessToken: string): Promise<DropboxUserInfo> {
  const response = await fetch(DROPBOX_ACCOUNT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "null", // Dropbox requires a body for POST
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Dropbox OAuth] Get user info failed:", error);
    throw new Error("Failed to get user info");
  }

  const data = await response.json();
  return {
    accountId: data.account_id,
    email: data.email,
    name: data.name?.display_name || data.name?.given_name || "Dropbox User",
  };
}

export async function revokeToken(accessToken: string): Promise<void> {
  try {
    await fetch("https://api.dropboxapi.com/2/auth/token/revoke", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error) {
    // Log but don't throw - token might already be invalid
    console.error("[Dropbox OAuth] Token revoke failed:", error);
  }
}
