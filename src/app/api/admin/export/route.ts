import { hasAdminSession, sameOrigin } from "@/lib/admin";
import { getAllSubmissions } from "@/lib/storage";
import { createSurveyCsv } from "@/lib/survey-export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function GET(request: Request) {
  if (!sameOrigin(request))
    return Response.json(
      { error: "Origine non autorisée." },
      { status: 403, headers },
    );
  try {
    if (!(await hasAdminSession()))
      return Response.json(
        { error: "Connexion administrateur requise." },
        { status: 401, headers },
      );
    const csv = createSurveyCsv(await getAllSubmissions());
    return new Response(csv, {
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="enquete-transitions-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "L’export a échoué. Vérifiez que les données enregistrées sont accessibles et réessayez.",
      },
      { status: 500, headers },
    );
  }
}
