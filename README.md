# Projet J2EE

Application **Spring Boot** avec **Thymeleaf**, structurée comme les projets de `dev_JEE`.

## Sommaire

- [Démarrer](#démarrer)
- [Modèle de données](#modèle-de-données)
- [Contrôle d'accès](#contrôle-daccès)
- [Constructeurs de `Folder`](#constructeurs-de-folder)
- [Relations](#relations)

---

## Démarrer

Depuis ce dossier :

```bash
./mvnw spring-boot:run
```

La page d'accueil est disponible sur <http://localhost:8080/>.

---

## Modèle de données

![Alt text](./graphs/diagramClass.jpg)
---

## Relations
| Type | Relation |
|------|----------|
| **1-1** | `User` ↔ `Profile` ; `Department` ↔ `Folder` racine |
| **1-N** | `Folder` → `Node` (enfants) ; `User` → `Node` (propriétaire) ; `Department` → `Membership` |
| **N-N** | `User` ↔ `Department` (via `Membership`, avec attribut `accessLevel`) ; `User` ↔ `Node` (contributeurs) |
 
Entités : `User`, `Profile`, `Department`, `Membership`, `Node` (`Folder`, `File`) → plus de 5.
 
Associer/dissocier graphiquement : ajouter/retirer un utilisateur d'un département (avec niveau), ajouter/retirer un contributeur d'un fichier/dossier, déplacer un nœud dans un dossier.
 
JPA : `Node` en `@Inheritance(strategy = SINGLE_TABLE)` ou `JOINED`. La relation `parent` (`@ManyToOne`) vit dans `Node`, `children` (`@OneToMany(mappedBy="parent")`) dans `Folder`.
La page d’accueil est disponible sur <http://localhost:8080/>.


## Regle de permission
Soit `L` = niveau de l'utilisateur dans le département du nœud (via `Membership`), `M` = `minAccessLevel` du nœud.
 
| Situation | Voir | Modifier | Supprimer | Ajouter un contributeur |
|-----------|:----:|:--------:|:---------:|:-----------------------:|
| `L < M` | non (invisible) | non | non | non |
| `L == M`, simple utilisateur | oui | non | non | non |
| `L == M`, **contributeur** | oui | oui | à décider | non |
| `L == M`, **propriétaire** | oui | oui | oui | oui |
| `L > M` | oui | oui | oui | oui |
| `ADMIN` global | tout | tout | tout | tout |
 
Règles d'intégrité à implémenter dans le service :
- Un dossier **sans parent** est créé comme racine : création automatique du `Department` associé (nom = nom du dossier).
- `minAccessLevel` d'un enfant **≥** celui du parent (sinon un fichier serait accessible dans un dossier invisible).
- Un utilisateur ne peut définir un `minAccessLevel` **supérieur à son propre niveau** (à décider).
- Interdire de déplacer un dossier dans l'un de ses descendants (cycle).
- Suppression d'un dossier : cascade sur les enfants.
Toute la logique doit être centralisée dans un `PermissionService` (`canView`, `canEdit`, `canDelete`, `canAddContributor`), idéalement testé unitairement.
 
---
## Securité

### Gestion Connexion

On utilisera un jwt: signé par la variable `SECRET_APPLICATION` dans le `.env`:
-  `flux access token` cookie signé token de 5 minutes 
-  `refresh token` cookie signé d'une semaine pour regénérer le token de 5 minutes

Le nom du patter est le `pattern access token / refresh token`.

### Encryptage de mot de passe

Comme demandé on ajoutera dans la classe `User` associé à la table `User` le paramètre `salt`.

On hashera le mdp avec du sha256(`mot de passe` + `salt`)

### Account creation

Each account is created by the user on the registration form, but a boolean will remain false until the admin approves the account. without the approval, login in should be automatically denied.


# Projet J2EE

Application Spring Boot avec Thymeleaf, structurée comme les projets de `dev_JEE`.

## Démarrer

Depuis ce dossier :

```bash
./mvnw spring-boot:run
```

La page d’accueil est disponible sur <http://localhost:8080/>.

## Entité

### User
Diagramme de la table

```mermaid
classDiagram
    class User {
        +UUID id
        +String email
        +Sring salt
    }

    class RefreshToken {
        <<table>>
        +UUID id
        +UUID user_id
        +String token_hash
        +DateTime created_at
        +DateTime expires_at
        +DateTime revoked_at
    }

    User "1" --> "0..*" RefreshToken : possède
```

## Folder
L'entité `Folder` représente l'arborescence des fichiers de l'entreprise. Chaque département constitue un dossier racine, puis les fichiers et sous-dossiers sont organisés par niveaux :

| Niveau | Description |
| --- | --- |
| 0 | Dossier racine correspondant à un département, par exemple `Finance`. |
| 1 | Fichier ou dossier directement contenu dans le département, par exemple `Paie`. |
| 2 et plus | Fichier ou sous-dossier imbriqué dans un élément du niveau précédent. |

La portée d'accès dépend du niveau accordé : le niveau 0 donne accès à tous les départements, le niveau 1 aux fichiers du département concerné et le niveau 2 aux sous-dossiers de niveau 2 de ce département.

Le mode `Contributeur` permet de limiter les droits de contribution à un élément précis, par exemple un seul fichier situé au bout de l'arborescence.

Exemple d'arborescence allant du niveau 0 au niveau 4 :

```mermaid
flowchart TD
    D["Finance — département, niveau 0"] --> P["Paie — niveau 1"]
    P --> A["2026 — niveau 2"]
    A --> M["Mars — niveau 3"]
    M --> F["bulletin-001.pdf — niveau 4"]
```

