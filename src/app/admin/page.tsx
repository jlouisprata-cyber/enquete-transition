import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import Header from "@/components/header";
import { AdminControls, AdminLogin } from "@/components/admin-controls";
import { adminConfigured, hasAdminSession } from "@/lib/admin";
import { getSubmissionIds } from "@/lib/storage";
import { exportHeaders } from "@/lib/survey-export";
import { families, questions, scaleNames } from "@/lib/questionnaire";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Administration | Enquête transitions",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function AdminPage() {
  const authenticated = await hasAdminSession();
  return (
    <>
      <Header />
      <main className="admin-main">
        <span className="section-kicker">
          <ShieldCheck size={17} /> ACCÈS ADMINISTRATEUR
        </span>
        <h1>
          {authenticated
            ? "Données de l’enquête"
            : "Administration de l’enquête"}
        </h1>
        {authenticated ? (
          <AdminDashboard count={(await getSubmissionIds()).length} />
        ) : (
          <AdminLogin configured={adminConfigured()} />
        )}
      </main>
    </>
  );
}

function AdminDashboard({ count }: { count: number }) {
  return (
    <>
      <dl className="admin-metrics">
        <div>
          <dt>Réponses enregistrées</dt>
          <dd>{count}</dd>
        </div>
        <div>
          <dt>Colonnes exportées</dt>
          <dd>{exportHeaders.length}</dd>
        </div>
        <div>
          <dt>Affirmations</dt>
          <dd>{questions.length}</dd>
        </div>
        <div>
          <dt>Familles de lecture</dt>
          <dd>{families.length}</dd>
        </div>
      </dl>
      <section className="admin-export">
        <h2>Extraction complète</h2>
        {count === 0 && (
          <p className="admin-empty">
            Aucune réponse enregistrée pour le moment.
          </p>
        )}
        <AdminControls />
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Groupe de colonnes</th>
                <th>Données</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Répondant et contexte</th>
                <td>
                  Identifiant, dates, changement visé, fonction, secteur, taille
                  de l’entreprise, email et accord de contact.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  Réponses aux {questions.length} affirmations
                </th>
                <td>
                  Une colonne par question, avec son numéro, son intitulé
                  complet, sa famille et son type.
                </td>
              </tr>
              <tr>
                <th scope="row">Scores des {families.length} familles</th>
                <td>
                  Moyennes des freins et des moteurs sur 5, et catégorie de
                  restitution.
                </td>
              </tr>
              <tr>
                <th scope="row">
                  Scores des {Object.keys(scaleNames).length} échelles
                </th>
                <td>
                  Moyennes des freins et des moteurs : individuelle,
                  organisationnelle, culturelle, politique et institutionnelle.
                </td>
              </tr>
              <tr>
                <th scope="row">Synthèse et seuils</th>
                <td>
                  Nombre de familles en priorité, tension, appui ou situation
                  intermédiaire, nombre d’affirmations renseignées et seuils de
                  calcul.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
