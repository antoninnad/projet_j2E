# Consignes de développement

## Périmètre et plan

Lire [docs/AI_CONTEXT.md](docs/AI_CONTEXT.md) (mémo technique ultra-compact pour économiser les tokens) et [work.md](work.md) avant de modifier le projet. Ce dernier décrit le travail prévu : une tâche planifiée ne constitue pas une fonctionnalité déjà implémentée. Mettre à jour ses états après vérification.

Le produit est un espace collaboratif pour entreprises : documents, départements, permissions, profils et chat. Conserver ce périmètre. Les entités du sujet de cours sont des exemples pour les relations JPA ; ne pas ajouter une entité Project uniquement pour reproduire l’exemple.

## Socle technique obligatoire pour la première livraison

### Spring MVC, Thymeleaf et React

- Utiliser Spring Boot et rendre les pages suivantes côté serveur avec Thymeleaf :

  | Route | Template |
  |---|---|
  | GET / | index.html |
  | GET /register | register.html |
  | GET /login | login.html |
  | GET /dashboard | dashboard.html |

- Utiliser réellement des fragments communs avec `th:fragment` et `th:replace` ou `th:insert` (en-tête, navigation, messages, par exemple).
- Protéger `/dashboard` : rediriger les visiteurs vers `/login` et afficher uniquement les documents/départements autorisés pour le membre connecté.
- Conserver React/TypeScript pour les interfaces métier interactives. Son routage et le déploiement doivent préserver les pages MVC et leur rendu Thymeleaf.
- Utiliser `@Controller` pour les pages et redirections, `@RestController` pour les réponses JSON.

### Bases de données

- Maintenir un profil Spring `h2` pour le cours et la recette, avec une base sur fichier afin de conserver les données après redémarrage.
- Ajouter un profil `postgres` pour PostgreSQL et le déploiement ; il complète le profil H2.
- Documenter les commandes d’activation dans le README et vérifier schéma, migrations et persistance sur les deux moteurs.

### Inscription, connexion et session

- Créer `RegisterDTO` avec tous les champs d’inscription, dont `password` et `confirmPassword` ; créer `LoginDTO` avec `email` et `password`.
- Ajouter `UserRepository.findByEmail` et contrôler les doublons d’email et d’identifiant.
- Dans `UserService.register`, vérifier les champs et la concordance des mots de passe, hacher avec le bean `PasswordEncoder` BCrypt, copier tous les champs et enregistrer l’utilisateur avec son `UserProfile`. La vérification doit être dans le service même si le contrôleur valide aussi le formulaire.
- Dans `UserService.findUser`, rechercher par email et vérifier le mot de passe avec `PasswordEncoder.matches`. Refuser les comptes en attente ou désactivés.
- Créer `PublicUser` sans mot de passe, hash ni secret de sécurité. Après connexion, renouveler l’identifiant de session et y stocker un `PublicUser`. Revérifier en base l’état du compte et les permissions pour les accès privés.
- Implémenter `POST /register` et `POST /login` pour les formulaires Thymeleaf, avec validation, affichage des erreurs, CSRF et redirections adaptées.
- Implémenter `POST /logout` pour invalider la session. Gérer session courante, rechargement et expiration.
- Les endpoints JSON `/api/...` utilisés par React partagent les mêmes DTO, services et session. Ils ne remplacent pas les routes MVC exigées.
- Conserver les sessions serveur et BCrypt prévus dans work.md. Ne pas migrer vers JWT ou remplacer BCrypt par SHA-256.

### Relations JPA

- `@OneToOne` : `User` ↔ `UserProfile`, avec création du profil pour chaque utilisateur.
- `@OneToMany` : enfants `Node` d’un `Folder` ou documents possédés par un `User`.
- `@ManyToMany` : contributeurs `User` d’un `Node`.
- L’association User/départements via Membership porte le niveau d’accès ; elle ne remplace pas la démonstration explicite de `@ManyToMany` sur les contributeurs.

## Validation et documentation

Appliquer les contrôles d’isolation par entreprise et les règles de permissions de work.md côté serveur pour les pages, l’API et le WebSocket.

Vérifier les parcours MVC/React, les erreurs d’inscription et de connexion, le contenu de session sans secrets, la déconnexion, les refus d’accès et les deux profils de base de données. La compilation seule ne valide pas ces parcours.

Garder work.md, le README, les contrats d’API et ce fichier cohérents avec les choix ci-dessus et distinguer ce qui reste à faire de ce qui est vérifié.
