import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { getSupabase } from "./supabase";

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
  const db = getSupabase();
  if (db) {
    const { error } = await db.from("admin_sessions").insert({
      token_hash: digest(token).toString("hex"),
      expires: Date.now() + SESSION_SECONDS * 1000,
      password_fingerprint: digest(process.env.ADMIN_PASSWORD!).toString("hex"),
    });
    if (error) throw new Error("Creation de session impossible.", { cause: error });
    return token;
  }
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
  const db = getSupabase();
  if (db) {
    const { data, error } = await db.from("admin_sessions")
      .select("expires,password_fingerprint")
      .eq("token_hash", digest(token).toString("hex")).maybeSingle();
    if (error) throw new Error("Lecture de session impossible.", { cause: error });
    if (!data || Number(data.expires) <= Date.now() ||
      !/^[a-f0-9]{64}$/.test(data.password_fingerprint)) return false;
    return timingSafeEqual(Buffer.from(data.password_fingerprint, "hex"), digest(process.env.ADMIN_PASSWORD!));
  }
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
  const db = getSupabase();
  if (db) {
    const { error } = await db.from("admin_sessions").delete()
      .eq("token_hash", digest(token).toString("hex"));
    if (error) throw new Error("Revocation de session impossible.", { cause: error });
    return;
  }
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
