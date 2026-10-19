import { getSubmission } from "@/lib/storage";
import { createResultPdf } from "@/lib/result-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const record = await getSubmission(id);
    if (!record) return Response.json({ error: "Restitution introuvable." }, { status: 404, headers });
    const pdf = await createResultPdf(record);
    return new Response(new Uint8Array(pdf), {
      headers: {
        ...headers,
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="ma-restitution-transitions.pdf"',
      },
    });
  } catch {
    return Response.json({ error: "La génération du PDF a échoué. Veuillez réessayer." }, { status: 500, headers });
  }
}
