# TANDEM — Deux vies. Un équilibre.

Application mobile (PWA) de budget mensuel à deux, pour Guillaume et Emma. Aucune connexion bancaire : tout se saisit à la main, en quelques secondes.
Next.js 15 · TypeScript · Tailwind CSS 4 · Supabase (auth, base, temps réel, stockage) · Vercel.

## Ce que fait l'app

- **Accueil** (thème sombre partout) : reste à vivre, **camembert d'utilisation des revenus** (chaque catégorie, l'épargne, les charges à venir et le reste), alertes (personne qui finira dans le rouge, budgets), fin de mois prévue pour chacun, qui a dépensé quoi, prochaines charges, épargne. Sélecteur Guillaume / Emma / Ensemble et navigation par mois.
- **Ajout rapide (+)** : dépense, revenu ou épargne (mise de côté du mois), avec qui a payé : Guillaume, Emma ou commun. L'épargne n'est jamais comptée comme une dépense. Si une dépense ressemble à une charge fixe prévue, l'app propose de la rattacher (pas de doublon).
- **Dépenses** : total du mois, comparaison avec le mois précédent, répartition par catégorie, recherche, filtres, historique jour par jour. Bouton **Analyse** : statistiques par mois, trimestre ou année.
- **Budgets** : plafond par catégorie, reconduction automatique, alertes à 80 % et au-delà de 100 %. Onglet **Épargne** : comptes d'investissement (Trade Republic de Guillaume et d'Emma) en montant global ou ligne par ligne (ETF, actions, plus-value), puis projets (bébé, vacances…) avec versements modifiables.
- **Répartition à deux** (Profil) : 50/50, prorata, prorata après crédits, « même effort » (chacun garde le même % de son salaire) ou personnalisé, avec la part de chacun sur le joint et le reste pour soi.
- **Profil** : prénom, couleur, avatar, catégories, charges fixes, partenaire, notifications, thème clair/sombre/auto, export CSV, déconnexion.

## 1. Supabase

> Projet déjà créé : **tandem** (organisation NOMA, région Paris), migrations appliquées. URL : `https://uacqlwmorewzibmrispe.supabase.co`. Les étapes ci-dessous servent si vous repartez de zéro.


1. Créez un projet sur [supabase.com](https://supabase.com).
2. **SQL Editor** : exécutez dans l'ordre les fichiers de `supabase/migrations/` :
   - `20261119000001_tandem_schema.sql` — tables, RLS, fonctions, temps réel
   - `20261119000002_avatars_storage.sql` — bucket des avatars
   - `20261119000003_notifications.sql` — préférences de notifications
   - `20261119000004_invest_split.sql` — comptes d'investissement, lignes ETF, réglages de répartition
   (ou `supabase db push` avec la CLI Supabase).
3. **Edge Function** `supabase/functions/tandem-login` (déjà déployée sur le projet tandem) : connexion en un geste, comme MAISON. Le premier qui se connecte crée le foyer ; le second le rejoint automatiquement. Aucun e-mail, aucun mot de passe. Compromis assumé : quiconque a l'adresse de l'app peut se connecter.

## 2. Variables d'environnement

Copiez `.env.example` en `.env.local` :

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=…           # clé publique (anon / publishable)
NEXT_PUBLIC_DEMO=0
```

La clé `service_role` / secrète n'est utilisée nulle part : ne l'ajoutez jamais au projet.

## 3. Lancer en local

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000 : écran **G / E**, puis « Se connecter ».

- **Premier lancement** : le premier qui touche son bouton (G ou E) crée le foyer et les catégories ; l'autre le rejoint automatiquement en touchant le sien.

Ensuite, tout ce que l'un ajoute apparaît immédiatement chez l'autre (Supabase Realtime).

## 4. Déployer sur Vercel

> Projet Vercel **tandem** déjà créé (équipe NullStudio's projects) avec les variables Supabase. Il reste à le relier au dépôt GitHub.


1. Poussez le dépôt sur GitHub, puis **Vercel → Add New → Project** et importez-le.
2. Ajoutez les mêmes variables d'environnement.
3. Dans Supabase → **Authentication → URL Configuration**, mettez l'URL Vercel comme *Site URL*.

## 5. Installer sur iPhone / Android

- **iPhone** : ouvrez l'URL dans Safari → Partager → « Sur l'écran d'accueil ». Ouvrez ensuite TANDEM depuis l'icône (nécessaire pour les notifications, iOS 16.4+).
- **Android** : Chrome propose « Installer l'application ».

## Mode démo

`NEXT_PUBLIC_DEMO=1` lance l'app avec des données fictives, sans Supabase (rien n'est enregistré). Une version autonome en un seul fichier HTML se construit avec :

```bash
npm run demo:single   # → tandem-demo.html
```

## Notifications

Réglages dans **Profil → Notifications** : budgets à 80 % et dépassés, rappel avant prélèvement (le jour même → 7 jours avant), dépenses du partenaire (avec seuil), objectif atteint, récap hebdo, silence la nuit.

Elles s'affichent quand l'app est ouverte ou en arrière-plan récent. Pour les recevoir **app fermée**, il faudra ajouter un envoi Web Push côté serveur (clés VAPID + Edge Function Supabase planifiée) — le service worker (`public/sw.js`) gère déjà l'événement `push`. Le récap hebdomadaire en dépend.

## Sécurité

- RLS active sur toutes les tables : seuls les membres du foyer accèdent aux données.
- Montants en **centimes entiers** (`bigint`), identifiants **UUID**.
- Connexion G / E comme MAISON : derrière chaque bouton, un vrai compte Supabase créé par la fonction `tandem-login`. La session reste ouverte sur l'appareil.

## Structure

```
src/app/(app)/        écrans connectés (accueil, dépenses, stats, budgets, profil…)
src/app/login         connexion G / E
src/app/onboarding    création / rejoindre le foyer
src/components/       UI (feuille d'ajout, barre d'onglets, graphiques SVG, logo animé)
src/lib/finance.ts    calculs : reste à vivre, budgets, échéances, anti-doublon
src/lib/store.tsx     données Supabase + temps réel (ou démo)
supabase/migrations/  schéma SQL
public/               manifest PWA, service worker, icônes
```

Pour remplacer les icônes par vos exports officiels : `public/icons/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` (180 px).
