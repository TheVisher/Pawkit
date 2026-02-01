import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTPPasswordReset } from "./passwordReset";

/**
 * Convex Auth Configuration
 *
 * Session Policy:
 * - Sessions expire after 30 days of inactivity
 * - Sessions are automatically refreshed on activity
 * - All sessions are invalidated on:
 *   - Password change (handled by @convex-dev/auth Password provider)
 *   - Account deletion (handled in users.ts deleteAccount)
 *
 * The Password provider with reset flow automatically invalidates
 * existing sessions when a password is successfully changed.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password({ reset: ResendOTPPasswordReset })],
  session: {
    // Sessions expire after 30 days of inactivity
    totalDurationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
    // Sessions are refreshed if used within this window
    inactiveDurationMs: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
});
