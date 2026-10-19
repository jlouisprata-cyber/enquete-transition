import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  CircleHelp,
  Flag,
  ShieldCheck,
  Sprout,
  Waves,
} from "lucide-react";
import Header from "@/components/header";
import ResultActions from "@/components/result-actions";
import { calculate, scaleNames } from "@/lib/questionnaire";
import { getSubmission } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Votre restitution | Transitions",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
const descriptions: Record<string, string> = {
  Priorité:
    "Un frein marqué, avec des moteurs encore peu présents. Une piste à explorer en priorité.",
  Tension:
    "Des freins marqués coexistent avec des moteurs. Consolidez les appuis tout en travaillant les obstacles.",
  Appui:
    "Des moteurs bien présents et des freins contenus. Une ressource sur laquelle vous appuyer.",
  Intermédiaire:
    "Une situation nuancée, à approfondir avec vos équipes et à suivre dans le temps.",
};
const statusClass: Record<string, string> = {
  Priorité: "priority",
  Tension: "tension",
  Appui: "support",
  Intermédiaire: "middle",
};
const format = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

function ScoreBars({ brakes, drivers }: { brakes: number; drivers: number }) {
  return (
    <>
      <div className="bar-line">
        <span>Freins</span>
        <div className="bar-track" aria-hidden="true">
          <div
            className="brake-bar"
            style={{ width: `${(brakes / 5) * 100}%` }}
          />
        </div>
        <strong>{format(brakes)}</strong>
      </div>
      <div className="bar-line">
        <span>Moteurs</span>
        <div className="bar-track" aria-hidden="true">
          <div
            className="driver-bar"
            style={{ width: `${(drivers / 5) * 100}%` }}
          />
        </div>
        <strong>{format(drivers)}</strong>
      </div>
    </>
  );
}

export default async function ResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const record = await getSubmission(id);
  if (!record) notFound();
  const results = calculate(record.answers);
  const priority = results.filter((r) => r.status === "Priorité");
  const supports = results.filter((r) => r.status === "Appui");
  const tensions = results.filter((r) => r.status === "Tension");
  const focus = [...results]
    .sort((a, b) => b.brakes - a.brakes || a.drivers - b.drivers)
    .slice(0, 3);
  const strengths = [...results]
    .sort((a, b) => b.drivers - a.drivers || a.brakes - b.brakes)
    .slice(0, 3);
  return (
    <>
      <Header />
      <main className="results-main">
        <div className="completion-label">
          <Check size={15} /> QUESTIONNAIRE TERMINÉ
        </div>
        <div className="result-title">
          <div>
            <h1>Votre regard sur la transition.</h1>
            <p>
              Une photographie de vos perceptions, pour ouvrir le dialogue et
              passer à l’action.
            </p>
          </div>
          <span className="result-date">
            {new Date(record.createdAt).toLocaleDateString("fr-FR", {
              timeZone: "Europe/Paris",
            })}
          </span>
        </div>
        <div className="result-context">
          <Sprout size={22} />
          <div>
            <span>LE CHANGEMENT QUE VOUS AVEZ EN TÊTE</span>
            <p>{record.practice}</p>
          </div>
        </div>
        <ResultActions answers={record.answers} />
        <section
          className="result-overview"
          aria-label="Synthèse de vos résultats"
        >
          <div>
            <Flag size={22} />
            <strong>{priority.length}</strong>
            <span>famille{priority.length > 1 ? "s" : ""} en priorité</span>
          </div>
          <div>
            <Waves size={22} />
            <strong>{tensions.length}</strong>
            <span>famille{tensions.length > 1 ? "s" : ""} en tension</span>
          </div>
          <div>
            <Sprout size={22} />
            <strong>{supports.length}</strong>
            <span>point{supports.length > 1 ? "s" : ""} d’appui</span>
          </div>
          <div>
            <CircleHelp size={22} />
            <strong>
              {results.filter((r) => r.status === "Intermédiaire").length}
            </strong>
            <span>
              situation
              {results.filter((r) => r.status === "Intermédiaire").length > 1
                ? "s"
                : ""}{" "}
              intermédiaire
              {results.filter((r) => r.status === "Intermédiaire").length > 1
                ? "s"
                : ""}
            </span>
          </div>
        </section>
        <section className="interpretation">
          <div>
            <span className="section-kicker">
              <ArrowDownRight size={15} /> VOS FREINS LES PLUS MARQUÉS
            </span>
            <h2>Des sujets à mettre en discussion</h2>
            {focus.map((r) => (
              <div className="insight-row" key={r.id}>
                <span>{r.title}</span>
                <strong className="brake-text">
                  {format(r.brakes)}
                  <small> / 5</small>
                </strong>
              </div>
            ))}
            <p>
              Commencez par explorer un obstacle concret avec les personnes
              concernées, puis testez une action à petite échelle.
            </p>
          </div>
          <div>
            <span className="section-kicker">
              <ArrowUpRight size={15} /> VOS MOTEURS LES PLUS PRÉSENTS
            </span>
            <h2>Des ressources à mobiliser</h2>
            {strengths.map((r) => (
              <div className="insight-row" key={r.id}>
                <span>{r.title}</span>
                <strong className="driver-text">
                  {format(r.drivers)}
                  <small> / 5</small>
                </strong>
              </div>
            ))}
            <p>
              Identifiez les pratiques et les personnes derrière ces moteurs
              pour comprendre comment les consolider.
            </p>
          </div>
        </section>
        <section className="scale-results">
          <div className="results-section-heading">
            <h2>Les quatre échelles de lecture</h2>
            <span className="chart-key">
              <i className="brake-key" /> Freins <i className="driver-key" />{" "}
              Moteurs
            </span>
          </div>
          <div className="scales-grid">
            {Object.entries(scaleNames).map(([code, name]) => {
              const subset = results.filter((r) => r.scale === code);
              const brakes =
                subset.reduce((sum, r) => sum + r.brakes, 0) / subset.length;
              const drivers =
                subset.reduce((sum, r) => sum + r.drivers, 0) / subset.length;
              return (
                <div className="scale-result" key={code}>
                  <h3>{name}</h3>
                  <ScoreBars brakes={brakes} drivers={drivers} />
                </div>
              );
            })}
          </div>
          <p className="small-note">
            Moyenne des familles rattachées à chaque échelle, sur 5. Les deux
            scores restent distincts.
          </p>
        </section>
        <section className="family-results">
          <div className="results-section-heading">
            <h2>Vos résultats, famille par famille</h2>
            <span>Scores sur 5</span>
          </div>
          {Object.entries(scaleNames).map(([code, name]) => {
            const subset = results.filter((result) => result.scale === code);
            return (
              <section
                className="family-scale-group"
                key={code}
                aria-labelledby={`family-scale-${code}`}
              >
                <div className="family-scale-heading">
                  <h3 id={`family-scale-${code}`}>{name}</h3>
                  <span>{subset.length} familles</span>
                </div>
                <div className="scales-grid">
                  {subset.map((r) => (
                    <article
                      key={r.id}
                      className="family-score"
                      aria-labelledby={`family-title-${r.id}`}
                    >
                      <div className="family-score-title">
                        <h4 id={`family-title-${r.id}`}>{r.title}</h4>
                        <span
                          className={`status-badge ${statusClass[r.status]}`}
                        >
                          {r.status}
                        </span>
                      </div>
                      <ScoreBars brakes={r.brakes} drivers={r.drivers} />
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
          <div className="reading-legend">
            {Object.entries(descriptions).map(([label, text]) => (
              <div key={label}>
                <span className={`status-badge ${statusClass[label]}`}>
                  {label}
                </span>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>
        <aside className="methodology">
          <ShieldCheck size={22} />
          <div>
            <h2>Une lecture à prendre avec recul</h2>
            <p>
              Ces scores traduisent votre perception, pas une mesure
              d’efficacité ni un niveau de preuve. Les 14 familles sont une
              proposition de classement issue d’une analyse du tome 1 du GIECo,
              et ne constituent pas une taxonomie validée par le GIECo.
            </p>
            <p>
              Seuil haut : 3,5 ; seuil bas : 3. Priorité : freins ≥ 3,5 et
              moteurs &lt; 3. Tension : freins ≥ 3,5 et moteurs ≥ 3. Appui :
              moteurs ≥ 3,5 et freins &lt; 3. Les autres situations sont
              intermédiaires.
            </p>
          </div>
        </aside>
        <p className="personal-link-note no-print">
          Conservez votre lien personnel pour retrouver cette restitution. Toute
          personne disposant de ce lien peut la consulter ; votre email n’y est
          pas affiché.
        </p>
        <Link className="text-link no-print" href="/">
          Revenir au questionnaire <ArrowUpRight size={15} />
        </Link>
      </main>
    </>
  );
}
