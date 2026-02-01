import { test as setup, expect } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const authFile = join(__dirname, '../.playwright/.auth/user.json');

/**
 * Authentication setup - runs before all tests
 * Logs in and saves session state to reuse across tests
 */
setup('authenticate', async ({ page }) => {
  // Use environment variables or defaults for test credentials
  const email = process.env.TEST_EMAIL || 'dev@pawkit.com';
  const password = process.env.TEST_PASSWORD || 'Yamaha125F!!';

  // Navigate to login page
  await page.goto('/login');

  // Wait for the login form to be visible
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

  // Fill in credentials
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);

  // Click login button
  await page.click('button[type="submit"]');

  // Wait for navigation to home/library page (successful login)
  await page.waitForURL(/\/(home|library|pawkits)/, { timeout: 15000 });

  // Verify we're logged in by checking for a logged-in indicator
  await expect(page.locator('body')).not.toContainText('Sign in');

  // Save authentication state
  await page.context().storageState({ path: authFile });
});
