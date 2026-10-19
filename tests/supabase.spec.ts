import { test, expect } from "@playwright/test";
import { questions, roles, sectors, sizes } from "../src/lib/questionnaire";

test("Supabase saves responses, paginates exports, revokes and expires sessions, and fails closed", async ({ request, page }) => {
  const ids: string[] = [];
  const password = "admin-password-for-automated-tests-only-2026";
  const submission = {
    answers: Object.fromEntries(questions.map((q) => [q.id, 4])),
    practice: "Test du stockage persistant",
    profile: { role: roles[0], sector: sectors[0], size: sizes[0], email: "", consent: false },
  };
  for (let i = 0; i < 5; i++) {
    const saved = await request.post("/api/responses", { data: submission });
    expect(saved.status()).toBe(201);
    ids.push((await saved.json()).url.split("/").at(-1));
  }
  await page.goto(`/resultats/${ids[0]}`);
  await expect(page.locator("body")).toContainText(submission.practice);
  expect((await request.get(`/resultats/${"0".repeat(48)}`)).status()).toBe(404);
  expect((await request.get("/api/admin/export")).status()).toBe(401);
  expect((await request.post("/api/admin/session", { data: { password } })).status()).toBe(200);
  const state = await request.storageState();
  const cookie = state.cookies.find((c) => c.name === "transitions_admin")!;
  const exported = await request.get("/api/admin/export");
  expect(exported.status()).toBe(200);
  const csv = await exported.text();
  for (const id of ids) expect(csv).toContain(id);
  await request.delete("/api/admin/session");
  expect((await request.get("/api/admin/export", {
    headers: { Cookie: `transitions_admin=${cookie.value}` },
  })).status()).toBe(401);
  expect((await request.post("/api/admin/session", { data: { password } })).status()).toBe(200);
  await request.post("http://127.0.0.1:3101/__test/expire");
  expect((await request.get("/api/admin/export")).status()).toBe(401);
  await request.post("http://127.0.0.1:3101/__test/unavailable?value=true");
  try {
    expect((await request.post("/api/responses", { data: submission })).status()).toBe(500);
    expect((await request.post("/api/admin/session", { data: { password } })).status()).toBe(500);
  } finally {
    await request.post("http://127.0.0.1:3101/__test/unavailable?value=false");
  }
});
