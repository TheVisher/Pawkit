import type { PlaywrightTestConfig } from "@playwright/test";

const config: PlaywrightTestConfig = {
  timeout: 60_000,
  webServer: {
    command: "npm run dev",
    port: 3000,
    timeout: 120_000,
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL: "http://localhost:3000",
    headless: true
  },
  testDir: "tests/playwright"
};

export default config;
