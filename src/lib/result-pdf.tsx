import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { renderToReadableStream } from "react-dom/server.edge";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import ResultReport from "@/components/result-report";
import type { SavedSubmission } from "./storage";

export async function createResultPdf(record: SavedSubmission) {
  const css = await readFile(path.join(process.cwd(), "src/app/globals.css"), "utf8");
  // Shared HTML and CSS keep the downloadable report aligned with the result page.
  // All content is rendered locally: no result URL, credentials or external resources
  // are sent to a third-party PDF service or loaded by Chromium.
  const report = await new Response(await renderToReadableStream(<ResultReport record={record} />)).text();
  const localExecutable = process.env.PDF_CHROMIUM_EXECUTABLE_PATH;
  const serverless = !localExecutable && !!process.env.VERCEL;
  const browser = await puppeteer.launch({
    ...(serverless ? {
      executablePath: await chromium.executablePath(),
      args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      headless: "shell" as const,
    } : localExecutable ? { executablePath: localExecutable, headless: true } : {
      channel: "chrome" as const, headless: true,
    }),
    timeout: 20_000,
  });
  try {
    const page = await browser.newPage();
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (request) => { void request.abort(); });
    await page.setViewport({ width: 1100, height: 900, deviceScaleFactor: 1 });
    await page.emulateMediaType("print");
    await page.setContent(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
      <title>Ma restitution — Transitions</title>
      <style>${css.replace(/@import\s+[^;]+;/g, "")}</style>
      </head><body>${report}</body></html>`, { waitUntil: "load", timeout: 10_000 });
    return await page.pdf({
      format: "A4",
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      timeout: 20_000,
    });
  } finally {
    await browser.close();
  }
}
