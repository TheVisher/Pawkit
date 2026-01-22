/**
 * Auth Configuration
 *
 * Configures JWT token verification for Convex Auth.
 * The domain/applicationID entry is required for Convex to verify
 * tokens it issues (even for password-only auth).
 *
 * @see https://labs.convex.dev/auth/setup/manual
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
