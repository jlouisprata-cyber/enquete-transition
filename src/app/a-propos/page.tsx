import Header from "@/components/header";
import Link from "next/link";

export default function About() {
  return (
    <>
      <Header />
      <main className="information-page">
        <span className="section-kicker">L’ENQUÊTE</span>
        <h1>Les freins et les moteurs des transitions</h1>
        <p>
          Ce questionnaire invite les dirigeants et responsables à décrire leur
          perception de la transformation de leur organisation, en gardant une
          pratique ou un changement concret en tête.
        </p>
        <h2>41 affirmations, 14 familles</h2>
        <p>
          Chaque affirmation se note de 1 (pas du tout d’accord) à 5 (tout à
          fait d’accord). Les résultats présentent séparément les freins et les
          moteurs, par famille et par échelle : individuelle, organisationnelle,
          culturelle, politique et institutionnelle.
        </p>
        <h2>Une restitution individuelle immédiate</h2>
        <p>
          Après le questionnaire, renseignez votre fonction, votre secteur et la
          taille de votre entreprise. L’email est facultatif et sert uniquement
          à demander les résultats globaux de l’enquête. Il n’est pas nécessaire
          pour consulter votre restitution.
        </p>
        <h2>Source et limites</h2>
        <p>
          Ce questionnaire est fondé sur le tome 1 des contributions scientifiques
          du GIECo. Les 14 familles sont une proposition de classement, pas une
          taxonomie validée par les chercheurs du GIECo. Les scores reflètent des
          perceptions afin de poser un pré-diagnostic fondé sur votre perception
          personnelle, et ne constituent pas une mesure d’efficacité.
        </p>
        <Link className="button primary" href="/">
          Accéder au questionnaire
        </Link>
      </main>
    </>
  );
}
