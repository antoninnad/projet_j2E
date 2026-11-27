# AI Context — Projet J2EE (Lagui) — Guide ultra-compact (économie de tokens)

> **Usage IA** : Lire ce fichier en premier avant d'explorer l'arborescence. Il évite de relire les templates, la config Vite/Tailwind et les contrôleurs de base. Pour le backlog global, voir `work.md` ; pour les règles cours obligatoires, voir `claude.md`.

---

## 1. Stack & pièges d'environnement

- **Backend** : Java 17+ (OpenJDK 21 local), **Spring Boot 4.1.1**, Maven Wrapper (`./mvnw`), Thymeleaf, JPA/H2 (`spring-security-crypto` BCrypt).
  - **Piège Spring Boot 4** : `@WebMvcTest` est dans `org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest` (et non `boot.test.autoconfigure...`). `ProjetJ2eApplication` déclarant un `CommandLineRunner init(AdminRepository, PasswordEncoder)`, mocker ces deux beans avec `@MockitoBean` dans les `@WebMvcTest`.
- **Frontend** : **100 % TypeScript strict** + React 19 + Vite 8 + Tailwind CSS v4 + shadcn/ui (Radix + Lucide + Sonner).
  - **Piège Node** : `/usr/bin/node` est en v18 (trop vieux pour Vite 8). Toujours préfixer avec Node 22 via nvm :
    `export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"`
- **CSS partagé & Charte graphique** : `frontend/src/styles.css` contient `@source "../../src/main/resources/templates";` → Tailwind v4 scanne automatiquement React **et** Thymeleaf dans un seul bundle `/ui/app.css`. Thème retenu **Ardoise & Cobalt** (`--canvas`, `--card`, `--primary`, `--primary-subtle`, `--success*`, `--warning*`, `--info*`, `--destructive*`), documenté dans `docs/CHARTE_GRAPHIQUE.md`.

---

## 2. Carte rapide des fichiers clés

```text
src/main/java/fr/cytech/projetj2e/
├─ controller/HomeController.java           # @Controller MVC : GET / -> index.html
├─ controller/PageController.java           # @Controller MVC : GET /dashboard -> dashboard.html (garde session + ?tab=)
├─ controller/LoginController.java          # @Controller MVC : GET/POST /login, /adminLogin, POST /logout
├─ controller/RegisterController.java       # @Controller MVC : GET/POST /register (UserDto)
├─ controller/Admin{Dashboard,User}Controller & NodeManagementController # Vues/actions admin MVC
├─ controller/FrontendModelAdvice.java      # @ControllerAdvice(@Controller) : assets Vite + état session sûr
├─ configuration/SecurityConfig.java        # Bean BCryptPasswordEncoder
└─ model/ & repository/ & service/          # Company, Department, Membership, User, UserProfile, Node, Folder, File

openapi.yaml                                # Contrat OpenAPI (T01)

src/main/resources/
├─ application.properties                   # app.frontend.dev-server-url= (vide => /ui/app.{css,js})
├─ static/ui/{app.css,app.js,favicon.svg}   # Généré par `cd frontend && npm run build`
└─ templates/
   ├─ index.html | login.html | register.html | dashboard.html
   ├─ admin-login.html | admin-dashboard{,-listUsers,-listDepartements,-listNodes,-listFiles}.html
   └─ fragments/{head,header,nav,admin-nav,messages,footer}.html

frontend/
├─ vite.config.js                           # Build direct -> ../src/main/resources/static/ui (app.js / app.css)
├─ index.html                               # Entrée standalone dev Vite (:5173)
└─ src/
   ├─ main.tsx                              # Registre de montage des îlots React (`data-react-mount`)
   ├─ App.tsx                               # Coquille standalone (:5173 uniquement)
   ├─ styles.css                            # Tokens Tailwind v4 + @source templates
   ├─ app/routes.ts                         # Source unique : MVC_ROUTES + WORKSPACE_TABS (?tab=)
   ├─ components/site-{header,menu}.tsx     # Header React (mode standalone ou data-react-mount="site-header")
   ├─ components/workspace/                 # WorkspaceShell + FileWorkspace + FileExplorer + DocumentDetails + SharingPanel (T28)
   ├─ components/activity/                  # ActivityFeedPanel + NodeActivitySection : fil entreprise/membre et historique par nœud (T37)
   ├─ components/admin/                     # PendingRegistrationsPanel + CompanyAdminPanel (T17) + CompanyCreationPanel (T13)
   ├─ components/directory/                 # DirectoryProfilePanel : profil, avatar, mdp, annuaire paginé (T30)
   ├─ components/ui/*                       # Primitives shadcn/ui
   ├─ lib/api{,-client}.ts, lib/session.ts, types/api.ts # Client HTTP, redirection 401 session expirée, DTO (T03/T13)
   └─ data/{api-preview,workspace}.ts       # Données de l'aperçu Vite (DemoFileWorkspace)
```

---

## 3. Contrats de routage (RÈGLE CRITIQUE)

| Type | Route | Propriétaire | Comportement |
|---|---|---|---|
| MVC (`@Controller`) | `GET /` | `HomeController` → `index.html` | Accueil public |
| MVC (`@Controller`) | `GET/POST /login`, `POST /logout` | `LoginController` → `login.html` | Connexion + déconnexion (à migrer sur `LoginDTO` email + `PublicUser` en T11) |
| MVC (`@Controller`) | `GET/POST /register` | `RegisterController` → `register.html` | Formulaire `userDto` (`firstName`, `lastName`, `username`, `email`, `companyCode`, `password`, `confirmPassword`) |
| MVC (`@Controller`) | `GET /dashboard` | `PageController` → `dashboard.html` | Redirige `302 -> /login?required=true` si non authentifié ; sinon rend synthèse serveur + îlot React |
| Onglet React | `/dashboard?tab={files\|directory\|chat\|activity\|admin}` | `WorkspaceShell` (`routes.ts`) | Synchronisé via `History API` ; un reload HTTP repasse toujours par Spring MVC |
| JSON (`@RestController`) | `/api/**` | Contrat `openapi.yaml` | API consommée par React (proxyfiée par Vite en dev) |
| WebSocket | `/ws/chat` | `ChatWebSocketHandler` (T34) | Événements du chat poussés au compte connecté ; protocole dans `docs/T34_CHAT_TEMPS_REEL.md` (proxyfiée par Vite en dev) |

---

## 4. Contrats Thymeleaf (copier-coller)

- **Head** : `<head th:replace="~{fragments/head :: head('Titre', 'Description')}"></head>`
- **Header** : `<header th:replace="~{fragments/header :: header('accueil|login|register|dashboard')}"></header>` (inclut `fragments/nav`)
- **Messages** : `<div th:replace="~{fragments/messages :: messages}"></div>`
  - Attributs flash reconnus : `success`, `info`, `warning`, `error`
  - Params URL reconnus : `?registered`, `?logout`, `?required`, `?expired`, `?error`
- **Footer** : `<footer th:replace="~{fragments/footer :: footer}"></footer>`
- **Session (attributs modèle via `FrontendModelAdvice`)** : `isAuthenticated`, `isAdmin`, `sessionDisplayName`, `useViteDevServer`, `frontendDevServerUrl`.
  - Clés `HttpSession` vérifiées : `publicUser` (cible T11), `userId`, `adminId` (compatibilité transitoire).
  - CSRF prêt : `th:if="${_csrf != null}"` déjà présent dans `nav.html`, `login.html`, `register.html`.

---

## 5. Contrats de montage React (`frontend/src/main.tsx`)

| Sélecteur DOM | Composant monté | Attributs `data-*` lus |
|---|---|---|
| `[data-react-mount="workspace"]` | `WorkspaceShell` (`embedded`) | `data-initial-tab`, `data-user-name`, `data-is-admin`, `data-base-url`, `data-login-url` |
| `[data-react-mount="company-creation"]` | `CompanyCreationPanel` | `data-base-url`, `data-login-url` |
| `[data-react-mount="site-header"]` | `SiteHeader` | `data-base-url`, `data-active-page` |
| `#root` (uniquement `frontend/index.html`) | `App` (aperçu Vite `:5173`) | `data-base-url` |

---

## 6. Commandes exactes de vérification

```bash
# Frontend — pipeline CI complet T10 (Node 22 requis : check:node + lint + typecheck + test + build + check:bundle)
export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"
cd frontend && npm run ci

# Tests frontend seuls ou avec couverture V8 (Vitest + Testing Library + jsdom)
cd frontend && npm run test
cd frontend && npm run test:coverage
# Astuce jsdom 29 + React 19 : utiliser fireEvent.change(...) pour les inputs/textarea contrôlés

# Backend + tests MVC
./mvnw test

# Run local Spring Boot seul (sert Thymeleaf + /ui/app.{css,js})
./mvnw spring-boot:run

# Run dev avec HMR Vite dans Thymeleaf (optionnel)
# Terminal 1 : cd frontend && npm run dev
# Terminal 2 : ./mvnw spring-boot:run -Dspring-boot.run.arguments="--app.frontend.dev-server-url=http://localhost:5173"
```

---

## 7. Garde-fous & points d'accroche suivants

- **Ne jamais** réintroduire de fichiers `.jsx`, `bootstrap` ou un catch-all SPA qui masquerait `/`, `/login`, `/register`, `/dashboard`.
- **Ne jamais** exposer de mot de passe, hash ou secret dans `FrontendModelAdvice`, les templates ou `data-*`.
- **Prochains branchements** :
  - **T03 (F2)** fournit `createApi()` au panneau d'inscriptions sur le dashboard Thymeleaf et `createPreviewApi()` dans l'aperçu Vite. `ApiError` porte `status`, `code` et `errors` par champ. Les mutations lisent le jeton CSRF de la page lorsque Spring le fournit.
  - **T10 (F1)** : Terminé — CI frontend active uniquement sur `main` (`.github/workflows/frontend-ci.yml`, `npm run ci`, Node 22 via `.nvmrc`, ESLint TS, `tsc`, Vitest + V8 coverage, `scripts/{check-node,verify-bundle}.mjs`). Voir `docs/T10_FRONTEND_CI.md`.
  - **T11–T13 (B1/F1)** : Terminé sur `dev` (`LoginDTO` email, `RegisterDTO`, `PublicUser` en session, `SessionIdentityService`, CSRF, expiration de session, création d'entreprise React + fragments Thymeleaf).
  - **T17 (F1)** : `CompanyAdminPanel` implémenté sur `feature/T17-T28` (désactivation/réactivation de comptes, création de départements, affectation des membres et niveaux `L`, simulé dans `api-preview.ts` en attendant `T14`/`T15`).
  - **T28 (F1)** ouvre `SharingPanel` depuis `DemoFileWorkspace` avec les réponses simulées d'`api-preview.ts`. Le dashboard affiche le droit de partage renvoyé par T18. Le bouton sera activé sur le dashboard quand les routes de T27 seront exposées.
  - **T18/T19 (B2/F2)** alimentent le dashboard Thymeleaf et `FileWorkspace` via les routes Documents d'OpenAPI. `listRootFolders`, `listFolderChildren` et `getNode` chargent l'arborescence, les métadonnées, le fil d'Ariane et les droits. Les indices de l'API partent de 0, les libellés affichés de 1.
  - **T30 (F1)** : Implémenté sur `feature/T30` (`DirectoryProfilePanel` : édition prénom/nom/bio/avatar, changement de mot de passe `POST /api/profiles/me/password`, recherche paginée des collègues `ACTIVE`, fiche publique `GET /api/users/{id}/profile` et ouverture de conversation vers `?tab=chat&peer={id}`) — prêt à valider en réel dès que B1 termine `T29`.
  - **T35 (F2)** : `ChatPanel` + `useChat` branchés sur les API REST T33 et la WebSocket `/ws/chat` T34 (ouverture depuis l'annuaire T30 `?tab=chat&peer={id}`).
  - **T37 (F1)** : `ActivityFeedPanel` (`GET /api/activity`) exposé dans l'onglet `?tab=activity` et `NodeActivitySection` (`GET /api/nodes/{nodeId}/activity`) repliable à la demande dans `DocumentDetails`, avec filtres par catégorie (`DOCUMENT`, `RIGHTS`, `ADMINISTRATION`) et pagination `{ items, page }`.
  - **T38 (F1)** : États de chargement accessibles (`role="status"`), alertes d'erreur avec bouton `Réessayer`, `aria-invalid`, états vides harmonisés et alignement sur la charte **Ardoise & Cobalt / Capitalio** sur tous les écrans F1.
