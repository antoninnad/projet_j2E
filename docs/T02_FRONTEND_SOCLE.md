# Documentation T02 — Socle frontend (Thymeleaf + React/TypeScript)

Ce document explique les choix d'architecture, les fichiers créés ou modifiés et la façon d'utiliser et d'étendre le socle frontend mis en place dans la tâche **T02** de [work.md](../work.md).

> Pour un mémo ultra-synthétique destiné aux agents IA (économie de tokens), consulter [docs/AI_CONTEXT.md](./AI_CONTEXT.md).

---

## 1. Objectif de T02

Conformément à la section 1.1 de `work.md` et aux consignes de `claude.md`, l'application combine :
- **Spring MVC + Thymeleaf** pour les pages structurantes (`GET /`, `GET /register`, `GET /login`, `GET /dashboard`) et leurs fragments partagés (`th:fragment` / `th:replace`), avec protection serveur de `/dashboard` ;
- **React + TypeScript + Tailwind CSS v4 + shadcn/ui** pour les interfaces métier interactives (explorateur/éditeur de documents, administration, et futurs modules annuaire et chat privé), sans jamais casser ni remplacer les routes MVC.

---

## 2. Ce qui a été fait

### 2.1 Contrôleurs Spring MVC (`@Controller`)
- [HomeController.java](../src/main/java/fr/cytech/projetj2e/controller/HomeController.java) :
  - Expose `GET /` (`index`), `GET /login` (`login`), `GET /register` (`register`) et `GET /dashboard` (`dashboard`).
  - Redirige automatiquement les visiteurs anonymes qui appellent `GET /dashboard` vers `/login?required=true`.
  - Prépare les objets de formulaire (`loginForm`, `registerForm`) et les attributs serveur (`activeTab`, `departments`, `recentDocuments`) prêts pour les tâches T11–T13 et T18.
- [FrontendModelAdvice.java](../src/main/java/fr/cytech/projetj2e/controller/FrontendModelAdvice.java) :
  - Injecte dans toutes les vues `@Controller` la configuration de chargement des assets (`useViteDevServer`, `frontendDevServerUrl`) ainsi que l'état minimal de session (`isAuthenticated`, `isAdmin`, `sessionDisplayName`) sans jamais créer de session inutile ni exposer de secret.

### 2.2 Fragments et templates Thymeleaf
Tous les templates se trouvent dans `src/main/resources/templates/` et réutilisent 5 fragments communs dans `templates/fragments/` :
- **`fragments/head.html`** : métadonnées, titre `<Page> — Lagui`, favicon, et chargement du bundle CSS/JS compilé (`/ui/app.css`, `/ui/app.js`) ou du serveur Vite HMR en dev.
- **`fragments/header.html`** : lien d'évitement clavier (`Aller au contenu principal`), marque Lagui et inclusion du fragment `nav`.
- **`fragments/nav.html`** : liens vers `/`, `/dashboard`, `/login`, `/register`, affichage du nom connecté et formulaire `POST /logout` (avec champ CSRF conditionnel prêt pour T11/T13).
- **`fragments/messages.html`** : rendu unifié des messages flash (`success`, `info`, `warning`, `error`) et des paramètres d'URL (`?registered`, `?logout`, `?required`, `?expired`, `?error`).
- **`fragments/footer.html`** : pied de page commun.

Pages assemblées :
- **`index.html`** : accueil public présentant les fonctionnalités multi-entreprises et les appels à l'action adaptés à l'état de connexion.
- **`login.html`** : formulaire de connexion par **email** et mot de passe aligné sur `LoginDTO` (prêt pour `POST /login`, validation et CSRF).
- **`register.html`** : formulaire d'inscription aligné sur `RegisterDTO` (`firstName`, `lastName`, `username`, `companyCode`, `email`, `password`, `confirmPassword`) avec emplacements d'erreurs par champ.
- **`dashboard.html`** : synthèse serveur Thymeleaf des départements et documents autorisés + conteneur `<div id="workspace-root" data-react-mount="workspace" ...>` qui monte l'espace interactif React.

### 2.3 Unification TypeScript, style et routage React
- **Nettoyage des fichiers `.jsx` incompatibles** : suppression des anciens fichiers `App.jsx`, `main.jsx`, `index.css`, `App.css` et `pages/*.jsx` qui importaient `react-router-dom` et `bootstrap` (non présents dans `package.json`).
- **Migration de l'écran d'administration** : la logique utile de l'ancien `AdminDashboard.jsx` a été migrée en TypeScript + Tailwind/shadcn dans [pending-registrations-panel.tsx](../frontend/src/components/admin/pending-registrations-panel.tsx) (libellés français, états chargement/vide/erreur, toasts Sonner), prêt pour T17.
- **Routage hybride cohérent** :
  - [routes.ts](../frontend/src/app/routes.ts) centralise les routes MVC (`MVC_ROUTES`) et les onglets React du tableau de bord (`WORKSPACE_TABS`: `files`, `directory`, `chat`, `admin`).
  - [workspace-shell.tsx](../frontend/src/components/workspace/workspace-shell.tsx) synchronise l'onglet actif avec `?tab=<id>` via l'API `History`. Un rechargement navigateur reste toujours sur `GET /dashboard?tab=...`, garanti côté serveur par Spring MVC.
  - [main.tsx](../frontend/src/main.tsx) agit comme registre d'îlots React (`data-react-mount="workspace"`, `data-react-mount="site-header"`, ou `#root` en mode Vite autonome).
- **Style unifié Tailwind v4** : `frontend/src/styles.css` déclare `@source "../../src/main/resources/templates";`. Lors de `npm run build`, Vite compile dans `src/main/resources/static/ui/` un unique `app.css` (couvrant Thymeleaf **et** React) et `app.js`.

---

## 3. Modes de lancement en développement

### Prérequis Node.js
Le projet frontend utilise Vite 8 et requiert **Node.js ≥ 22.12**. Sur les postes où `/usr/bin/node` est en v18, activer Node 22 via nvm :
```bash
export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"
```

### Mode 1 — Spring Boot seul (recommandé pour tester le parcours MVC complet)
1. Compiler le bundle frontend une fois (ou après modification CSS/TSX/templates) :
   ```bash
   cd frontend && npm run build
   ```
2. Lancer Spring Boot :
   ```bash
   ./mvnw spring-boot:run
   ```
3. Ouvrir `http://localhost:8080/` (`/login`, `/register`, `/dashboard`).

### Mode 2 — Spring Boot + Vite HMR dans Thymeleaf
1. Lancer Vite :
   ```bash
   cd frontend && npm run dev
   ```
2. Lancer Spring Boot en pointant vers le serveur Vite :
   ```bash
   ./mvnw spring-boot:run -Dspring-boot.run.arguments="--app.frontend.dev-server-url=http://localhost:5173"
   ```
Les pages servies par Spring Boot sur `:8080` chargent alors directement les modules React/CSS avec rechargement à chaud depuis `:5173`.

### Mode 3 — Aperçu React autonome (Vite seul)
```bash
cd frontend && npm run dev
```
Ouvrir `http://localhost:5173/` pour travailler rapidement sur les composants interactifs (`FileWorkspace`, `PendingRegistrationsPanel`, etc.) sans authentification serveur.

---

## 4. Comment étendre ce socle

### Ajouter une nouvelle page Thymeleaf
1. Créer `src/main/resources/templates/<page>.html` en réutilisant `fragments/head`, `fragments/header`, `fragments/messages`, `fragments/footer`.
2. Exposer la route `GET` dans un `@Controller`.
3. Relancer `cd frontend && npm run build` si de nouvelles classes utilitaires Tailwind ont été introduites dans le template.

### Ajouter un nouveau module React dans `/dashboard`
1. Créer le composant dans `frontend/src/components/<domaine>/`.
2. Remplacer le placeholder correspondant (ou ajouter un onglet dans `WORKSPACE_TABS` de `frontend/src/app/routes.ts` et dans `ALLOWED_DASHBOARD_TABS` de `HomeController.java`).
3. Vérifier avec `npm run typecheck && npm run build` et `./mvnw test`.
