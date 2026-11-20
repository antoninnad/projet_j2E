# Documentation T10 — Intégration continue frontend

Ce document décrit le pipeline d'intégration continue frontend mis en place pour la tâche **T10** de [work.md](../work.md) afin de garantir un frontend compilable et cohérent après chaque intégration (T02 + T03 et tâches suivantes).

---

## 1. Déclenchement automatique (GitHub Actions)

Le workflow [.github/workflows/frontend-ci.yml](../.github/workflows/frontend-ci.yml) se déclenche automatiquement uniquement sur la branche **`main`** :
- sur `push` vers `main`,
- sur `pull_request` ciblant `main`,
- manuellement à tout moment via `workflow_dispatch`,

dès qu'un fichier est modifié dans `frontend/**`, `src/main/resources/templates/**` ou `.github/workflows/frontend-ci.yml`.
La directive `concurrency` annule automatiquement les exécutions obsolètes sur une même branche.

---

## 2. Étapes exécutées sous Node 22

La version Node est verrouillée par [frontend/.nvmrc](../frontend/.nvmrc) (`22`) et [frontend/package.json](../frontend/package.json) (`engines.node >= 22.12.0`).

| Étape | Commande | Rôle |
|---|---|---|
| 1. Version Node | `npm run check:node` | Bloque toute exécution sous Node < 22.12 ([check-node.mjs](../frontend/scripts/check-node.mjs)) |
| 2. Dépendances | `npm ci` | Installation strictement reproductible depuis `package-lock.json` |
| 3. Lint | `npm run lint` | ESLint 10 + `typescript-eslint` + `react-hooks` + `react-refresh` ([eslint.config.js](../frontend/eslint.config.js)) |
| 4. Types | `npm run typecheck` | Vérification TypeScript stricte (`tsc --noEmit`) |
| 5. Tests & couverture | `npm run test:coverage` | Suite Vitest + Testing Library (`jsdom`) + rapport V8 ([vitest.config.ts](../frontend/vitest.config.ts)) |
| 6. Build & bundle | `npm run build && npm run check:bundle` | Compilation Vite/Tailwind v4 vers `src/main/resources/static/ui/` + contrôle de présence de `app.js`, `app.css`, `favicon.svg` et du scan Tailwind des templates Thymeleaf ([verify-bundle.mjs](../frontend/scripts/verify-bundle.mjs)) |

---

## 3. Reproduire exactement la CI en local

```bash
# Activer Node 22 si /usr/bin/node est plus ancien
export PATH="$HOME/.nvm/versions/node/v22.19.0/bin:$PATH"

cd frontend
npm run ci
```

Pour consulter le détail de la couverture de tests en local :
```bash
cd frontend
npm run test:coverage
```
Le rapport HTML est généré dans `frontend/coverage/` (ignoré par Git).
