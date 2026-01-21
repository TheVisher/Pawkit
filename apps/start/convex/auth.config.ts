/**
 * Auth Configuration
 *
 * This file configures external OAuth providers (GitHub, Google, etc.)
 * For Password-only auth (our current setup), no providers are needed here.
 * The Password provider is configured in auth.ts.
 * This placeholder provider config is only for testing/dev and can be expanded
 * later if we add OAuth providers.
 *
 * @see https://labs.convex.dev/auth/config/passwords
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
