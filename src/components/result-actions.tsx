"use client";

import { useState } from "react";
import { Check, Copy, Download, Printer } from "lucide-react";
import {
  calculate,
  questions,
  scaleNames,
  type AnswerMap,
} from "@/lib/questionnaire";

export default function ResultActions({ answers, id }: { answers: AnswerMap; id: string }) {
  const [message, setMessage] = useState("");
  const [downloading, setDownloading] = useState(false);
  async function downloadPdf() {
    setDownloading(true);
    setMessage("Préparation de votre PDF…");
    try {
      const response = await fetch(`/api/results/${id}/pdf`, { cache: "no-store" });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf"))
        throw new Error("PDF indisponible");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "ma-restitution-transitions.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage("Votre PDF est prêt.");
    } catch {
      setMessage("Le PDF n’a pas pu être généré. Réessayez ou utilisez le bouton Imprimer.");
    } finally {
      setDownloading(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("Lien personnel copié");
    } catch {
      setMessage(
        "Copiez l’adresse de cette page pour retrouver vos résultats.",
      );
    }
  }
  function download() {
    const results = calculate(answers);
    const rows: (string | number)[][] = [
      ["Échelle de lecture", "Famille", "Freins / 5", "Moteurs / 5", "Lecture"],
      ...Object.entries(scaleNames).flatMap(([code, name]) =>
        results
          .filter((r) => r.scale === code)
          .map((r) => [
            name,
            r.title,
            r.brakes.toFixed(2),
            r.drivers.toFixed(2),
            r.status,
          ]),
      ),
      [],
      ["Affirmation", "Type", "Réponse / 5"],
      ...questions.map((q) => [q.text, q.type, answers[q.id]]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
            .join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "ma-restitution-transitions.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="result-actions no-print">
      <button className="button primary" onClick={downloadPdf} disabled={downloading} aria-busy={downloading}>
        <Download size={16} /> {downloading ? "Préparation du PDF…" : "Télécharger ma restitution (PDF)"}
      </button>
      <button className="button secondary" onClick={() => window.print()}>
        <Printer size={16} /> Imprimer
      </button>
      <button className="button secondary" onClick={download}>
        <Download size={16} /> Télécharger les scores
      </button>
      <button className="button secondary" onClick={copy}>
        {message === "Lien personnel copié" ? (
          <Check size={16} />
        ) : (
          <Copy size={16} />
        )}{" "}
        Copier mon lien
      </button>
      <span role="status">{message}</span>
    </div>
  );
}
