import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  SESSION_SECONDS,
  adminConfigured,
  createAdminSession,
  destroyAdminSession,
  sameOrigin,
  verifyAdminPassword,
} from "@/lib/admin";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };
const windowMs = 15 * 60 * 1000;
let failures = { count: 0, expires: 0 };

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Origine non autorisée." },
      { status: 403, headers },
    );
  if (!adminConfigured())
    return NextResponse.json(
      { error: "L’accès administrateur n’est pas encore configuré." },
      { status: 503, headers },
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    return NextResponse.json(
      { error: "Format invalide." },
      { status: 415, headers },
    );
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return NextResponse.json(
        { error: "Requête vide." },
        { status: 400, headers },
      );
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2048) {
        await reader.cancel();
        return NextResponse.json(
          { error: "Requête trop volumineuse." },
          { status: 413, headers },
        );
      }
      chunks.push(value);
    }
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return NextResponse.json(
        { error: "Requête invalide." },
        { status: 400, headers },
      );
    }
    if (
      !body ||
      typeof body.password !== "string" ||
      body.password.length > 1024
    )
      return NextResponse.json(
        { error: "Mot de passe invalide." },
        { status: 400, headers },
      );
    const now = Date.now();
    if (failures.expires <= now)
      failures = { count: 0, expires: now + windowMs };
    if (failures.count >= 10)
      return NextResponse.json(
        { error: "Trop de tentatives. Réessayez dans quelques minutes." },
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(Math.ceil((failures.expires - now) / 1000)),
          },
        },
      );
    if (!verifyAdminPassword(body.password)) {
      failures.count++;
      return NextResponse.json(
        { error: "Mot de passe incorrect." },
        { status: 401, headers },
      );
    }
    failures.count = 0;
    await destroyAdminSession();
    const token = await createAdminSession();
    const response = NextResponse.json({ ok: true }, { headers });
    response.cookies.set(ADMIN_COOKIE, token, {
      httpOnly: true,
      sameSite: "strict",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Connexion indisponible. Réessayez dans quelques instants." },
      { status: 500, headers },
    );
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request))
    return NextResponse.json(
      { error: "Origine non autorisée." },
      { status: 403, headers },
    );
  try {
    await destroyAdminSession();
    const response = NextResponse.json({ ok: true }, { headers });
    response.cookies.set(ADMIN_COOKIE, "", {
      httpOnly: true,
      sameSite: "strict",
      secure: new URL(request.url).protocol === "https:",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "La déconnexion a échoué. Réessayez." },
      { status: 500, headers },
    );
  }
}
