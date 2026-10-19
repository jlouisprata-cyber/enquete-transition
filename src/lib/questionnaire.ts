import source from "@/data/questionnaire.json";

export type AnswerMap = Record<string, number>;
export type Profile = {
  role: string;
  sector: string;
  size: string;
  email: string;
  consent: boolean;
};
export type Submission = {
  answers: AnswerMap;
  practice: string;
  profile: Profile;
};
export const questions = source;
export const families = [
  ...new Map(
    questions.map((q) => [
      q.family,
      { id: q.family, title: q.title, scale: q.scale },
    ]),
  ).values(),
];
export const scaleNames: Record<string, string> = {
  I: "Individuelle",
  O: "Organisationnelle",
  C: "Culturelle",
  P: "Politique et institutionnelle",
};
export const labels = [
  "Pas du tout d’accord",
  "Plutôt pas d’accord",
  "Partiellement",
  "Plutôt d’accord",
  "Tout à fait d’accord",
];
export const roles = [
  "Direction générale",
  "Présidence / Gérance",
  "Direction RSE / Développement durable",
  "Direction des ressources humaines",
  "Direction de service",
  "Management / Encadrement",
  "Autre fonction",
];
export const sectors = [
  "Agriculture et agroalimentaire",
  "Industrie",
  "Construction et immobilier",
  "Commerce et distribution",
  "Transport et logistique",
  "Énergie et environnement",
  "Numérique et télécommunications",
  "Banque, finance et assurance",
  "Conseil et services aux entreprises",
  "Santé et action sociale",
  "Éducation et recherche",
  "Administration publique",
  "Économie sociale et solidaire",
  "Culture, tourisme et loisirs",
  "Autre secteur",
];
export const sizes = [
  "Indépendant / Sans salarié",
  "1 à 9 salariés",
  "10 à 49 salariés",
  "50 à 249 salariés",
  "250 à 999 salariés",
  "1 000 salariés et plus",
];

export function classify(brakes: number, drivers: number) {
  if (brakes >= 3.5) return drivers < 3 ? "Priorité" : "Tension";
  if (drivers >= 3.5 && brakes < 3) return "Appui";
  return "Intermédiaire";
}

export function calculate(answers: AnswerMap) {
  return families.map((family) => {
    const group = questions.filter((q) => q.family === family.id);
    const average = (type: string) => {
      const subset = group.filter((q) => q.type === type);
      return (
        subset.reduce((total, q) => total + answers[q.id], 0) / subset.length
      );
    };
    const brakes = average("Frein");
    const drivers = average("Moteur");
    return { ...family, brakes, drivers, status: classify(brakes, drivers) };
  });
}

export function validateSubmission(value: unknown): value is Submission {
  if (!value || typeof value !== "object") return false;
  const data = value as Submission;
  if (
    !data.answers ||
    typeof data.answers !== "object" ||
    Array.isArray(data.answers)
  )
    return false;
  if (Object.keys(data.answers).length !== questions.length) return false;
  if (
    !questions.every(
      (q) =>
        Number.isInteger(data.answers[q.id]) &&
        data.answers[q.id] >= 1 &&
        data.answers[q.id] <= 5,
    )
  )
    return false;
  if (
    typeof data.practice !== "string" ||
    !data.practice.trim() ||
    data.practice.length > 500
  )
    return false;
  const p = data.profile;
  if (
    !p ||
    !roles.includes(p.role) ||
    !sectors.includes(p.sector) ||
    !sizes.includes(p.size)
  )
    return false;
  if (
    typeof p.email !== "string" ||
    p.email.length > 254 ||
    typeof p.consent !== "boolean"
  )
    return false;
  if (p.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email) || !p.consent))
    return false;
  return !p.consent || !!p.email;
}
