import { validateSubmission } from "@/lib/questionnaire";
import { saveSubmission } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json(
      { error: "Origine de la requête non autorisée." },
      { status: 403 },
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    return Response.json(
      { error: "Format de réponse invalide." },
      { status: 415 },
    );
  try {
    const reader = request.body?.getReader();
    if (!reader)
      return Response.json({ error: "Réponse vide." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 16000) {
        await reader.cancel();
        return Response.json(
          { error: "Réponse trop volumineuse." },
          { status: 413 },
        );
      }
      chunks.push(value);
    }
    let data: unknown;
    try {
      data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return Response.json(
        { error: "Les données transmises sont invalides." },
        { status: 400 },
      );
    }
    if (!validateSubmission(data))
      return Response.json(
        {
          error:
            "Veuillez répondre à toutes les affirmations et vérifier les informations du formulaire.",
        },
        { status: 400 },
      );
    const id = await saveSubmission(data);
    return Response.json(
      { url: `/resultats/${id}` },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      {
        error:
          "L’enregistrement a échoué. Vos réponses sont conservées dans ce navigateur. Réessayez dans quelques instants.",
      },
      { status: 500 },
    );
  }
}
