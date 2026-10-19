import Header from "@/components/header";
import Link from "next/link";

export default function Privacy() {
  return (
    <>
      <Header />
      <main className="information-page">
        <span className="section-kicker">VOS DONNÉES</span>
        <h1>Confidentialité</h1>
        <p>
          Cette version locale du questionnaire fonctionne sans inscription,
          sans outil de mesure d’audience et sans cookie publicitaire.
        </p>
        <h2>Ce qui est enregistré</h2>
        <p>
          Les réponses aux 41 affirmations, le changement visé, la fonction, le
          secteur d’activité, la taille de l’entreprise et la date de réponse
          sont enregistrés sur le serveur de l’application. Ne saisissez pas
          d’informations confidentielles ou de noms de personnes dans le champ
          libre.
        </p>
        <h2>Votre email reste facultatif</h2>
        <p>
          Si vous renseignez une adresse email et donnez votre accord, elle est
          conservée avec votre demande de recevoir les résultats globaux de
          l’enquête. Aucun envoi automatique n’est activé dans cette version
          locale. L’adresse n’apparaît ni dans la restitution ni dans son
          export.
        </p>
        <h2>Reprendre le questionnaire</h2>
        <p>
          Votre progression est conservée dans le stockage local de ce
          navigateur. L’email et le consentement ne sont pas conservés dans ce
          brouillon. Vous pouvez effacer le brouillon avec « Recommencer » ou
          dans les réglages du navigateur. Le brouillon est supprimé après
          l’enregistrement réussi de la réponse.
        </p>
        <h2>Votre lien personnel</h2>
        <p>
          Un lien aléatoire donne accès à votre restitution sans compte. Toute
          personne possédant ce lien peut la consulter. Conservez-le pour vous ;
          les restitutions sont exclues de l’indexation par les moteurs de
          recherche.
        </p>
        <h2>Avant l’ouverture publique</h2>
        <p>
          Cette application est actuellement préparée pour un usage local.
          L’organisateur devra préciser ici son identité, un contact pour les
          demandes d’accès et de suppression, la durée de conservation ainsi que
          les conditions d’hébergement avant le lancement public de l’enquête.
        </p>
        <Link className="button secondary" href="/">
          Retour au questionnaire
        </Link>
      </main>
    </>
  );
}
