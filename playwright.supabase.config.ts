import { chromium, defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "supabase.spec.ts",
  workers: 1,
  timeout: 60_000,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  webServer: [
    {
      command: "node tests/fixtures/supabase-server.mjs",
      url: "http://127.0.0.1:3101/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run start -- --port 3100",
      url: "http://localhost:3100",
      reuseExistingServer: false,
      env: {
        SUPABASE_URL: "http://127.0.0.1:3101",
        SUPABASE_SECRET_KEY: "sb_secret_automated_test_only",
        ADMIN_PASSWORD: "admin-password-for-automated-tests-only-2026",
        VERCEL: "1",
        PDF_CHROMIUM_EXECUTABLE_PATH: chromium.executablePath(),
      },
    },
  ],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
