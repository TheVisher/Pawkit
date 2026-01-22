# Claude Code Instructions for Pawkit

## Critical Files - DO NOT MODIFY

The following files are critical to application functionality and should **NEVER** be modified without explicit user approval:

### Authentication Configuration
- `convex/auth.ts` - Auth provider setup
- `convex/auth.config.ts` - JWT token verification config

**Why**: Incorrect auth configuration causes silent failures where the app loads but users cannot log in. The `auth.config.ts` MUST contain:
```ts
providers: [
  {
    domain: process.env.CONVEX_SITE_URL,
    applicationID: "convex",
  },
],
```
Removing or emptying this breaks authentication completely.

### Database Schema
- `convex/schema.ts` - Database schema definition

**Why**: Schema changes can cause data loss or break existing functionality.

### Environment Configuration
- `.env.local` - Local environment variables
- Convex environment variables (AUTH_SECRET, JWT_PRIVATE_KEY, JWKS, SITE_URL)

**Why**: Incorrect env vars break auth and other critical features.

## Before Making Changes

1. **Auth-related changes**: Always test login/logout flow after ANY change to convex/ files
2. **Schema changes**: Require explicit user approval
3. **Large migrations**: Review all changed files, especially config files

## Debugging Auth Issues

If auth breaks:
1. Enable verbose logging: `new ConvexReactClient(url, { verbose: true })`
2. Enable server debug: `npx convex env set AUTH_LOG_LEVEL DEBUG`
3. Check browser console for "AuthError" or "No auth provider found"
4. Verify `convex/auth.config.ts` has the CONVEX_SITE_URL provider entry

## Project Structure

- `/convex` - Convex backend (mutations, queries, schema)
- `/src/app` - Next.js app router pages
- `/src/components` - React components
- `/src/lib` - Utilities, hooks, stores
- `/docs` - Documentation

## Testing Requirements

Before committing changes that touch auth or database:
- [ ] Login flow works
- [ ] Logout flow works
- [ ] Existing data still loads
- [ ] No console errors related to auth
