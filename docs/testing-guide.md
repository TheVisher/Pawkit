# Testing Guide

This document covers the testing infrastructure for Pawkit, including unit tests and end-to-end (E2E) tests.

## Overview

Pawkit uses two types of tests:

| Type | Framework | Purpose |
|------|-----------|---------|
| Unit Tests | Vitest | Test individual functions and components in isolation |
| E2E Tests | Playwright | Test full user flows in a real browser |

---

## Quick Start

```bash
# Run unit tests
pnpm test

# Run E2E tests (requires dev server running)
pnpm test:e2e
```

---

## Unit Tests (Vitest)

### Configuration

Unit tests are configured in `vitest.config.ts` with:
- `jsdom` environment for browser API mocking
- Setup file at `src/__tests__/setup.ts` for global mocks

### Running Unit Tests

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage
```

### Writing Unit Tests

Place test files next to the code they test with `.test.ts` or `.spec.ts` extension:

```
src/
  components/
    my-component.tsx
    my-component.test.tsx  # Unit test for the component
```

---

## E2E Tests (Playwright)

### Configuration

E2E tests are configured in `playwright.config.ts`:
- Test directory: `e2e/`
- Base URL: `http://localhost:3000`
- Browser: Chromium
- Authentication: Saved session state for reuse across tests

### Prerequisites

1. **Dev server must be running:**
   ```bash
   pnpm dev
   ```

2. **Test credentials** (set via environment variables or defaults):
   - `TEST_EMAIL` - Test account email
   - `TEST_PASSWORD` - Test account password

### Running E2E Tests

```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test file
npx playwright test e2e/cards.spec.ts

# Run tests with UI mode (interactive)
npx playwright test --ui

# Run tests in headed mode (see the browser)
npx playwright test --headed

# View test report
npx playwright show-report
```

### Test Structure

```
e2e/
  auth.setup.ts       # Authentication setup (runs first)
  app-flows.spec.ts   # Core navigation and smoke tests
  cards.spec.ts       # Card CRUD operations
  pawkits.spec.ts     # Pawkit management
  tags.spec.ts        # Tag operations
  calendar.spec.ts    # Calendar and scheduling
  search.spec.ts      # Omnibar and search
  settings.spec.ts    # Settings and account
  home.spec.ts        # Home page widgets
  privacy.spec.ts     # Privacy filtering
  responsive.spec.ts  # Mobile/tablet/desktop
```

### Test Coverage

| Area | Tests | What's Covered |
|------|-------|----------------|
| Authentication | 1 | Login, session persistence |
| Navigation | 13 | All routes, sidebar, smoke tests |
| Cards | 9 | Create, view, edit, delete, filter |
| Pawkits | 13 | Overview, detail, membership |
| Tags | 9 | CRUD, Pawkit slug protection |
| Calendar | 8 | Views, navigation, scheduling |
| Search | 12 | Omnibar, search, quick actions |
| Settings | 11 | Account, appearance, data |
| Home | 14 | Widgets, stats, navigation |
| Privacy | 11 | Non-private filtering |
| Responsive | 12 | Mobile, tablet, desktop |

**Total: 119 tests**

---

## When to Run Tests

### During Development

Run relevant tests when making changes:

```bash
# Changed card-related code
npx playwright test e2e/cards.spec.ts

# Changed tag-related code
npx playwright test e2e/tags.spec.ts
```

### Before Committing

Run the full test suite to catch regressions:

```bash
pnpm test        # Unit tests
pnpm test:e2e    # E2E tests
```

### Before Deploying

Always run all tests before deploying to production:

```bash
pnpm test && pnpm test:e2e
```

---

## Debugging Failed Tests

### View Screenshots

Failed tests automatically capture screenshots:
```
test-results/
  [test-name]-chromium/
    test-failed-1.png
```

### Run in Headed Mode

See what's happening in the browser:
```bash
npx playwright test e2e/cards.spec.ts --headed
```

### Use UI Mode

Interactive debugging with time-travel:
```bash
npx playwright test --ui
```

### Check Test Report

Detailed HTML report with traces:
```bash
npx playwright show-report
```

---

## Writing E2E Tests

### Basic Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should do something', async ({ page }) => {
    await page.goto('/some-page');
    await page.waitForLoadState('networkidle');

    // Interact with the page
    await page.click('button:has-text("Click Me")');

    // Assert expected behavior
    await expect(page.locator('body')).toContainText('Success');
  });
});
```

### Best Practices

1. **Use `waitForLoadState`** after navigation:
   ```typescript
   await page.goto('/library');
   await page.waitForLoadState('networkidle');
   ```

2. **Use `.first()` for locators that match multiple elements**:
   ```typescript
   const button = page.locator('button').first();
   ```

3. **Use `getByText()` for text matching with regex**:
   ```typescript
   const element = page.getByText(/Welcome|Hello/i);
   ```

4. **Handle optional elements gracefully**:
   ```typescript
   if (await element.isVisible()) {
     await element.click();
   }
   ```

5. **Always verify page loads without errors**:
   ```typescript
   await expect(page.locator('body')).not.toContainText('Error');
   ```

---

## CI/CD Integration

Tests can be run in CI pipelines. The Playwright config includes:
- Retries on CI (`process.env.CI ? 2 : 0`)
- HTML and list reporters
- Screenshots on failure
- Video recording on retry

Example GitHub Actions workflow:
```yaml
- name: Run E2E tests
  run: |
    pnpm dev &
    sleep 10
    pnpm test:e2e
```

---

## Debug Panel

The app includes a **Performance Debug Panel** for live-tweaking settings during development.

### Toggle the Debug Panel

**Keyboard shortcut:** `Ctrl+Shift+D` (or `Cmd+Shift+D` on Mac)

### Available Sections

| Section | What it controls |
|---------|------------------|
| ResizeObserver | Resize detection settings |
| Scroll & Virtualization | Scroll performance tuning |
| Masonry Grid | Card grid layout options |
| React & Framer | Animation settings |
| Image Loading | Image optimization |
| Cache & IndexedDB | Caching behavior |
| Performance Metrics | Performance monitoring |

### Presets

Quickly apply pre-configured settings:

| Preset | Description |
|--------|-------------|
| V1 Mode | Original behavior |
| V2 Mode | Updated behavior |
| Max Perf | Maximum performance settings |
| Debug | Debug mode with extra logging |

### Features

- **Live updates** - Changes apply instantly
- **Draggable** - Move the panel anywhere on screen
- **Copy settings** - Export current settings as JSON
- **Reset** - Return to default settings

Use this panel to experiment with performance settings and find optimal configurations for different scenarios.

---

## Troubleshooting

### "Browser not installed"

```bash
npx playwright install chromium
```

### Tests timing out

Increase timeout in `playwright.config.ts`:
```typescript
timeout: 60000, // 60 seconds
```

### Authentication failing

Check that:
1. Dev server is running
2. Test credentials are correct
3. `.playwright/.auth/user.json` exists after first run

### Flaky tests

- Add explicit waits: `await page.waitForTimeout(500)`
- Use `networkidle` instead of `domcontentloaded`
- Check for race conditions in the app
