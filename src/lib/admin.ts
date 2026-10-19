import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "transitions_admin";
export const SESSION_SECONDS = 8 * 60 * 60;
const sessionDirectory = path.join(
  path.dirname(
    process.env.SURVEY_DATA_DIR ||
      path.join(process.cwd(), "data", "responses"),
  ),
  "admin-sessions",
);
const digest = (value: string) => createHash("sha256").update(value).digest();
const sessionFile = (token: string) =>
  path.join(sessionDirectory, `${digest(token).toString("hex")}.json`);

export function adminConfigured() {
  return (process.env.ADMIN_PASSWORD?.length ?? 0) >= 20;
}

export function verifyAdminPassword(password: string) {
  return (
    adminConfigured() &&
    timingSafeEqual(digest(password), digest(process.env.ADMIN_PASSWORD!))
  );
}

export async function createAdminSession() {
  const token = randomBytes(32).toString("hex");
  await mkdir(sessionDirectory, { recursive: true });
  await writeFile(
    sessionFile(token),
    JSON.stringify({
      expires: Date.now() + SESSION_SECONDS * 1000,
      passwordFingerprint: digest(process.env.ADMIN_PASSWORD!).toString("hex"),
    }),
    { flag: "wx", mode: 0o600 },
  );
  return token;
}

export async function hasAdminSession() {
  if (!adminConfigured()) return false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  try {
    const session = JSON.parse(await readFile(sessionFile(token), "utf8"));
    if (typeof session.expires !== "number" || session.expires <= Date.now())
      return false;
    if (
      typeof session.passwordFingerprint !== "string" ||
      !/^[a-f0-9]{64}$/.test(session.passwordFingerprint)
    )
      return false;
    return timingSafeEqual(
      Buffer.from(session.passwordFingerprint, "hex"),
      digest(process.env.ADMIN_PASSWORD!),
    );
  } catch (error) {
    if (
      (error as NodeJS.ErrnoException).code === "ENOENT" ||
      error instanceof SyntaxError
    )
      return false;
    throw error;
  }
}

export async function destroyAdminSession() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return;
  try {
    await unlink(sessionFile(token));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return (
    request.headers.get("sec-fetch-site") !== "cross-site" &&
    (!origin || origin === new URL(request.url).origin)
  );
}
