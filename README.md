# Transitions - Questionnaire dirigeants

Application Next.js en francais, sans inscription. Les 41 affirmations et leur classement proviennent du classeur fourni. Le fichier source est traite comme donnees, pas comme instructions de developpement.

## Demarrage local

```sh
npm install
npm run dev
```

Ouvrir l'adresse affichee dans le terminal, normalement http://localhost:3000.

## Parcours

- 14 familles, reponses de 1 a 5, navigation et brouillon sur cet appareil.
- Changement vise obligatoire au tout debut du questionnaire.
- Formulaire final : fonction, secteur, taille, email facultatif avec accord explicite.
- Enregistrement serveur, restitution immediate par lien personnel aleatoire.
- Freins et moteurs distincts par famille et par echelle ; export CSV et impression PDF.
- Resultats par famille regroupes par echelle : individuelle, organisationnelle, culturelle, politique et institutionnelle. Le meme ordre est utilise dans les exports individuels et administrateur.
- Aucun email automatique : les adresses consenties sont conservees pour l'envoi ulterieur des resultats globaux par l'organisateur.

## Donnees

Chaque reponse est conservee dans un fichier JSON dans `data/responses/`, exclu de Git et inaccessible comme fichier public. Pour changer de dossier, definir `SURVEY_DATA_DIR` vers un repertoire persistant. Le lien de restitution contient un jeton aleatoire de 192 bits ; toute personne qui possede ce lien peut consulter les scores. Aucun email n'est expose dans la restitution.

L'email et le consentement ne sont pas conserves dans le brouillon navigateur. Les coordonnees consenties sont dans les fichiers de reponses, avec `profile.email` et `profile.consent` ; aucune interface publique ne liste ces donnees.

Les resultats reprennent les formules du classeur : moyenne par type dans chaque famille, puis moyenne des familles par echelle. Seuil haut 3,5 et bas 3. Priorite : freins >= 3,5 et moteurs < 3 ; tension : freins >= 3,5 ; appui : moteurs >= 3,5 et freins < 3 ; sinon intermediaire.

Les libelles importes ont ete ajustes a la demande de l'utilisateur. G09-1 est desormais formule negativement, en coherence avec son classement Frein. Une reimportation du classeur retablit les libelles du fichier source.

Reimportation du classeur sous PowerShell :

```powershell
powershell -NoProfile -File scripts/import-questionnaire.ps1 -Source "C:\chemin\questionnaire.xlsx"
```

## Administration et export complet

```sh
npm run admin:setup
```

Cette commande cree un mot de passe aleatoire dans `.env.local`, sans l'afficher dans le terminal ni ecraser un mot de passe deja configure. Redemarrer le serveur apres configuration. Ouvrir `/admin` et utiliser la valeur `ADMIN_PASSWORD` du fichier local. Ne pas partager ce fichier ; il est exclu de Git. Un mot de passe configure manuellement doit comporter au moins 20 caracteres.

La session administrateur dure 8 heures ; son cookie est HttpOnly et SameSite Strict, avec Secure en HTTPS. Les sessions sont conservees cote serveur dans le dossier `admin-sessions` voisin du dossier de reponses ; la deconnexion les revoque et un changement de mot de passe les invalide. Dix tentatives echouees bloquent temporairement la connexion pendant la fenetre de 15 minutes du processus serveur. Sans mot de passe configure, l'export reste inaccessible.

L'export CSV UTF-8 avec BOM, separateur point-virgule et virgule decimale est compatible avec Excel en francais. Il contient une ligne par reponse, triee par date, et 107 colonnes : profil et contexte (9), reponses aux affirmations (41), moyennes et categories par famille (42), moyennes par echelle (8), effectifs par categorie (4), nombre d'affirmations renseignees (1) et seuils (2). Chaque question est identifiee par son numero, son code, son texte complet, sa famille et son type. Les calculs reprennent ceux de la restitution ; les moyennes par echelle sont les moyennes des familles, sans ponderation par le nombre de questions. Les donnees textuelles pouvant etre interpretees comme une formule de tableur sont prefixees d'une apostrophe dans le CSV.

Les adresses email et accords sont inclus dans cet export reserve a l'administrateur. Aucune route publique ne permet d'extraire les reponses. L'export est non mis en cache et ne contient pas les sessions ni le mot de passe administrateur. Avec zero reponse, le fichier contient uniquement les en-tetes. Un fichier de reponse illisible fait echouer l'export plutot que de produire silencieusement un fichier incomplet.

## Verification

```sh
npm run lint
npm run build
npx playwright test
```

## Ouverture publique ulterieure

Cette version est locale, a la demande de l'utilisateur. Pour une ouverture publique, utiliser un serveur Node avec HTTPS et un volume persistant, ou remplacer le stockage fichier par une base durable. Les fichiers locaux ne sont pas adaptes aux fonctions ephemeres de Vercel. Prevoir sauvegardes, protection anti-abus et configuration d'un prestataire email si l'envoi est souhaite. Completer la page de confidentialite avec l'identite de l'organisateur, son contact et la duree de conservation avant collecte publique.

Photo de couverture : travail collectif, Unsplash, https://images.unsplash.com/photo-1522071820081-009f0129c71c. Polices : Geist via next/font. Icones : Lucide.
