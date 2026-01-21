# Contributing to Pawkit

Thank you for your interest in contributing to Pawkit! This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Component Guidelines](#component-guidelines)
- [Testing Requirements](#testing-requirements)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Architecture Decisions](#architecture-decisions)
- [Security Guidelines](#security-guidelines)
- [Documentation](#documentation)
- [Questions and Support](#questions-and-support)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of:
- Experience level
- Gender identity and expression
- Sexual orientation
- Disability
- Personal appearance
- Body size
- Race
- Ethnicity
- Age
- Religion
- Nationality

### Expected Behavior

- ✅ Be respectful and considerate
- ✅ Use welcoming and inclusive language
- ✅ Provide constructive feedback
- ✅ Accept constructive criticism gracefully
- ✅ Focus on what's best for the community
- ✅ Show empathy towards other contributors

### Unacceptable Behavior

- ❌ Harassment or discriminatory comments
- ❌ Trolling or insulting remarks
- ❌ Personal or political attacks
- ❌ Publishing others' private information
- ❌ Unwelcome sexual attention or advances
- ❌ Any conduct inappropriate in a professional setting

### Enforcement

Violations can be reported to **conduct@pawkit.app**. All complaints will be reviewed and investigated, and will result in a response deemed necessary and appropriate to the circumstances.

---

## Getting Started

### Prerequisites

Before you begin, ensure you have:
- Node.js 20+ (LTS recommended)
- pnpm 8+ (install with `npm install -g pnpm`)
- Git
- A code editor (VS Code recommended)
- Basic knowledge of:
  - TypeScript
  - React 19
  - Next.js 16
  - Tailwind CSS

### Initial Setup

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/Pawkit.git
   cd Pawkit
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/TheVisher/Pawkit.git
   ```

3. **Install dependencies**
   ```bash
   pnpm install
   ```

4. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

5. **Run database migrations**
   ```bash
   pnpm prisma:migrate
   pnpm prisma:generate
   ```

6. **Start development server**
   ```bash
   pnpm dev
   ```

7. **Verify everything works**
   - Open http://localhost:3000
   - Create an account
   - Add a test bookmark

---

## Development Workflow

### Branching Strategy

We use a simplified Git Flow:

```
main (production)
  ↓
feature/your-feature-name (your work)
```

**Branch naming convention:**
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation updates
- `refactor/component-name` - Code refactoring
- `test/what-tested` - Test additions

**Examples:**
- ✅ `feature/google-calendar-sync`
- ✅ `fix/card-drag-drop-crash`
- ✅ `docs/update-setup-guide`
- ❌ `my-changes` (too vague)
- ❌ `feature` (missing description)

### Development Steps

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

3. **Test locally**
   ```bash
   pnpm lint          # Check code style
   pnpm type-check    # Check TypeScript
   pnpm test          # Run test suite
   pnpm build         # Ensure it builds
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: Add Google Calendar sync"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Go to GitHub
   - Click "New Pull Request"
   - Fill out the PR template

---

## Coding Standards

### TypeScript

**Always use TypeScript** - No JavaScript files in `src/`.

```typescript
// ✅ GOOD: Explicit types
interface CardProps {
  id: string;
  title: string;
  url?: string;
}

function Card({ id, title, url }: CardProps) {
  // ...
}

// ❌ BAD: No types
function Card(props) {
  // ...
}
```

**Avoid `any`** - Use proper types or `unknown`.

```typescript
// ❌ BAD
function processData(data: any) {
  return data.value;
}

// ✅ GOOD
interface Data {
  value: string;
}

function processData(data: Data) {
  return data.value;
}
```

### React Patterns

**Use functional components** - No class components.

```typescript
// ✅ GOOD: Functional component with hooks
export function BookmarkCard({ bookmark }: Props) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div onMouseEnter={() => setIsHovered(true)}>
      {bookmark.title}
    </div>
  );
}

// ❌ BAD: Class component
export class BookmarkCard extends React.Component {
  // ...
}
```

**Use proper hook dependencies** - Always include all dependencies.

```typescript
// ❌ BAD: Missing dependency
useEffect(() => {
  fetchData(userId);
}, []);

// ✅ GOOD: All dependencies listed
useEffect(() => {
  fetchData(userId);
}, [userId]);
```

**Memoize expensive computations**

```typescript
// ✅ GOOD: Memoized expensive filtering
const filteredCards = useMemo(() => {
  return cards.filter(card => 
    card.title.toLowerCase().includes(search.toLowerCase())
  );
}, [cards, search]);
```

### Styling

**Use CSS variables** - Never hardcode colors.

```typescript
// ❌ BAD: Hardcoded colors
<div className="bg-gray-900 text-white" />

// ✅ GOOD: CSS variables
<div style={{ background: 'var(--bg-surface-2)' }} />
```

**Use Tailwind utilities** - Prefer utilities over custom CSS.

```typescript
// ✅ GOOD: Tailwind utilities
<button className="px-4 py-2 rounded-lg hover:opacity-80" />

// ❌ BAD: Inline styles when utility exists
<button style={{ padding: '8px 16px' }} />
```

**Responsive design** - Always consider mobile.

```typescript
// ✅ GOOD: Responsive classes
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3" />
```

### File Organization

**Keep imports organized**

```typescript
// 1. React & Next.js
import { useState } from 'react';
import { useRouter } from 'next/navigation';

// 2. External libraries
import { format } from 'date-fns';

// 3. Internal components
import { Button } from '@/components/ui/button';

// 4. Internal utilities
import { cn } from '@/lib/utils';

// 5. Types
import type { Card } from '@/types';

// 6. Styles (if any)
import styles from './component.module.css';
```

**Use absolute imports** - Prefer `@/` over relative paths.

```typescript
// ✅ GOOD
import { Card } from '@/components/cards/card';

// ❌ BAD (only use for sibling files)
import { Card } from '../../../components/cards/card';
```

---

## Component Guidelines

### File Size Limit: 300 Lines

**CRITICAL RULE:** No component file should exceed 300 lines.

If your component is approaching this limit:

1. **Extract sub-components**
   ```typescript
   // Before (400 lines)
   export function CardListView() {
     // 400 lines of everything
   }
   
   // After (split into 4 files)
   export function CardListView() {
     return (
       <>
         <ListHeader />
         <ListBody />
         <ListFooter />
       </>
     );
   }
   ```

2. **Extract hooks**
   ```typescript
   // Extract custom logic into hooks
   function useCardSelection() {
     const [selected, setSelected] = useState<Set<string>>(new Set());
     // ...
     return { selected, toggleSelection, clearSelection };
   }
   ```

3. **Extract utilities**
   ```typescript
   // Move complex logic to utility functions
   export function sortCardsByDate(cards: Card[]): Card[] {
     // ...
   }
   ```

### Component Structure

**Follow this order:**

```typescript
// 1. Imports
import { useState } from 'react';

// 2. Types/Interfaces
interface Props {
  id: string;
}

// 3. Constants
const MAX_TITLE_LENGTH = 100;

// 4. Helper functions (outside component)
function formatTitle(title: string): string {
  // ...
}

// 5. Component
export function MyComponent({ id }: Props) {
  // 5a. Hooks (useState, useEffect, custom hooks)
  const [data, setData] = useState<Data | null>(null);
  const { user } = useUser();
  
  // 5b. Event handlers
  const handleClick = () => {
    // ...
  };
  
  // 5c. Derived values
  const displayTitle = formatTitle(data?.title ?? '');
  
  // 5d. Effects
  useEffect(() => {
    // ...
  }, [id]);
  
  // 5e. Render
  return (
    <div>
      {displayTitle}
    </div>
  );
}
```

### Component Naming

**Use PascalCase** for components.

```typescript
// ✅ GOOD
export function BookmarkCard() { }
export function CardListView() { }

// ❌ BAD
export function bookmarkCard() { }
export function card_list_view() { }
```

**Use descriptive names**

```typescript
// ✅ GOOD
<CardThumbnail />
<CardActionMenu />
<CardTagList />

// ❌ BAD
<Thumb />
<Menu />
<Tags />
```

---

## Testing Requirements

### When to Write Tests

**Always write tests for:**
- ✅ New features
- ✅ Bug fixes (add regression test)
- ✅ Utility functions
- ✅ Critical business logic (sync, auth, etc.)

**Tests are optional for:**
- Simple UI components
- One-off scripts
- Documentation changes

### Test Structure

```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('SyncService', () => {
  beforeEach(() => {
    // Setup
  });
  
  it('should sync local changes to server', async () => {
    // Arrange
    const card = createTestCard();
    
    // Act
    const result = await syncService.sync(card);
    
    // Assert
    expect(result.success).toBe(true);
  });
  
  it('should handle conflicts with last-write-wins', async () => {
    // Test conflict resolution
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific test file
pnpm test src/lib/services/sync-service.test.ts
```

### Test Coverage Goals

- **Core logic:** 80%+ coverage
- **Utilities:** 90%+ coverage
- **UI components:** 50%+ coverage (optional)

---

## Commit Message Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: Add Google Calendar sync` |
| `fix` | Bug fix | `fix: Resolve drag-drop crash` |
| `docs` | Documentation | `docs: Update setup guide` |
| `style` | Code style (formatting) | `style: Format with Prettier` |
| `refactor` | Code refactoring | `refactor: Split omnibar into modules` |
| `perf` | Performance improvement | `perf: Optimize card rendering` |
| `test` | Add/update tests | `test: Add sync service tests` |
| `chore` | Maintenance | `chore: Update dependencies` |
| `ci` | CI/CD changes | `ci: Add GitHub Actions workflow` |

### Scope (Optional)

The part of the codebase affected:

- `api` - API routes
- `ui` - UI components
- `sync` - Sync logic
- `auth` - Authentication
- `db` - Database/Prisma
- `docs` - Documentation

### Examples

```bash
# Good commits
feat(sync): Add conflict resolution with last-write-wins
fix(api): Prevent SSRF in metadata endpoint
docs: Add security policy and contributing guide
refactor(ui): Split card-list-view into 5 modules
test(sync): Add 24 tests for queue and conflict logic

# Bad commits
update stuff
fix bug
changes
WIP
```

### Breaking Changes

If your change breaks backward compatibility:

```
feat(api)!: Change cards API response format

BREAKING CHANGE: Cards API now returns `items` array instead of `data` array.
Migration guide in docs/MIGRATION.md
```

---

## Pull Request Process

### Before Opening a PR

**Checklist:**
- [ ] Code follows style guide
- [ ] Tests added/updated and passing
- [ ] TypeScript types are correct (no `any`)
- [ ] Components under 300 lines
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] Branch is up to date with `main`
- [ ] Build succeeds locally (`pnpm build`)

### PR Template

When opening a PR, fill out this template:

```markdown
## Description
Brief description of what this PR does.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How to Test
1. Step 1
2. Step 2
3. Expected result

## Screenshots (if applicable)
Before: [screenshot]
After: [screenshot]

## Checklist
- [ ] Tests pass locally
- [ ] Code follows style guide
- [ ] Documentation updated
- [ ] No console errors/warnings
```

### PR Review Process

1. **Automated checks run** (linting, tests, build)
2. **Maintainer reviews** (within 2-3 business days)
3. **Feedback addressed** (make requested changes)
4. **Approved & merged** (squash merge to `main`)

### Review Criteria

Reviewers will check:
- ✅ Code quality and readability
- ✅ Test coverage
- ✅ Performance impact
- ✅ Security considerations
- ✅ Documentation completeness
- ✅ Breaking changes (if any)

---

## Architecture Decisions

### Local-First Principle

**Always prioritize local storage** - IndexedDB is the source of truth.

```typescript
// ✅ GOOD: Write to local first
async function saveCard(card: Card) {
  // 1. Save to IndexedDB (instant)
  await localDB.cards.put(card);
  
  // 2. Update UI immediately
  store.addCard(card);
  
  // 3. Sync to server (background)
  syncQueue.enqueue('create', card);
}

// ❌ BAD: Wait for server
async function saveCard(card: Card) {
  const result = await api.createCard(card);
  store.addCard(result);
}
```

### Data Flow Pattern

```
User Action → IndexedDB → UI Update → Sync Queue → Server
                ↓
          Source of Truth
```

**Never bypass IndexedDB** - All data mutations go through local storage first.

### Sync Patterns

**Always use the sync queue** - Don't call API directly.

```typescript
// ✅ GOOD: Use sync queue
syncQueue.enqueue('update', card);

// ❌ BAD: Direct API call
await fetch('/api/cards', { method: 'PATCH', body: JSON.stringify(card) });
```

**Handle conflicts properly** - Last-write-wins by `updatedAt`.

```typescript
if (serverCard.updatedAt > localCard.updatedAt) {
  // Server is newer, update local
  await localDB.cards.put(serverCard);
} else {
  // Local is newer, push to server
  syncQueue.enqueue('update', localCard);
}
```

---

## Security Guidelines

### Authentication

**Always validate sessions server-side**

```typescript
// ✅ GOOD: Server-side validation
export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Use user.id (from session, not request body)
  const cards = await db.card.findMany({
    where: { userId: user.id }
  });
}

// ❌ BAD: Trust client
export async function GET(request: Request) {
  const { userId } = await request.json();
  const cards = await db.card.findMany({
    where: { userId } // NEVER trust client-provided IDs
  });
}
```

### Input Validation

**Validate and sanitize all user input**

```typescript
// ✅ GOOD: Validate URL
function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ✅ GOOD: Sanitize HTML
import DOMPurify from 'isomorphic-dompurify';

const clean = DOMPurify.sanitize(userInput);
```

### NEVER Log Sensitive Data

```typescript
// ❌ BAD: Logs password
console.log('User login:', { email, password });

// ✅ GOOD: No sensitive data
console.log('User login:', { email });
```

### Report Security Issues Privately

**Do NOT open public issues for security vulnerabilities.**

Email **security@pawkit.app** instead.

---

## Documentation

### Code Comments

**Write comments for "why", not "what"**

```typescript
// ❌ BAD: Obvious
// Increment counter
count++;

// ✅ GOOD: Explains reasoning
// Reset count after sync to prevent duplicate requests
count = 0;
```

**Document complex logic**

```typescript
/**
 * Merges two sync operations when they affect the same entity.
 * 
 * Examples:
 * - update + update = merged update
 * - create + delete = cancelled (no-op)
 * - update + delete = delete (last operation wins)
 * 
 * @param op1 - First operation (older)
 * @param op2 - Second operation (newer)
 * @returns Merged operation or null if cancelled
 */
function mergeOperations(op1: SyncOp, op2: SyncOp): SyncOp | null {
  // ...
}
```

### README Updates

**Update README when you:**
- Add new features (add to feature list)
- Change setup steps
- Add new dependencies
- Change deployment process

### Documentation Files

**Update these files when relevant:**
- `README.md` - Project overview, setup, features
- `SECURITY.md` - Security measures, policies
- `CONTRIBUTING.md` - This file (contribution guidelines)
- `docs/PLAYBOOK.md` - Architecture decisions, patterns
- `docs/LOCAL_FIRST_ARCHITECTURE.md` - Local-first design

---

## Questions and Support

### For Contributors

- 💬 **Discord:** [discord.gg/pawkit](#)
- 🐛 **Issues:** [GitHub Issues](https://github.com/TheVisher/Pawkit/issues)
- 📧 **Email:** dev@pawkit.app

### For Users

- 📧 **Support:** support@pawkit.app
- 🔒 **Security:** security@pawkit.app

### Discussion Topics

Use GitHub Discussions for:
- Feature requests
- Architecture questions
- General questions
- Showing off your contributions

Use GitHub Issues for:
- Bug reports
- Specific feature proposals
- Documentation improvements

---

## First-Time Contributors

### Good First Issues

Look for issues tagged `good-first-issue`:
- Documentation improvements
- UI polish
- Bug fixes
- Test additions

### Finding Work

1. Check [open issues](https://github.com/TheVisher/Pawkit/issues)
2. Look for `good-first-issue` or `help-wanted` labels
3. Comment saying you'd like to work on it
4. Wait for maintainer confirmation
5. Start working!

### Getting Help

Don't hesitate to ask for help:
- Comment on the issue
- Ask in Discord
- Email dev@pawkit.app

We're here to help you succeed! 🎉

---

## Recognition

### Contributors

All contributors are listed in:
- GitHub contributors graph
- Release notes (for significant contributions)
- CONTRIBUTORS.md (coming soon)

### Special Thanks

We deeply appreciate:
- 🐛 Bug reporters
- 📝 Documentation improvers
- 🧪 Test writers
- 🎨 UI/UX contributors
- 🔒 Security researchers
- 💬 Community helpers

---

## License

By contributing to Pawkit, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Pawkit!** 🙏

Your efforts help make Pawkit better for everyone. Whether you're fixing a typo or adding a major feature, every contribution matters.

Questions? Email dev@pawkit.app or join our Discord!
