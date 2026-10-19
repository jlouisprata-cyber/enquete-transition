import { calculate, families, questions, scaleNames } from "./questionnaire";
import type { SavedSubmission } from "./storage";

type Cell = string | number;
const statuses = ["Priorité", "Tension", "Appui", "Intermédiaire"];
const orderedFamilies = Object.keys(scaleNames).flatMap((code) =>
  families.filter((family) => family.scale === code),
);

export const exportHeaders = [
  "Identifiant de la réponse",
  "Date de réponse (UTC, format ISO 8601)",
  "Date de réponse (heure de Paris)",
  "Pratique ou changement visé",
  "Fonction du répondant",
  "Secteur d’activité",
  "Taille de l’entreprise",
  "Adresse email (facultative)",
  "Accord pour recevoir les résultats par email",
  ...questions.map(
    (q, index) =>
      `Q${String(index + 1).padStart(2, "0")} [${q.id}] - ${q.title} - ${q.type} - ${q.text} (note de 1 à 5)`,
  ),
  ...orderedFamilies.flatMap((family) => [
    `${scaleNames[family.scale]} - ${family.title} [${family.id}] - Moyenne des freins (sur 5)`,
    `${scaleNames[family.scale]} - ${family.title} [${family.id}] - Moyenne des moteurs (sur 5)`,
    `${scaleNames[family.scale]} - ${family.title} [${family.id}] - Catégorie de restitution`,
  ]),
  ...Object.values(scaleNames).flatMap((name) => [
    `Échelle ${name.toLocaleLowerCase("fr")} - Moyenne des freins (sur 5, moyenne des familles)`,
    `Échelle ${name.toLocaleLowerCase("fr")} - Moyenne des moteurs (sur 5, moyenne des familles)`,
  ]),
  ...statuses.map((status) => `Nombre de familles : ${status}`),
  "Nombre d’affirmations renseignées",
  "Seuil haut utilisé pour la restitution",
  "Seuil bas utilisé pour la restitution",
];

export function csvCell(value: Cell) {
  let text =
    typeof value === "number"
      ? Number.isFinite(value)
        ? String(value).replace(".", ",")
        : ""
      : value;
  // Quoting alone does not prevent a spreadsheet from executing a formula.
  const firstVisible = text.trimStart().charAt(0);
  if (
    typeof value === "string" &&
    ((firstVisible !== "" && "=+@-".includes(firstVisible)) ||
      text.charCodeAt(0) < 32 ||
      firstVisible.charCodeAt(0) < 32)
  )
    text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function exportRow(record: SavedSubmission): Cell[] {
  const results = calculate(record.answers);
  return [
    record.id,
    record.createdAt,
    new Date(record.createdAt).toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
    }),
    record.practice,
    record.profile.role,
    record.profile.sector,
    record.profile.size,
    record.profile.email,
    record.profile.consent ? "Oui" : "Non",
    ...questions.map((q) => record.answers[q.id]),
    ...Object.keys(scaleNames).flatMap((code) =>
      results
        .filter((r) => r.scale === code)
        .flatMap((r) => [r.brakes, r.drivers, r.status]),
    ),
    ...Object.keys(scaleNames).flatMap((code) => {
      const subset = results.filter((r) => r.scale === code);
      return [
        subset.reduce((total, r) => total + r.brakes, 0) / subset.length,
        subset.reduce((total, r) => total + r.drivers, 0) / subset.length,
      ];
    }),
    ...statuses.map(
      (status) => results.filter((r) => r.status === status).length,
    ),
    questions.filter((q) => Number.isInteger(record.answers[q.id])).length,
    3.5,
    3,
  ];
}

export function createSurveyCsv(records: SavedSubmission[]) {
  const rows = [exportHeaders, ...records.map(exportRow)];
  return (
    "\uFEFF" +
    rows.map((row) => row.map(csvCell).join(";")).join("\r\n") +
    "\r\n"
  );
}
