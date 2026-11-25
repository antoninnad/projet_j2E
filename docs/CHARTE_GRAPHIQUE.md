# Charte Graphique & Plaquette de Couleurs — Lagui

> **Positionnement visuel** : Espace de travail collaboratif multi-entreprises sécurisé. L'interface privilégie la lisibilité documentaire sur longue session, une séparation franche entre la toile de fond et les cartes de contenu, et une signalétique de permissions immédiatement compréhensible.

---

## 1. Principes de cohérence chromatique

1. **Séparation Toile / Surface (`--canvas` vs `--card`)** :
   - Toutes les pages Thymeleaf (`index`, `login`, `register`, `dashboard`, `admin-*`) et l'application React reposent sur `bg-canvas` (teinte minérale très claire) tandis que les conteneurs fonctionnels utilisent `bg-card` (`#FFFFFF`), évitant l'effet monochrome plat sans alourdir les ombres.
2. **Signature de marque unifiée** :
   - Le monogramme **Lagui** (`L`) dans l'en-tête (`fragments/header.html`, `SiteHeader`, `favicon.svg`) et le filet supérieur `.brand-top-accent` des écrans d'accès partagent le dégradé thématique `--brand-gradient-from` → `--brand-gradient-to`.
3. **Zéro couleur utilitaire dispersée** :
   - Les alertes MVC (`fragments/messages.html`), les formulaires React (`T13`, `T17`, `T28`, `T30`) et l'explorateur de fichiers (`T19`) consomment exclusivement les tokens sémantiques définis dans `frontend/src/styles.css`.

---

## 2. Les 3 variations de design (`data-brand-theme`)

La variation active se pilote via l'attribut `data-brand-theme` sur `<html>` (prévisualisable en direct sur `http://localhost:5173/?view=charte`).

| Variation | Attribut | Primaire (`--primary`) | Toile (`--canvas`) | Accent doux (`--primary-subtle`) | Rayon (`--radius`) | Intention |
|---|---|---|---|---|---|---|
| **A — Ardoise & Cobalt** *(défaut)* | `cobalt` | `#1E40AF` (`oklch(0.425 0.162 262)`) | `#F5F8FC` | `#EFF4FF` | `10 px` (`0.625rem`) | Clarté institutionnelle B2B, confiance et hiérarchie stricte des droits. |
| **B — Sauge & Forêt** | `sauge` | `#115E59` (`oklch(0.418 0.098 172)`) | `#F5F8F6` | `#ECFDF5` | `12 px` (`0.75rem`) | Sérénité documentaire, confort visuel pour la lecture et l'édition longue. |
| **C — Encre & Ambre** | `encre` | `#1E293B` (`oklch(0.285 0.048 258)`) | `#FAF8F4` | `#FEF3C7` | `8 px` (`0.5rem`) | Sobriété directionnelle, inspiration cabinet/papier chaud avec anneau ambré. |

---

## 3. Registres sémantiques invariants (WCAG AAA)

Ces 4 registres restent identiques quelle que soit la variation choisie afin de garantir un repérage sans ambiguïté des états de sécurité et de permissions :

| Registre | Token principal | Solide | Fond subtil (`-subtle`) | Bordure (`-border`) | Texte (`-foreground`) | Contraste | Usage dans Lagui |
|---|---|---|---|---|---|---|---|
| **Succès** | `--success` | `#059669` | `#ECFDF5` | `#A7F3D0` | `#064E3B` | **9.1:1** | Compte `ACTIVE`, approbation d'inscription, sauvegarde réussie. |
| **Attention** | `--warning` | `#D97706` | `#FFFBEB` | `#FDE68A` | `#78350F` | **8.4:1** | Compte `PENDING`, session expirée, lecture seule (`L = M`), dossiers & favoris. |
| **Information** | `--info` | `#0284C7` | `#F0F9FF` | `#BAE6FD` | `#0C4A6E` | **8.9:1** | Brouillon local non enregistré, confirmation de déconnexion. |
| **Danger** | `--destructive` | `#DC2626` | `#FEF2F2` | `#FECACA` | `#7F1D1D` | **8.2:1** | Refus d'accès (`L < M`), désactivation de compte, erreurs de formulaire. |

---

## 4. Variantes du composant `<Badge />`

`frontend/src/components/ui/badge.tsx` expose les variantes alignées sur la charte :
- `variant="brand"` : Rôles clés (`Admin`, `Vous`), départements et seuils actifs (`Seuil actuel M = ...`).
- `variant="success"` : Statut `Actif` dans l'administration et compteur de membres actifs dans l'annuaire.
- `variant="warning"` : Compteur d'inscriptions en attente (`PENDING`).
- `variant="info"` : État d'édition / brouillon.
- `variant="outline"` / `variant="secondary"` : Métadonnées neutres et compteurs secondaires.
