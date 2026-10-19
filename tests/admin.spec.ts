import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { csvCell, exportHeaders, exportRow } from "../src/lib/survey-export";
import { questions, roles, sectors, sizes } from "../src/lib/questionnaire";

const password = "admin-password-for-automated-tests-only-2026";
const submission = {
  practice: '=HYPERLINK("https://example.com";"x")\nTexte; avec "guillemets"',
  answers: Object.fromEntries(
    questions.map((q) => [q.id, q.type === "Frein" ? 4 : 2]),
  ),
  profile: {
    role: roles[0],
    sector: sectors[1],
    size: sizes[2],
    email: "export-test@example.org",
    consent: true,
  },
};
test.describe.configure({ mode: "serial" });

test("export columns and calculations include every family and unweighted scale means", () => {
  const answers = { ...submission.answers, "G04-1": 1, "G04-2": 5 };
  const row = exportRow({
    ...submission,
    answers,
    id: "a".repeat(48),
    createdAt: "2026-10-16T10:00:00.000Z",
  });
  expect(exportHeaders).toHaveLength(107);
  expect(new Set(exportHeaders).size).toBe(107);
  expect(row).toHaveLength(107);
  expect(exportHeaders.filter((h) => /^Q\d{2} \[/.test(h))).toHaveLength(41);
  const byHeader = Object.fromEntries(
    exportHeaders.map((header, i) => [header, row[i]]),
  );
  expect(byHeader["Date de réponse (heure de Paris)"]).toContain("12:00:00");
  expect(
    byHeader[
      "Échelle individuelle - Moyenne des freins (sur 5, moyenne des familles)"
    ],
  ).toBe(3.75);
  expect(
    byHeader[
      "Échelle individuelle - Moyenne des moteurs (sur 5, moyenne des familles)"
    ],
  ).toBe(2);
  expect(
    byHeader[
      "Individuelle - Valeurs et sens du changement [G04] - Moyenne des freins (sur 5)"
    ],
  ).toBe(3);
  expect(
    byHeader[
      "Individuelle - Valeurs et sens du changement [G04] - Catégorie de restitution"
    ],
  ).toBe("Intermédiaire");
  expect(byHeader["Nombre de familles : Priorité"]).toBe(13);
  expect(byHeader["Nombre de familles : Intermédiaire"]).toBe(1);
  expect(byHeader["Seuil haut utilisé pour la restitution"]).toBe(3.5);
  expect(byHeader["Nombre d’affirmations renseignées"]).toBe(41);
  expect(
    exportHeaders.slice(50, 92).map((header) => header.split(" - ")[0]),
  ).toEqual([
    ...Array(12).fill("Individuelle"),
    ...Array(9).fill("Organisationnelle"),
    ...Array(9).fill("Culturelle"),
    ...Array(12).fill("Politique et institutionnelle"),
  ]);
});

test("CSV escapes delimiters and quotes and neutralizes spreadsheet formulas", () => {
  expect(csvCell('Texte; avec "guillemets"\net retour')).toBe(
    '"Texte; avec ""guillemets""\net retour"',
  );
  for (const value of [
    "=1+1",
    "+1+1",
    "-1+1",
    "@SUM(1)",
    "  =1+1",
    "\t=1+1",
    "\rtest",
  ]) {
    expect(csvCell(value).startsWith("\"'")).toBe(true);
  }
  expect(csvCell(3.75)).toBe('"3,75"');
  expect(csvCell("texte simple")).toBe('"texte simple"');
});

test("anonymous, forged and cross-origin requests cannot export survey data", async ({
  request,
  page,
}) => {
  expect((await request.get("/api/admin/export")).status()).toBe(401);
  expect(
    (
      await request.get("/api/admin/export", {
        headers: { Cookie: `transitions_admin=${"0".repeat(64)}` },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("/api/admin/session", {
        headers: { Origin: "https://elsewhere.example" },
        data: { password },
      })
    ).status(),
  ).toBe(403);
  const denied = await request.post("/api/admin/session", {
    data: { password: "incorrect-password" },
  });
  expect(denied.status()).toBe(401);
  expect(denied.headers()["set-cookie"]).toBeUndefined();
  expect((await request.get("/api/admin/export")).status()).toBe(401);
  await page.goto("/admin");
  await expect(page.getByLabel("Mot de passe administrateur")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Exporter toutes les données (CSV)" }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "test-results/admin-connexion.png",
    fullPage: true,
  });
});

test("administrator downloads every response and logout revokes the previous cookie", async ({
  request,
  page,
}, testInfo) => {
  const created = await request.post("/api/responses", { data: submission });
  expect(created.status()).toBe(201);
  const { url } = await created.json();
  const id = url.split("/").at(-1);
  const second = await request.post("/api/responses", {
    data: {
      ...submission,
      practice: "Transition culturelle",
      profile: { ...submission.profile, email: "", consent: false },
    },
  });
  expect(second.status()).toBe(201);
  const secondId = (await second.json()).url.split("/").at(-1);

  await page.goto("/admin");
  await page
    .getByLabel("Mot de passe administrateur")
    .fill("incorrect-password");
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(page.locator(".error-message")).toContainText(
    "Mot de passe incorrect",
  );
  await page.getByLabel("Mot de passe administrateur").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
  await expect(
    page.getByRole("heading", { name: "Données de l’enquête" }),
  ).toBeVisible();
  await expect(page.locator(".admin-metrics dd").nth(1)).toHaveText("107");
  const cookie = (await page.context().cookies()).find(
    (item) => item.name === "transitions_admin",
  )!;
  expect(cookie.httpOnly).toBe(true);
  expect(cookie.sameSite).toBe("Strict");
  const exported = await page.request.get("/api/admin/export");
  expect(exported.status()).toBe(200);
  expect(exported.headers()["cache-control"]).toContain("no-store");
  expect(exported.headers()["content-disposition"]).toContain("attachment;");
  const bytes = await exported.body();
  expect(bytes.subarray(0, 3).toString("hex")).toBe("efbbbf");
  const csv = bytes.toString("utf8");
  expect(csv).toContain(`"${id}"`);
  expect(csv).toContain(`"${secondId}"`);
  expect(csv).toContain('"export-test@example.org";"Oui"');
  expect(csv).toContain('"Transition culturelle"');
  expect(csv).toContain('"Q41 [G14-3]');
  expect(csv).toContain(
    '"Échelle politique et institutionnelle - Moyenne des moteurs',
  );
  expect(csv).toContain(
    `"'=HYPERLINK(""https://example.com"";""x"")\nTexte; avec ""guillemets"""`,
  );
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exporter toutes les données (CSV)" })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^enquete-transitions-.*\.csv$/);
  await download.saveAs(testInfo.outputPath("export-admin.csv"));
  await page.screenshot({
    path: "test-results/admin-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
  await page.screenshot({
    path: "test-results/admin-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page.getByLabel("Mot de passe administrateur")).toBeVisible();
  expect((await page.request.get("/api/admin/export")).status()).toBe(401);
  expect(
    (
      await request.get("/api/admin/export", {
        headers: { Cookie: `transitions_admin=${cookie.value}` },
      })
    ).status(),
  ).toBe(401);
});

test("expired administrator sessions cannot export", async ({ request }) => {
  expect(
    (await request.post("/api/admin/session", { data: { password } })).status(),
  ).toBe(200);
  const cookie = (await request.storageState()).cookies.find(
    (item) => item.name === "transitions_admin",
  )!;
  const hash = createHash("sha256").update(cookie.value).digest("hex");
  const filename = path.join(
    process.cwd(),
    "test-results",
    "admin-sessions",
    `${hash}.json`,
  );
  const saved = JSON.parse(await readFile(filename, "utf8"));
  await writeFile(
    filename,
    JSON.stringify({ ...saved, expires: Date.now() - 1000 }),
  );
  expect((await request.get("/api/admin/export")).status()).toBe(401);
  await request.delete("/api/admin/session");
});

test("repeated failed logins are rate limited", async ({ request }) => {
  for (let attempt = 0; attempt < 10; attempt++)
    expect(
      (
        await request.post("/api/admin/session", {
          data: { password: "wrong-password" },
        })
      ).status(),
    ).toBe(401);
  const limited = await request.post("/api/admin/session", {
    data: { password },
  });
  expect(limited.status()).toBe(429);
  expect(Number(limited.headers()["retry-after"])).toBeGreaterThan(0);
});
