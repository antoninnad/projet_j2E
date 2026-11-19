# AI Context — Projet J2EE (Lagui) — Guide ultra-compact (économie de tokens)

> **Usage IA** : Lire ce fichier en premier avant d'explorer l'arborescence. Il évite de relire les templates, la config Vite/Tailwind et les contrôleurs de base. Pour le backlog global, voir `work.md` ; pour les règles cours obligatoires, voir `claude.md`.

---

## 1. Stack & pièges d'environnement

- **Backend** : Java 17+ (OpenJDK 21 local), **Spring Boot 4.1.1**, Maven Wrapper (`./mvnw`), Thymeleaf, JPA/H2 (`spring-security-crypto` BCrypt).
  - **Piège Spring Boot 4** : `@WebMvcTest` est dans `org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest` (et non `boot.test.autoconfigure...`). `ProjetJ2eApplication` déclarant un `CommandLineRunner init(AdminRepository, PasswordEncoder)`, mocker ces deux beans avec `@MockitoBean` dans les `@WebMvcTest`.
- **Frontend** : **100 % TypeScript strict** + React 19 + Vite 8 + Tailwind CSS v4 + shadcn/ui (Radix + Lucide + Sonner).
  - **Piège Node** : `/usr/bin/node` est en v18 (trop vieux pour Vite 8). Toujours préfixer avec Node 22 via nvm :
    `export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"`
- **CSS partagé** : `frontend/src/styles.css` contient `@source "../../src/main/resources/templates";` → Tailwind v4 scanne automatiquement React **et** Thymeleaf dans un seul bundle `/ui/app.css`.

---

## 2. Carte rapide des fichiers clés

```text
src/main/java/fr/cytech/projetj2e/
├─ controller/HomeController.java           # @Controller MVC : GET /, /login, /register, /dashboard
├─ controller/FrontendModelAdvice.java      # @ControllerAdvice(@Controller) : assets Vite + état session sûr
├─ api/{Login,Register,AdminUser}Controller # @RestController JSON existants (à aligner en T11-T14)
├─ configuration/SecurityConfig.java        # Bean BCryptPasswordEncoder
└─ model/ & repository/ & service/          # JPA (T04-T08)

src/main/resources/
├─ application.properties                   # app.frontend.dev-server-url= (vide => /ui/app.{css,js})
├─ static/ui/{app.css,app.js,favicon.svg}   # Généré par `cd frontend && npm run build`
└─ templates/
   ├─ index.html | login.html | register.html | dashboard.html
   └─ fragments/{head,header,nav,messages,footer}.html

frontend/
├─ vite.config.js                           # Build direct -> ../src/main/resources/static/ui (app.js / app.css)
├─ index.html                               # Entrée standalone dev Vite (:5173)
└─ src/
   ├─ main.tsx                              # Registre de montage des îlots React (`data-react-mount`)
   ├─ App.tsx                               # Coquille standalone (:5173 uniquement)
   ├─ styles.css                            # Tokens Tailwind v4 + @source templates
   ├─ app/routes.ts                         # Source unique : MVC_ROUTES + WORKSPACE_TABS (?tab=)
   ├─ components/site-{header,menu}.tsx     # Header React (mode standalone ou data-react-mount="site-header")
   ├─ components/workspace/                 # WorkspaceShell + FileWorkspace + FileExplorer + FileEditor
   ├─ components/admin/pending-registrations-panel.tsx  # Ex-AdminDashboard migré TS/Tailwind (prêt T17)
   ├─ components/ui/*                       # Primitives shadcn/ui
   └─ data/workspace.ts                     # Données mock mémoire (à remplacer en T03/T19)
```

---

## 3. Contrats de routage (RÈGLE CRITIQUE)

| Type | Route | Propriétaire | Comportement |
|---|---|---|---|
| MVC (`@Controller`) | `GET /` | `HomeController` → `index.html` | Accueil public |
| MVC (`@Controller`) | `GET /login` | `HomeController` → `login.html` | Formulaire `POST /login` (`loginForm`: `email`, `password`) |
| MVC (`@Controller`) | `GET /register` | `HomeController` → `register.html` | Formulaire `POST /register` (`registerForm`: `firstName`, `lastName`, `username`, `email`, `companyCode`, `password`, `confirmPassword`) |
| MVC (`@Controller`) | `GET /dashboard` | `HomeController` → `dashboard.html` | Redirige `302 -> /login?required=true` si non authentifié ; sinon rend synthèse serveur + îlot React |
| Onglet React | `/dashboard?tab={files\|directory\|chat\|admin}` | `WorkspaceShell` (`routes.ts`) | Synchronisé via `History API` ; un reload HTTP repasse toujours par Spring MVC |
| JSON (`@RestController`) | `/api/**` | Controllers `api/` | API consommée par React (proxyfiée par Vite en dev) |

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
| `[data-react-mount="workspace"]` | `WorkspaceShell` (`embedded`) | `data-initial-tab`, `data-user-name`, `data-is-admin`, `data-base-url` |
| `[data-react-mount="site-header"]` | `SiteHeader` | `data-base-url`, `data-active-page` |
| `#root` (uniquement `frontend/index.html`) | `App` (aperçu Vite `:5173`) | `data-base-url` |

---

## 6. Commandes exactes de vérification

```bash
# Frontend (Node 22 requis)
export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"
cd frontend && npm run typecheck && npm run build

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
  - **T03 (F2)** : créer client API + types partagés dans `frontend/src/lib/` / `frontend/src/types/` et brancher `PendingRegistrationsPanel` / `FileWorkspace`.
  - **T10 (F1)** : ajouter workflow CI exécutant `npm ci && npm run typecheck && npm run build` sous Node 22.
  - **T11–T13 (B1/F1)** : brancher `POST /login`, `POST /register`, `POST /logout`, CSRF et `PublicUser` en session ; les champs des formulaires `login.html` / `register.html` et `th:errors` sont déjà alignés.
  - **T17 (F1)** : enrichir `frontend/src/components/admin/pending-registrations-panel.tsx` (désactivation, départements, niveaux).
  - **T18 (B2)** : alimenter les attributs modèle `departments` et `recentDocuments` de `HomeController#dashboard`.
  - **T30 / T35** : remplacer les placeholders `directory` et `chat` dans `WorkspaceShell`.
