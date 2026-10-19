import { chromium, defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testIgnore: "supabase.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      SUPABASE_URL: "",
      SUPABASE_SECRET_KEY: "",
      VERCEL: "",
      PDF_CHROMIUM_EXECUTABLE_PATH: chromium.executablePath(),
      SURVEY_DATA_DIR: "./test-results/responses",
      ADMIN_PASSWORD: "admin-password-for-automated-tests-only-2026",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
