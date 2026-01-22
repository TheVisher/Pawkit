# Auth Stability Plan

## What Went Wrong (January 2026)

During the Convex migration, auth broke twice due to configuration issues:

1. **`isFileCard` missing from mutation validator** - Field being passed wasn't accepted by Convex
2. **`auth.config.ts` misconfigured** - Had `providers: []` but Convex needs a self-referential entry to verify its own JWT tokens

### The Fix
```ts
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
```

## Why Auth Issues Are Hard to Catch

- Silent failures - app loads but auth doesn't work
- No obvious error messages until you enable verbose logging
- Configuration issues don't throw at build time

## Future-Proofing Checklist

### 1. E2E Auth Test (Playwright)

```ts
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can log in', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name=email]', process.env.TEST_USER_EMAIL);
  await page.fill('[name=password]', process.env.TEST_USER_PASSWORD);
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
  await expect(page.locator('[data-testid=user-menu]')).toBeVisible();
});

test('user can log out', async ({ page }) => {
  // Login first, then test logout
  await page.goto('/login');
  await page.fill('[name=email]', process.env.TEST_USER_EMAIL);
  await page.fill('[name=password]', process.env.TEST_USER_PASSWORD);
  await page.click('button[type=submit]');
  await expect(page).toHaveURL('/dashboard', { timeout: 10000 });

  // Logout
  await page.click('[data-testid=user-menu]');
  await page.click('[data-testid=logout-button]');
  await expect(page).toHaveURL('/login');
});

test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
});
```

### 2. Auth Health Check Endpoint

```ts
// convex/health.ts
import { query } from "./_generated/server";

export const authHealth = query({
  handler: async (ctx) => {
    try {
      const identity = await ctx.auth.getUserIdentity();
      return {
        status: "ok",
        authConfigured: true,
        authenticated: !!identity,
        userId: identity?.subject || null,
      };
    } catch (error) {
      return {
        status: "error",
        authConfigured: false,
        error: String(error),
      };
    }
  },
});
```

### 3. Pre-Deploy Checklist

Before any production deployment:

- [ ] `convex/auth.config.ts` has CONVEX_SITE_URL provider entry
- [ ] All Convex env vars set:
  - [ ] `AUTH_SECRET`
  - [ ] `JWT_PRIVATE_KEY`
  - [ ] `JWKS`
  - [ ] `SITE_URL`
- [ ] Login flow tested manually in staging
- [ ] Logout flow tested manually in staging
- [ ] E2E auth tests pass
- [ ] Check Convex dashboard for auth errors

### 4. CI/CD Integration

```yaml
# .github/workflows/deploy.yml
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: pnpm install
      - run: pnpm exec playwright install
      - run: pnpm test:e2e
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

  deploy:
    needs: e2e-tests  # Don't deploy if auth tests fail
    runs-on: ubuntu-latest
    steps:
      - run: npx convex deploy
```

### 5. Debugging Auth Issues

If auth breaks again:

1. **Enable verbose logging**:
   ```ts
   // convex-provider.tsx
   new ConvexReactClient(url, { verbose: true })
   ```

2. **Enable server-side debug**:
   ```bash
   npx convex env set AUTH_LOG_LEVEL DEBUG
   ```

3. **Check browser console for**:
   - `AuthError` messages
   - "No auth provider found" errors
   - Token storage/retrieval logs

4. **Check Convex logs for**:
   - `signIn` success/failure
   - Token generation logs
   - Session refresh logs

5. **Clear browser storage**:
   - Delete localStorage keys starting with `__convexAuth`
   - Test in incognito window

## Required Convex Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SITE_URL` | Your app URL | `https://app.pawkit.com` |
| `AUTH_SECRET` | Random 32+ char secret | Generated via `openssl rand -base64 32` |
| `JWT_PRIVATE_KEY` | PKCS8 private key | Generated via Convex docs script |
| `JWKS` | JSON Web Key Set | Generated alongside private key |

## References

- [Convex Auth Debugging](https://labs.convex.dev/auth/debugging)
- [Convex Auth Setup](https://labs.convex.dev/auth/setup/manual)
- [GitHub Issue #271 - isAuthenticated always false](https://github.com/get-convex/convex-auth/issues/271)
