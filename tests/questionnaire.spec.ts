import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  calculate,
  classify,
  questions,
  roles,
  sectors,
  sizes,
  validateSubmission,
} from "../src/lib/questionnaire";

async function setSlider(page: Page, id: string, value: number) {
  const slider = page.locator(`input[name="${id}"]`);
  await slider.focus();
  await slider.press("Home");
  for (let step = 1; step < value; step++) await slider.press("ArrowRight");
  await expect(slider).toHaveValue(String(value));
}

test("calculations match workbook thresholds and per-scale family logic", () => {
  expect(questions).toHaveLength(41);
  expect(classify(3.5, 2.99)).toBe("Priorité");
  expect(classify(3.5, 3)).toBe("Tension");
  expect(classify(2.99, 3.5)).toBe("Appui");
  expect(classify(3, 3.5)).toBe("Intermédiaire");
  const answers = Object.fromEntries(
    questions.map((q) => [q.id, q.type === "Frein" ? 4 : 2]),
  );
  const results = calculate(answers);
  expect(results).toHaveLength(14);
  expect(
    results.every(
      (r) => r.brakes === 4 && r.drivers === 2 && r.status === "Priorité",
    ),
  ).toBe(true);
  answers["G04-1"] = 1;
  answers["G04-2"] = 5;
  answers["G04-3"] = 4;
  const mixed = calculate(answers).find((r) => r.id === "G04")!;
  expect(mixed.brakes).toBe(3);
  expect(mixed.drivers).toBe(4);
  expect(mixed.status).toBe("Intermédiaire");
});

test("submission validation rejects missing and invalid answers and email without consent", () => {
  const valid = {
    answers: Object.fromEntries(questions.map((q) => [q.id, 3])),
    practice: "Réduire les déplacements",
    profile: {
      role: roles[0],
      sector: sectors[0],
      size: sizes[0],
      email: "",
      consent: false,
    },
  };
  expect(validateSubmission(valid)).toBe(true);
  expect(validateSubmission({ ...valid, answers: {} })).toBe(false);
  expect(
    validateSubmission({ ...valid, answers: { ...valid.answers, "G01-1": 6 } }),
  ).toBe(false);
  expect(
    validateSubmission({
      ...valid,
      profile: { ...valid.profile, email: "test@example.com" },
    }),
  ).toBe(false);
  expect(
    validateSubmission({
      ...valid,
      profile: { ...valid.profile, email: "test@example.com", consent: true },
    }),
  ).toBe(true);
});

test("complete anonymous journey, resume, charts, exports and personal link", async ({
  page,
  request,
}) => {
  const browserErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Les freins et les moteurs",
  );
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.locator(".error-message[role='alert']")).toContainText(
    "Précisez la pratique ou le changement",
  );
  const practiceInput = page.getByLabel(
    "La pratique ou le changement que vous avez en tête",
  );
  await expect(practiceInput).toBeFocused();
  await expect(practiceInput).toHaveAttribute("required", "");
  expect(
    await practiceInput.evaluate(
      (input) =>
        !!(
          input.compareDocumentPosition(
            document.querySelector(".progress-line")!,
          ) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
    ),
  ).toBe(true);
  await page
    .getByPlaceholder("Ex. : réduire les déplacements professionnels")
    .fill("Réduire les déplacements professionnels");
  await page.getByRole("button", { name: "Continuer", exact: true }).click();
  await expect(page.locator(".error-message[role='alert']")).toContainText(
    "Sélectionnez une réponse",
  );
  await expect(page.locator(".sidebar")).toHaveCount(0);
  await expect(page.getByRole("slider")).toHaveCount(3);
  await setSlider(page, "G01-1", 4);
  await page.reload();
  await expect(page.locator('input[name="G01-1"]')).toHaveValue("4");
  await expect(practiceInput).toHaveValue(
    "Réduire les déplacements professionnels",
  );
  for (let family = 0; family < 14; family++) {
    const code = `G${String(family + 1).padStart(2, "0")}`;
    for (const q of questions.filter((q) => q.family === code)) {
      await setSlider(page, q.id, q.type === "Frein" ? 4 : 2);
    }
    await page
      .getByRole("button", {
        name: family === 13 ? "Mon profil" : "Continuer",
        exact: true,
      })
      .click();
  }
  await expect(practiceInput).toHaveCount(0);
  await page.getByLabel("Votre fonction").selectOption(roles[0]);
  await page.getByLabel("Votre secteur d’activité").selectOption(sectors[1]);
  await page.getByLabel("La taille de votre entreprise").selectOption(sizes[2]);
  const saved = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/responses") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Terminer et voir ma restitution" })
    .click();
  expect((await saved).status()).toBe(201);
  await expect(page).toHaveURL(/\/resultats\/[a-f0-9]{48}$/);
  await expect(
    page.getByRole("heading", { name: "Votre regard sur la transition." }),
  ).toBeVisible();
  await expect(page.locator(".family-score")).toHaveCount(14);
  await expect(page.locator(".family-scale-heading h3")).toHaveText([
    "Individuelle",
    "Organisationnelle",
    "Culturelle",
    "Politique et institutionnelle",
  ]);
  const expectedGroups = [
    ["G01", "G03", "G04", "G07"],
    ["G10", "G11", "G14"],
    ["G05", "G06", "G13"],
    ["G02", "G08", "G09", "G12"],
  ];
  for (const [index, ids] of expectedGroups.entries()) {
    await expect(
      page
        .locator(".family-scale-group")
        .nth(index)
        .locator(".family-score h4"),
    ).toHaveText(
      ids.map(
        (id) => questions.find((question) => question.family === id)!.title,
      ),
    );
  }
  await expect(
    page.locator(".family-score .status-badge.priority"),
  ).toHaveCount(14);
  await expect(page.locator(".family-score .brake-bar")).toHaveCount(14);
  await expect(page.locator(".family-score .driver-bar")).toHaveCount(14);
  await expect(
    page.locator(".family-score .brake-bar").first(),
  ).toHaveAttribute("style", "width:80%");
  await expect(
    page.locator(".family-score .driver-bar").first(),
  ).toHaveAttribute("style", "width:40%");
  await expect(
    page.locator(".family-score .bar-line strong").first(),
  ).toHaveText("4,0");
  await expect(page.locator(".scale-result")).toHaveCount(4);
  await expect(page.locator(".brake-bar").first()).toHaveCSS("width", /.+/);
  expect(
    await page.evaluate(() => localStorage.getItem("transitions-survey-v1")),
  ).toBeNull();
  const resultUrl = page.url();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger les scores" }).click();
  expect((await download).suggestedFilename()).toBe(
    "ma-restitution-transitions.csv",
  );
  await page.route("**/api/results/*/pdf", (route) => route.fulfill({
    status: 500, contentType: "application/json", body: '{"error":"Unavailable"}',
  }));
  const pdfButton = page.getByRole("button", { name: "Télécharger ma restitution (PDF)" });
  await pdfButton.click();
  await expect(page.getByRole("status")).toContainText("Le PDF n’a pas pu être généré");
  await expect(pdfButton).toBeEnabled();
  await page.unroute("**/api/results/*/pdf");
  const pdfDownload = page.waitForEvent("download");
  const pdfResponse = page.waitForResponse((response) => response.url().endsWith("/pdf"));
  await pdfButton.click();
  const generated = await pdfResponse;
  expect(generated.status()).toBe(200);
  expect(generated.headers()["content-type"]).toBe("application/pdf");
  expect(generated.headers()["cache-control"]).toContain("no-store");
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toBe("ma-restitution-transitions.pdf");
  const pdfPath = "test-results/restitution-utilisateur.pdf";
  await pdf.saveAs(pdfPath);
  const bytes = await readFile(pdfPath);
  expect(bytes.subarray(0, 5).toString()).toBe("%PDF-");
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdfTask = getDocument({ data: new Uint8Array(bytes), useSystemFonts: true });
  const pdfDocument = await pdfTask.promise;
  try {
    expect(pdfDocument.numPages).toBeGreaterThan(1);
    expect(pdfDocument.numPages).toBeLessThanOrEqual(6);
    let text = "";
    for (let index = 1; index <= pdfDocument.numPages; index++) {
      const content = await (await pdfDocument.getPage(index)).getTextContent();
      text += content.items.map((item) => "str" in item ? item.str : "").join(" ") + " ";
    }
    text = text.replace(/\s+/g, " ");
    expect(text).toContain("Votre regard sur la transition.");
    expect(text).toContain("Réduire les déplacements professionnels");
    expect(text).toContain("Une lecture à prendre avec recul");
    for (const title of new Set(questions.map((q) => q.title))) expect(text).toContain(title);
    expect(text).not.toContain("Télécharger ma restitution");
  } finally {
    await pdfTask.destroy();
  }
  const missingPdf = await request.get("/api/results/invalid-token/pdf");
  expect(missingPdf.status()).toBe(404);
  await page.reload();
  await expect(
    page.getByText("Réduire les déplacements professionnels", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/resultats-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: "test-results/resultats-mobile.png",
    fullPage: true,
  });
  const html = await request.get(resultUrl);
  expect(html.status()).toBe(200);
  await page.goto("/resultats/invalid-token");
  await expect(
    page.getByRole("heading", { name: "Restitution introuvable" }),
  ).toBeVisible();
  expect(browserErrors).toEqual([]);
});

test("mobile layout, keyboard choices and email consent", async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("fieldset")).toHaveCount(3);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({
    path: "test-results/questionnaire-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/questionnaire-desktop.png",
    fullPage: true,
  });
  const firstSlider = page.locator('input[name="G01-1"]');
  await firstSlider.focus();
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  await firstSlider.click();
  await expect(firstSlider).toHaveValue("3");
  await expect(page.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
  await expect(page.locator("#G01-1 output")).toContainText("Partiellement");
  await firstSlider.press("ArrowRight");
  await expect(firstSlider).toHaveValue("4");
  const bounds = (await firstSlider.boundingBox())!;
  await page.mouse.move(
    bounds.x + 13 + (bounds.width - 26) * 0.75,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    bounds.x + bounds.width - 13,
    bounds.y + bounds.height / 2,
    { steps: 8 },
  );
  await page.mouse.up();
  await expect(firstSlider).toHaveValue("5");
  await expect(page.locator("#G01-1 output")).toContainText(
    "Tout à fait d’accord",
  );
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
  await page.evaluate(() => {
    const draft = JSON.parse(localStorage.getItem("transitions-survey-v1")!);
    draft.step = 14;
    localStorage.setItem("transitions-survey-v1", JSON.stringify(draft));
  });
  await page.reload();
  await expect(page.getByLabel("Votre adresse email")).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 320);
  await page.screenshot({
    path: "test-results/profil-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Votre adresse email").fill("test@example.com");
  await expect(page.getByRole("checkbox")).toBeVisible();
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByRole("checkbox").check();
  const draft = JSON.parse(
    (await page.evaluate(() => localStorage.getItem("transitions-survey-v1")))!,
  );
  expect(draft.profile.email).toBe("");
  expect(draft.profile.consent).toBe(false);
  await page.getByLabel("Votre adresse email").fill("");
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Terminer et voir ma restitution" })
    .click();
  await expect(page).toHaveURL("/");
  const invalid = await request.post("/api/responses", {
    data: { answers: {} },
  });
  expect(invalid.status()).toBe(400);
  const untrusted = await request.post("/api/responses", {
    headers: { origin: "https://elsewhere.example" },
    data: {},
  });
  expect(untrusted.status()).toBe(403);
});
