import Header from "@/components/header";
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="information-page">
        <h1>Restitution introuvable</h1>
        <p>
          Ce lien personnel est incomplet ou ne correspond à aucune réponse
          enregistrée.
        </p>
        <Link className="button primary" href="/">
          Accéder au questionnaire
        </Link>
      </main>
    </>
  );
}
