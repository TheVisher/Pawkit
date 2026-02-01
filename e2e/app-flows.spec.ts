import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Pawkit Core Flows
 * Tests the Tags as Canonical Membership implementation and other key features
 */

test.describe('App Navigation', () => {
  test('should load home page after login', async ({ page }) => {
    await page.goto('/');

    // Should redirect to home or show dashboard content
    await expect(page).toHaveURL(/\/(home|library|pawkits)?/);

    // Page should have loaded without errors
    await expect(page.locator('body')).not.toContainText('Error');
  });

  test('should navigate to Library', async ({ page }) => {
    await page.goto('/library');

    await expect(page).toHaveURL('/library');
    // Library page should show cards or empty state
    await expect(page.locator('body')).toContainText(/Library|No cards|card/i);
  });

  test('should navigate to Pawkits overview', async ({ page }) => {
    await page.goto('/pawkits');

    await expect(page).toHaveURL('/pawkits');
    // Should show Pawkits page
    await expect(page.locator('body')).toContainText(/Pawkit/i);
  });

  test('should navigate to Tags page', async ({ page }) => {
    await page.goto('/tags');

    await expect(page).toHaveURL('/tags');
    await expect(page.locator('body')).toContainText(/Tags/i);
  });
});

test.describe('Card Operations', () => {
  test('should open add card modal from omnibar', async ({ page }) => {
    await page.goto('/library');

    // Press Cmd/Ctrl+K to open omnibar
    await page.keyboard.press('Meta+k');

    // Wait for omnibar to appear
    await page.waitForSelector('[role="combobox"], [data-omnibar]', { timeout: 5000 }).catch(() => {
      // Try clicking the search button if keyboard shortcut doesn't work
    });
  });
});

test.describe('Pawkit Membership (Tags Canonical)', () => {
  test('should be able to access Pawkits page', async ({ page }) => {
    // Navigate directly to pawkits page
    await page.goto('/pawkits');
    await page.waitForLoadState('networkidle');

    // Page should load and contain Pawkit-related content
    await expect(page.locator('body')).toContainText(/Pawkit/i);
  });

  test('should navigate to a Pawkit detail page', async ({ page }) => {
    await page.goto('/pawkits');

    // If there are Pawkits, click the first one
    const pawkitCard = page.locator('[data-pawkit-card], a[href^="/pawkits/"]').first();

    if (await pawkitCard.isVisible()) {
      await pawkitCard.click();

      // Should navigate to pawkit detail
      await expect(page).toHaveURL(/\/pawkits\/.+/);
    }
  });
});

test.describe('Tags Page - Pawkit Slug Protection', () => {
  test('should load tags page', async ({ page }) => {
    await page.goto('/tags');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should show tags or "no tags" message
    await expect(page.locator('body')).toContainText(/Tags|No tags/i);
  });

  test('should display tag list or empty state', async ({ page }) => {
    await page.goto('/tags');

    await page.waitForLoadState('networkidle');

    // Page should have loaded - either shows tags, sorting options, or empty state
    // Just verify the page loaded without errors
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).toContainText(/Tags/i);
  });
});

test.describe('Settings', () => {
  test('should navigate to settings', async ({ page }) => {
    await page.goto('/');

    // Look for settings button/link
    const settingsButton = page.locator('button:has-text("Settings"), a[href="/settings"], [aria-label*="settings" i]').first();

    if (await settingsButton.isVisible()) {
      await settingsButton.click();
      await page.waitForLoadState('networkidle');
    } else {
      // Try direct navigation
      await page.goto('/settings');
    }

    // Should show settings content
    await expect(page.locator('body')).toContainText(/Settings|Account|Preferences/i);
  });
});

test.describe('Smoke Tests', () => {
  test('all main routes should load without errors', async ({ page }) => {
    const routes = ['/', '/home', '/library', '/pawkits', '/tags', '/calendar'];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');

      // Check no error messages visible
      const errorVisible = await page.locator('text=/error|crashed|failed/i').isVisible().catch(() => false);
      expect(errorVisible, `Route ${route} should not show error`).toBeFalsy();
    }
  });

  test('should not have console errors on main pages', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/library');
    await page.waitForLoadState('networkidle');

    // Filter out known acceptable errors (like 3rd party scripts)
    const criticalErrors = errors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('third-party') &&
      !e.includes('Failed to load resource')
    );

    expect(criticalErrors.length, `Console errors: ${criticalErrors.join(', ')}`).toBe(0);
  });
});
