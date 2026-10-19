"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  CircleHelp,
  Clock3,
  Leaf,
  LockKeyhole,
  Mail,
  RotateCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import Header from "./header";
import {
  families,
  labels,
  questions,
  roles,
  scaleNames,
  sectors,
  sizes,
  type AnswerMap,
  type Profile,
} from "@/lib/questionnaire";

const KEY = "transitions-survey-v1";
const emptyProfile: Profile = {
  role: "",
  sector: "",
  size: "",
  email: "",
  consent: false,
};
type Draft = {
  answers: AnswerMap;
  step: number;
  practice: string;
  profile: Profile;
};
function readDraft(): Draft {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "null");
    if (
      data &&
      typeof data.answers === "object" &&
      data.answers &&
      !Array.isArray(data.answers) &&
      typeof data.practice === "string"
    ) {
      const answers = Object.fromEntries(
        questions
          .filter(
            (q) =>
              Number.isInteger(data.answers[q.id]) &&
              data.answers[q.id] >= 1 &&
              data.answers[q.id] <= 5,
          )
          .map((q) => [q.id, data.answers[q.id]]),
      );
      return {
        answers,
        practice: data.practice.slice(0, 500),
        step: Math.max(0, Math.min(14, Math.floor(Number(data.step) || 0))),
        profile: {
          ...emptyProfile,
          role: data.profile?.role || "",
          sector: data.profile?.sector || "",
          size: data.profile?.size || "",
        },
      };
    }
  } catch {
    /* A draft is optional when browser storage is unavailable. */
  }
  return { answers: {}, step: 0, practice: "", profile: emptyProfile };
}
const subscribe = () => () => {};

export default function Questionnaire() {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return (
    <>
      <Header />
      {mounted ? (
        <Survey />
      ) : (
        <main className="loading-state" aria-busy="true">
          Chargement du questionnaire…
        </main>
      )}
    </>
  );
}

function Survey() {
  const [draft, setDraft] = useState<Draft>(readDraft);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [confirmReset, setConfirmReset] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const practiceInput = useRef<HTMLTextAreaElement>(null);
  const { answers, step, practice, profile } = draft;
  const count = Object.keys(answers).length;
  const family = families[Math.min(step, 13)];
  const group = questions.filter((q) => q.family === family.id);
  const final = step === 14;
  const complete = group.every((q) => !!answers[q.id]);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const safeDraft = {
          ...draft,
          profile: { ...draft.profile, email: "", consent: false },
        };
        localStorage.setItem(KEY, JSON.stringify(safeDraft));
        setStorageOk(true);
      } catch {
        setStorageOk(false);
      }
    });
    return () => {
      active = false;
    };
  }, [draft]);

  function go(next: number) {
    setDraft((old) => ({ ...old, step: next }));
    setError("");
    content.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function checkPractice() {
    if (practice.trim()) return true;
    go(0);
    setError(
      "Précisez la pratique ou le changement que vous avez en tête avant de continuer.",
    );
    requestAnimationFrame(() => practiceInput.current?.focus());
    return false;
  }
  function next() {
    if (!checkPractice()) return;
    if (!complete) {
      setError(
        "Sélectionnez une réponse pour chaque affirmation avant de continuer.",
      );
      document.getElementById(group.find((q) => !answers[q.id])!.id)?.focus();
      return;
    }
    go(step + 1);
  }
  function updateProfile(key: keyof Profile, value: string | boolean) {
    setDraft((old) => ({ ...old, profile: { ...old.profile, [key]: value } }));
  }
  function answer(id: string, value: number) {
    setDraft((old) => ({ ...old, answers: { ...old.answers, [id]: value } }));
    setError("");
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!checkPractice()) return;
    const missing = families.findIndex((f) =>
      questions.some((q) => q.family === f.id && !answers[q.id]),
    );
    if (missing !== -1) {
      go(missing);
      setError("Il reste des affirmations sans réponse dans cette rubrique.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      try {
        localStorage.removeItem(KEY);
      } catch {
        /* Saving on the server succeeded. */
      }
      window.location.assign(data.url);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Connexion interrompue. Réessayez pour enregistrer vos réponses.",
      );
      setSaving(false);
    }
  }

  return (
    <>
      <section className="survey-banner">
        <div className="banner-inner">
          <div className="eyebrow">
            <span /> REGARDS SUR LE CHANGEMENT
          </div>
          <h1>
            Les freins et les moteurs
            <br />
            des transitions
          </h1>
          <p>
            Quel regard portez-vous sur la transformation de votre organisation
            ?
          </p>
          <div className="banner-meta">
            <span>
              <Clock3 size={15} /> 10 à 15 minutes
            </span>
            <span>
              <CheckCheck size={16} /> 41 affirmations
            </span>
            <span>
              <LockKeyhole size={14} /> Sans inscription
            </span>
          </div>
        </div>
        <span className="photo-credit">
          Travail collectif · Photo : Unsplash
        </span>
      </section>
      <div className="survey-layout">
        <main className="question-main" ref={content}>
          {step === 0 && (
            <label className="practice-field">
              <span>
                La pratique ou le changement que vous avez en tête{" "}
                <span className="required">*</span>
              </span>
              <textarea
                ref={practiceInput}
                value={practice}
                required
                maxLength={500}
                rows={2}
                onChange={(event) => {
                  setDraft({ ...draft, practice: event.target.value });
                  setError("");
                }}
                placeholder="Ex. : réduire les déplacements professionnels"
              />
            </label>
          )}
          <div className="progress-line">
            <span>Votre progression</span>
            <strong>
              {count}
              <span> / 41 réponses</span>
            </strong>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-valuenow={count}
            aria-valuemin={0}
            aria-valuemax={41}
            aria-label="Affirmations complétées"
          >
            <div style={{ width: `${(count / 41) * 100}%` }} />
          </div>
          {final ? (
            <>
              <div className="section-heading">
                <span className="section-kicker">DERNIÈRE ÉTAPE</span>
                <h2>
                  Un peu de contexte, avant
                  <br className="desktop-break" /> votre restitution.
                </h2>
                <p>
                  Ces informations permettent de mieux comprendre les réponses à
                  l’enquête.
                </p>
              </div>
              <form onSubmit={submit} className="profile-form">
                <div className="form-grid">
                  <label>
                    Votre fonction <span className="required">*</span>
                    <select
                      required
                      value={profile.role}
                      onChange={(e) => updateProfile("role", e.target.value)}
                    >
                      <option value="">Sélectionner votre fonction</option>
                      {roles.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Votre secteur d’activité <span className="required">*</span>
                    <select
                      required
                      value={profile.sector}
                      onChange={(e) => updateProfile("sector", e.target.value)}
                    >
                      <option value="">Sélectionner un secteur</option>
                      {sectors.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  La taille de votre entreprise{" "}
                  <span className="required">*</span>
                  <select
                    required
                    value={profile.size}
                    onChange={(e) => updateProfile("size", e.target.value)}
                  >
                    <option value="">Sélectionner un effectif</option>
                    {sizes.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <div className="email-section">
                  <div className="email-heading">
                    <Mail size={20} />
                    <div>
                      <h3>Recevoir les résultats de l’enquête</h3>
                      <p>
                        les données individuelles ne sont accessibles que par
                        vous : l&apos;email ne sera utilisé que pour vous
                        envoyer les résultats de l&apos;enquête
                      </p>
                    </div>
                  </div>
                  <label>
                    Votre adresse email{" "}
                    <span className="optional">Facultatif</span>
                    <input
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      value={profile.email}
                      placeholder="vous@entreprise.fr"
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          profile: {
                            ...profile,
                            email: e.target.value,
                            consent: e.target.value ? profile.consent : false,
                          },
                        })
                      }
                    />
                  </label>
                  {profile.email && (
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        required
                        checked={profile.consent}
                        onChange={(e) =>
                          updateProfile("consent", e.target.checked)
                        }
                      />
                      <span>
                        J’accepte d’être contacté à cette adresse uniquement
                        pour recevoir les résultats globaux de cette enquête
                        lorsqu’ils seront disponibles.
                      </span>
                    </label>
                  )}
                </div>
                <p className="privacy-note">
                  <ShieldCheck size={17} />
                  <span>
                    Vos réponses sont enregistrées pour cette enquête. Votre
                    email éventuel n’apparaît pas dans la restitution.{" "}
                    <a href="/confidentialite" target="_blank" rel="noreferrer">
                      Confidentialité
                    </a>
                  </span>
                </p>
                {error && (
                  <p className="error-message" role="alert">
                    {error}
                  </p>
                )}
                <div className="navigation">
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => go(13)}
                    disabled={saving}
                  >
                    <ArrowLeft size={16} /> Retour
                  </button>
                  <button
                    className="button primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving
                      ? "Enregistrement…"
                      : "Terminer et voir ma restitution"}
                    <ArrowRight size={17} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="section-heading">
                <div className="section-topline">
                  <span className="section-kicker">
                    FAMILLE {String(step + 1).padStart(2, "0")} / 14
                  </span>
                  <span className="scale-badge">
                    Échelle {scaleNames[family.scale].toLocaleLowerCase("fr")}
                  </span>
                </div>
                <h2>{family.title}</h2>
                <p>
                  Dans quelle mesure ces affirmations décrivent-elles votre
                  organisation aujourd’hui ?
                </p>
              </div>
              {step > 0 && practice && (
                <div className="practice-reminder">
                  <Leaf size={15} />
                  <span>
                    Votre changement : <strong>{practice}</strong>
                  </span>
                </div>
              )}
              <div className="scale-guide">
                <span>
                  1 <span>Pas du tout d’accord</span>
                </span>
                <span className="guide-line" />
                <span>
                  <span>Tout à fait d’accord</span> 5
                </span>
                <button
                  onClick={() => setMethodOpen(!methodOpen)}
                  aria-label="Comprendre l’échelle de réponse"
                  title="Comprendre l’échelle de réponse"
                  aria-expanded={methodOpen}
                >
                  <CircleHelp size={17} />
                </button>
              </div>
              {methodOpen && (
                <div className="method-note">
                  Choisissez une valeur de 1 à 5 : 1 = pas du tout d’accord, 2 =
                  plutôt pas d’accord, 3 = partiellement, 4 = plutôt d’accord, 5
                  = tout à fait d’accord. Répondez selon votre perception
                  actuelle, en gardant le changement visé en tête.
                </div>
              )}
              <div className="questions">
                {group.map((q, index) => (
                  <fieldset
                    key={q.id}
                    id={q.id}
                    tabIndex={-1}
                    className={`question ${answers[q.id] ? "answered" : ""}`}
                  >
                    <legend>
                      <span className="question-index">
                        {String(questions.indexOf(q) + 1).padStart(2, "0")}
                      </span>
                      <span id={`${q.id}-label`}>{q.text}</span>
                      {!!answers[q.id] && (
                        <Check size={16} className="answer-check" />
                      )}
                    </legend>
                    <div
                      className={`slider-response ${answers[q.id] ? "has-answer" : ""}`}
                    >
                      <output
                        className="slider-value"
                        htmlFor={`${q.id}-slider`}
                        aria-live="polite"
                      >
                        {answers[q.id]
                          ? `${answers[q.id]} / 5 · ${labels[answers[q.id] - 1]}`
                          : "Sans réponse"}
                      </output>
                      <input
                        id={`${q.id}-slider`}
                        className="answer-slider"
                        type="range"
                        name={q.id}
                        min={1}
                        max={5}
                        step={1}
                        value={answers[q.id] ?? 3}
                        aria-labelledby={`${q.id}-label`}
                        aria-valuetext={
                          answers[q.id]
                            ? `${answers[q.id]} sur 5 : ${labels[answers[q.id] - 1]}`
                            : "Sans réponse, curseur sur 3 : Partiellement"
                        }
                        onChange={(event) =>
                          answer(q.id, Number(event.target.value))
                        }
                        onPointerUp={(event) =>
                          answer(q.id, Number(event.currentTarget.value))
                        }
                        onKeyDown={(event) => {
                          if (event.key === " " || event.key === "Enter") {
                            event.preventDefault();
                            answer(q.id, Number(event.currentTarget.value));
                          }
                        }}
                      />
                      <div className="slider-ticks" aria-hidden="true">
                        {labels.map((label, i) => (
                          <span key={label}>
                            <span>{i + 1}</span>
                            <span>{label}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                    <span className="sr-only">
                      Affirmation {index + 1} sur {group.length} dans cette
                      rubrique
                    </span>
                  </fieldset>
                ))}
              </div>
              {error && (
                <p className="error-message" role="alert">
                  {error}
                </p>
              )}
              <div className="navigation">
                <button
                  className="button secondary"
                  disabled={step === 0}
                  onClick={() => go(step - 1)}
                >
                  <ArrowLeft size={16} /> Précédent
                </button>
                <span className="section-count">
                  {group.filter((q) => !!answers[q.id]).length} / {group.length}{" "}
                  réponses
                </span>
                <button className="button primary" onClick={next}>
                  {step === 13 ? "Mon profil" : "Continuer"}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          )}
          <div className="save-status">
            <Save size={14} />
            <span>
              {storageOk
                ? "Progression enregistrée sur cet appareil"
                : "Sauvegarde locale indisponible : gardez cette page ouverte."}
            </span>
            <button
              onClick={() => setConfirmReset(true)}
              title="Recommencer le questionnaire"
            >
              <RotateCcw size={13} />
              <span>Recommencer</span>
            </button>
          </div>
        </main>
      </div>
      <footer className="site-footer">
        <span>Transitions · Enquête dirigeants</span>
        <span>
          14 familles de lecture issues de l’analyse du tome 1 du GIECo
        </span>
        <a href="/confidentialite">Confidentialité</a>
      </footer>
      {confirmReset && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            className="modal"
          >
            <h2 id="reset-title">Recommencer le questionnaire ?</h2>
            <p>Les réponses de ce parcours seront effacées sur cet appareil.</p>
            <div className="navigation">
              <button
                className="button secondary"
                autoFocus
                onClick={() => setConfirmReset(false)}
              >
                Annuler
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setDraft({
                    answers: {},
                    step: 0,
                    practice: "",
                    profile: emptyProfile,
                  });
                  setError("");
                  setConfirmReset(false);
                }}
              >
                Recommencer
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
