# Pawkit V2 - Priority Tasks

**Created:** December 25, 2025  
**Last Updated:** December 25, 2025  
**Status:** Pre-Launch Preparation

---

## 🎯 Overview

This file tracks all critical fixes and improvements needed before and after public launch.

### Progress Summary
- **Critical Security:** 5/5 complete 🟢
- **High Priority:** 3/3 complete 🟢
- **Refactoring:** 1/4 complete 🟡
- **Documentation:** 3/3 complete 🟢

---

## 🔴 CRITICAL - Fix Before Public Launch

### #SEC-1: Fix Open Redirect Vulnerability [5 min]
**Status:** ✅ Complete (Dec 25, 2025)  
**Priority:** CRITICAL  
**File:** `src/app/(auth)/callback/route.ts`  
**Risk:** Attackers can redirect users to phishing sites after OAuth login

#### What's Wrong:
```typescript
// CURRENT CODE (lines ~10-20):
const next = searchParams.get('next') || '/library';
return NextResponse.redirect(new URL(next, request.url));
// ❌ Problem: Accepts ANY URL, including https://evil.com
```

#### The Fix:
```typescript
// REPLACE WITH:
const ALLOWED_PATHS = ['/library', '/home', '/calendar', '/notes', '/favorites'];
const requestedPath = searchParams.get('next') || '/library';

// Validate path is in our whitelist
const safePath = ALLOWED_PATHS.includes(requestedPath) 
  ? requestedPath 
  : '/library';

return NextResponse.redirect(new URL(safePath, request.url));
```

#### Testing:
```bash
# Test 1: Malicious URL should redirect to /library
curl "http://localhost:3000/callback?next=https://evil.com"

# Test 2: Valid path should work
curl "http://localhost:3000/callback?next=/calendar"

# Test 3: Invalid path should default to /library  
curl "http://localhost:3000/callback?next=/admin/secret"
```

---

### #SEC-2: Add Admin Authentication Check [10 min]
**Status:** ✅ Complete (Dec 25, 2025) - Moved to `/api/user/` since it only affects user's own data
**Priority:** CRITICAL
**File:** `src/app/api/user/cleanup-workspaces/route.ts`
**Risk:** Any logged-in user can trigger admin cleanup operations

#### What's Wrong:
```typescript
// CURRENT CODE (lines ~10-21):
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // ❌ Problem: No check if user is actually an admin!
  // Any authenticated user can run this
```

#### The Fix:
```typescript
// REPLACE WITH:
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // ✅ ADD THIS: Check admin role
  const { data: profile } = await supabase
    .from('User')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (profile?.role !== 'admin') {
    return new Response('Forbidden', { status: 403 });
  }
  
  // Now proceed with cleanup...
```

#### Additional Setup Required:
```sql
-- Add role column to User table if not exists:
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role" TEXT DEFAULT 'user';

-- Make yourself admin:
UPDATE "User" SET role = 'admin' WHERE email = 'your-email@example.com';
```

---

### #SEC-3: SSRF Protection in Metadata API [15 min]
**Status:** ✅ Complete (Dec 25, 2025)  
**Priority:** CRITICAL  
**File:** `src/app/api/metadata/route.ts`  
**Risk:** Attackers can probe internal network/localhost via URL parameter

#### What's Wrong:
```typescript
// CURRENT CODE (lines ~41-100):
const url = searchParams.get('url');
const response = await fetch(url);
// ❌ Problem: Can fetch internal IPs like http://localhost:6379 (Redis)
```

#### The Fix:
```typescript
// ADD THIS FUNCTION at top of file:
function isPrivateIP(hostname: string): boolean {
  const BLOCKED_PATTERNS = [
    '127.', '0.0.0.0', 'localhost',
    '10.', '172.16.', '172.17.', '172.18.', '172.19.',
    '172.20.', '172.21.', '172.22.', '172.23.', '172.24.',
    '172.25.', '172.26.', '172.27.', '172.28.', '172.29.',
    '172.30.', '172.31.',
    '192.168.',
    '169.254.', // AWS metadata service
    '[::1]', 'fe80::', 'fc00::', 'fd00::' // IPv6 local
  ];
  
  return BLOCKED_PATTERNS.some(pattern => 
    hostname.toLowerCase().startsWith(pattern)
  );
}

// THEN UPDATE fetch logic:
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const urlString = searchParams.get('url');
  
  if (!urlString) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }
  
  // ✅ ADD VALIDATION:
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  
  // Check for private IPs
  if (isPrivateIP(parsedUrl.hostname)) {
    return NextResponse.json(
      { error: 'Cannot fetch private/internal URLs' }, 
      { status: 400 }
    );
  }
  
  // Also block non-HTTP protocols
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json(
      { error: 'Only HTTP(S) URLs allowed' },
      { status: 400 }
    );
  }
  
  // Now safe to fetch
  const response = await fetch(parsedUrl.toString());
  // ... rest of logic
}
```

#### Testing:
```bash
# Should BLOCK these:
curl "http://localhost:3000/api/metadata?url=http://localhost:6379"
curl "http://localhost:3000/api/metadata?url=http://169.254.169.254/latest/meta-data"
curl "http://localhost:3000/api/metadata?url=http://192.168.1.1"

# Should ALLOW these:
curl "http://localhost:3000/api/metadata?url=https://github.com"
curl "http://localhost:3000/api/metadata?url=https://example.com"
```

---

### #SEC-4: Implement Rate Limiting [30 min]
**Status:** ✅ Complete (Dec 25, 2025) - Using in-memory rate limiter (no external deps)  
**Priority:** CRITICAL  
**Risk:** Bots can spam API, causing high costs and service degradation

#### Setup Required:
```bash
# Install dependencies
pnpm add @upstash/ratelimit @upstash/redis

# Sign up for free Upstash account: https://upstash.com
# Create Redis database
# Copy UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
```

#### Implementation:

**Step 1: Create rate limiter utility**

Create file: `src/lib/rate-limit.ts`
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Create Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different rate limits for different endpoints
export const rateLimiters = {
  // API routes: 10 requests per 10 seconds
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '10 s'),
    analytics: true,
  }),
  
  // Metadata fetching: 5 requests per minute (expensive operation)
  metadata: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
  }),
  
  // Auth endpoints: 3 requests per minute (prevent brute force)
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '1 m'),
    analytics: true,
  }),
};

export async function checkRateLimit(
  identifier: string, 
  limiter: Ratelimit
): Promise<{ success: boolean; remaining?: number }> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  
  if (!success) {
    return { success: false };
  }
  
  return { success: true, remaining };
}
```

**Step 2: Add to API routes**

Example for `src/app/api/metadata/route.ts`:
```typescript
import { checkRateLimit, rateLimiters } from '@/lib/rate-limit';

export async function GET(request: Request) {
  // Get user ID or IP for rate limiting
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const identifier = user?.id || request.headers.get('x-forwarded-for') || 'anonymous';
  
  // ✅ ADD RATE LIMIT CHECK:
  const { success, remaining } = await checkRateLimit(identifier, rateLimiters.metadata);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { 
        status: 429,
        headers: { 'X-RateLimit-Remaining': '0' }
      }
    );
  }
  
  // Continue with normal logic...
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  // ...
}
```

**Step 3: Add environment variables**

Add to `.env.local`:
```env
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

#### Testing:
```bash
# Rapid fire requests - should get 429 after 5 requests
for i in {1..10}; do
  curl "http://localhost:3000/api/metadata?url=https://example.com"
done
```

---

### #SEC-5: Strengthen Password Requirements [5 min]
**Status:** ✅ Complete (Dec 25, 2025) - Added client-side validator (12+ chars, upper, lower, number)  
**Priority:** CRITICAL  
**Current:** Minimum 8 characters (weak)  
**Required:** 12+ chars, uppercase, lowercase, number

#### The Fix:

**Option A: Supabase Dashboard Settings**
1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/auth/providers
2. Scroll to "Password Settings"
3. Set:
   - Minimum length: 12
   - Require uppercase: Yes
   - Require lowercase: Yes
   - Require numbers: Yes
   - Require special characters: Optional

**Option B: Client-side validation** (backup)

Create `src/lib/password-validator.ts`:
```typescript
export function validatePassword(password: string): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

Use in signup form:
```typescript
const { valid, errors } = validatePassword(password);
if (!valid) {
  setError(errors.join(', '));
  return;
}
```

---

## 🟠 HIGH PRIORITY - Fix This Week

### #SEC-6: Add Content Security Policy [20 min]
**Status:** ✅ Complete (Dec 25, 2025)  
**Priority:** HIGH  
**File:** `next.config.ts`  
**Protects:** XSS attacks, inline script injection

#### The Fix:

Add to `next.config.ts`:
```typescript
const nextConfig = {
  // ... existing config
  
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // unsafe-inline needed for Next.js
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com",
              "media-src 'self' blob:",
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'"
            ].join('; ')
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()'
          }
        ]
      }
    ];
  }
};
```

---

### #DOC-1: Rewrite README.md [30 min]
**Status:** ✅ Complete (Dec 25, 2025)  
**Priority:** HIGH  
**Current:** Next.js template boilerplate  
**Needed:** Actual Pawkit description

#### Template to Use:

```markdown
# Pawkit

> Your local-first bookmark and knowledge management system

## What is Pawkit?

Pawkit is a privacy-focused bookmark manager that keeps your data on YOUR device, with optional encrypted cloud sync. Think Notion meets Pinterest meets Obsidian.

### Key Features
- 🔐 Local-first - Your data stays on your device
- 📱 Cross-platform - Web, Chrome/Firefox extensions, iOS app
- 🔄 Smart sync - Bidirectional sync with conflict resolution
- 📝 Rich notes - Markdown editor with wiki-links and backlinks
- 🎨 Beautiful - Glass morphism design with purple glow
- 🔍 Smart search - Full-text search across all content

## Quick Start

[Add installation instructions]

## Tech Stack
- Next.js 16, React 19, TypeScript
- Supabase (PostgreSQL + Auth)
- IndexedDB (local storage)
- Tailwind CSS + shadcn/ui

## Documentation
See `docs/PLAYBOOK.md` for architecture details.

## License
MIT
```

---

### #DOC-2: Create .env.example [15 min]
**Status:** ✅ Complete (Dec 25, 2025)  
**Priority:** HIGH  
**Needed:** Template for environment variables

#### Create `.env.example`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase Service Role (server-side only)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database (from Supabase)
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres

# OAuth Providers (optional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Anthropic API (for Kit AI assistant)
ANTHROPIC_API_KEY=

# Rate Limiting (optional, from Upstash)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Add to README:
```markdown
## Setup

1. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials from https://supabase.com/dashboard

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Run migrations:
   ```bash
   pnpm prisma:migrate
   ```

5. Start dev server:
   ```bash
   pnpm dev
   ```
```

---

### #DOC-3: Update Playbook Status Markers [10 min]
**Status:** ✅ Complete (Dec 25, 2025)  
**Priority:** MEDIUM  
**File:** `docs/PLAYBOOK.md`  
**Issue:** Old "🆕" markers on completed features

#### Find and Replace:

Search for: `🆕` (U+1F195)  
Replace with appropriate status:
- `✅ Stable` - Feature is done and tested
- `🟡 Beta` - Feature works but needs polish
- `🔵 Planned` - Not yet implemented

---

## 🟡 REFACTORING - After Launch

### #TECH-1: Split omnibar.tsx [4 hours]
**Status:** ✅ Complete (Dec 25, 2025) - Split into 5 files  
**Priority:** MEDIUM  
**Current:** 1,496 lines (5x over limit)  
**Target:** 4 files, ~375 lines each

#### Proposed Structure:

```
src/components/layout/omnibar/
├── index.tsx (main component, 200 lines)
├── search-bar.tsx (search input & logic, 300 lines)
├── command-palette.tsx (⌘K interface, 400 lines)
├── toast-container.tsx (notifications, 200 lines)
└── omnibar-actions.tsx (URL parsing, 400 lines)
```

#### Benefits:
- Easier to test individual pieces
- Faster dev server refresh
- Easier for contractors to understand
- Can lazy-load command palette

---

### #TECH-2: Split card-list-view.tsx [4 hours]
**Status:** ❌ Not Started  
**Priority:** MEDIUM  
**Current:** 1,515 lines (5x over limit)  
**Target:** 5 files, ~300 lines each

#### Proposed Structure:

```
src/components/cards/list-view/
├── index.tsx (main component, 250 lines)
├── list-row.tsx (individual row, 300 lines)
├── column-header.tsx (sortable headers, 250 lines)
├── list-controls.tsx (filters, view options, 300 lines)
└── list-actions.tsx (bulk operations, 250 lines)
```

---

### #TECH-3: Split card-item.tsx [2 hours]
**Status:** ❌ Not Started  
**Priority:** MEDIUM  
**Current:** 623 lines (2x over limit)  
**Target:** 3 files, ~200 lines each

#### Proposed Structure:

```
src/components/cards/card-item/
├── index.tsx (main component, 150 lines)
├── card-content.tsx (title, description, tags, 250 lines)
├── card-thumbnail.tsx (image display, 150 lines)
└── card-actions.tsx (hover menu, 150 lines)
```

---

### #TECH-4: Refactor sync-service.ts [3 hours]
**Status:** ❌ Not Started  
**Priority:** MEDIUM  
**Current:** 615 lines (2x over limit)  
**Target:** 3 files, ~200 lines each

#### Proposed Structure:

```
src/lib/services/sync/
├── sync-service.ts (orchestrator, 200 lines)
├── sync-cards.ts (card sync logic, 200 lines)
├── sync-collections.ts (collection sync, 200 lines)
└── conflict-resolver.ts (merge logic, 150 lines)
```

---

## 🔵 TESTING - After Refactoring

### #TEST-1: Add Sync Service Tests
**Status:** ❌ Not Started  
**Priority:** LOW  
**Coverage:** 0% currently

#### Setup:
```bash
pnpm add -D vitest @testing-library/react @testing-library/jest-dom
```

#### Tests Needed:
- Conflict resolution (last-write-wins)
- Queue retry logic
- Cross-tab sync via BroadcastChannel
- Failed sync parking

---

### #TEST-2: Add Error Boundary
**Status:** ❌ Not Started  
**Priority:** LOW

Create `src/components/error-boundary.tsx`:
```typescript
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Error caught by boundary:', error, errorInfo);
    // TODO: Send to error tracking (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-4">
              {this.state.error?.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## 📊 Progress Tracking

### Sprint 1: Security Fixes (Week of Dec 25)
- [x] #SEC-1 Fix open redirect
- [x] #SEC-2 Add admin auth
- [x] #SEC-3 SSRF protection
- [x] #SEC-4 Rate limiting
- [x] #SEC-5 Password policy
- [x] #SEC-6 CSP headers

**Estimated Time:** 3-4 hours total

---

### Sprint 2: Documentation (Week of Jan 1)
- [x] #DOC-1 Rewrite README
- [x] #DOC-2 Create .env.example
- [ ] #DOC-3 Update playbook markers

**Estimated Time:** 1-2 hours total

---

### Sprint 3: Refactoring (Week of Jan 8)
- [ ] #TECH-1 Split omnibar
- [ ] #TECH-2 Split card-list-view
- [ ] #TECH-3 Split card-item
- [ ] #TECH-4 Refactor sync-service

**Estimated Time:** 13-15 hours total

---

### Sprint 4: Testing (Week of Jan 15)
- [ ] #TEST-1 Sync service tests
- [ ] #TEST-2 Error boundary

**Estimated Time:** 4-6 hours total

---

## 🎯 Definition of Done

### For Security Tasks:
- [ ] Code changes made
- [ ] Tested locally with malicious inputs
- [ ] Committed with `[SECURITY]` tag
- [ ] Status updated in this file

### For Refactoring Tasks:
- [ ] File split completed
- [ ] All imports updated
- [ ] No TypeScript errors
- [ ] App runs without crashes
- [ ] Status updated in this file

### For Documentation Tasks:
- [ ] Content written
- [ ] Links verified
- [ ] Grammar checked
- [ ] Status updated in this file

---

## 📝 How to Use This File

### For You (Erik):
1. Pick a task
2. Copy the code snippets
3. Test it works
4. Mark `✅ Complete` with date
5. Commit: `git commit -m "Fix #SEC-1: Add open redirect protection"`

### For Claude Code:
```bash
# Claude Code can:
1. Read this file: view /path/to/.claude/tasks/PRIORITY_TASKS.md
2. See next priority task
3. Apply the code changes
4. Update status to ✅ Complete
5. Commit with proper message
```

### For Future Contractors:
- Each task is self-contained with context
- Code snippets show exact changes needed
- Testing instructions included
- Time estimates help with planning

---

## 🚨 Emergency Contacts

If you get stuck on security fixes:
- OWASP Cheat Sheets: https://cheatsheetseries.owasp.org/
- Supabase Discord: https://discord.supabase.com
- Next.js Security: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy

---

**Last Updated:** December 25, 2025 by Claude  
**Next Review:** After completing Sprint 1 (Security Fixes)
