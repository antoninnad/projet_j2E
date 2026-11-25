# Charte Graphique — Lagui (Ardoise & Cobalt)

> **Identité retenue** : **Ardoise & Cobalt** — clarté institutionnelle B2B pour un espace collaboratif multi-entreprises cloisonné. L'interface sépare nettement la toile de fond minérale (`--canvas`) des cartes documentaires blanches (`--card`) et unifie toute la signalétique de permissions et de statuts.

---

## 1. Palette principale « Ardoise & Cobalt » (`frontend/src/styles.css`)

| Rôle | Token CSS | Hex approx. | Valeur OKLCH | Contraste | Usage |
|---|---|---|---|---|---|
| **Primaire marque** | `--primary` | `#1E40AF` | `oklch(0.425 0.162 262)` | **8.6:1 (AAA)** | Actions principales, onglet actif, validation, monogramme Lagui |
| **Primaire doux** | `--primary-subtle` | `#EFF4FF` | `oklch(0.958 0.022 260)` | Surface | Tuiles d'icônes, badges `Admin` / `Vous`, sélection dans l'explorateur |
| **Texte sur primaire doux** | `--primary-subtle-foreground` | `#1D3B9E` | `oklch(0.355 0.135 262)` | **8.2:1 (AAA)** | Libellés et icônes sur fond `--primary-subtle` |
| **Toile de fond** | `--canvas` | `#F5F8FC` | `oklch(0.978 0.007 255)` | Fond | Arrière-plan général des pages Thymeleaf et React |
| **Surface carte** | `--card` / `--background` | `#FFFFFF` | `oklch(1 0 0)` | Surface | Cartes, formulaires, explorateur et éditeur |
| **Encre principale** | `--foreground` | `#0F172A` | `oklch(0.205 0.032 258)` | **16.4:1 (AAA)** | Titres, noms de fichiers et corps de texte |
| **Texte secondaire** | `--muted-foreground` | `#475569` | `oklch(0.475 0.028 256)` | **7.1:1 (AAA)** | Métadonnées, chemins, horodatages et descriptions |
| **Bordure** | `--border` | `#E2E8F0` | `oklch(0.914 0.013 255)` | Structure | Contours de cartes, séparateurs et tableaux |
| **Focus clavier** | `--ring` | `#3B82F6` | `oklch(0.565 0.165 260)` | **4.6:1 (AA)** | Anneau `:focus-visible` sur l'ensemble des contrôles |

---

## 2. Registres sémantiques unifiés (Thymeleaf + React)

| Registre | Token principal | Solide | Fond (`-subtle`) | Bordure (`-border`) | Texte (`-foreground`) | Contraste | Usage |
|---|---|---|---|---|---|---|---|
| **Succès** | `--success` | `#059669` | `#ECFDF5` | `#A7F3D0` | `#064E3B` | **9.1:1 (AAA)** | Compte `ACTIVE`, approbation d'inscription, sauvegarde réussie. |
| **Attention** | `--warning` | `#D97706` | `#FFFBEB` | `#FDE68A` | `#78350F` | **8.4:1 (AAA)** | Compte `PENDING`, session expirée, lecture seule (`L = M`), dossiers & favoris. |
| **Information** | `--info` | `#0284C7` | `#F0F9FF` | `#BAE6FD` | `#0C4A6E` | **8.9:1 (AAA)** | Brouillon local non enregistré, confirmation de déconnexion. |
| **Danger** | `--destructive` | `#DC2626` | `#FEF2F2` | `#FECACA` | `#7F1D1D` | **8.2:1 (AAA)** | Refus d'accès (`L < M`), désactivation de compte, erreurs de formulaire. |

---

## 3. Variantes du composant `<Badge />`

`frontend/src/components/ui/badge.tsx` expose les variantes alignées sur la charte :
- `variant="brand"` : Rôles clés (`Admin`, `Vous`), départements et seuils actifs (`Seuil actuel M = ...`).
- `variant="success"` : Statut `Actif` dans l'administration et compteur de membres actifs dans l'annuaire.
- `variant="warning"` : Compteur d'inscriptions en attente (`PENDING`).
- `variant="info"` : État d'édition / brouillon.
- `variant="outline"` / `variant="secondary"` : Métadonnées neutres et compteurs secondaires.
