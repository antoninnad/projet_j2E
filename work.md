# Espace collaboratif pour entreprises — Fonctionnalités et organisation du travail

## 1. Objectif du projet

Créer un espace de travail permettant aux salariés d’une entreprise de partager et gérer des dossiers et fichiers, de contrôler les accès, de consulter les profils de leurs collègues et de communiquer par chat privé.

La première livraison est une **démonstration complète avec plusieurs entreprises isolées**. Un compte appartient à une seule entreprise. Les documents, profils et conversations d’une entreprise ne sont jamais accessibles à une autre entreprise.

Le projet repose sur React/TypeScript pour le frontend et Spring Boot/Java pour le backend. Les fonctionnalités doivent être branchées sur les API réelles et conserver leurs données après un redémarrage.

## 2. Fonctionnalités attendues

### 2.1 Entreprises et administration

Un administrateur de plateforme crée une entreprise et son premier administrateur. Chaque entreprise dispose ensuite de ses propres membres, départements et documents. Son administrateur peut approuver les inscriptions, refuser une demande et désactiver un compte.

L’administration de plateforme gère la création des entreprises ; elle n’offre pas d’accès aux documents ou aux messages privés. L’administrateur d’entreprise gère les documents de son entreprise, mais ne peut pas consulter les conversations privées auxquelles il ne participe pas.

### 2.2 Inscription, connexion et déconnexion

Une personne s’inscrit avec son nom, prénom, email, identifiant, mot de passe et code d’entreprise. Le code identifie l’entreprise demandée ; l’accès nécessite toujours l’approbation de son administrateur. Un compte en attente ou désactivé ne peut pas utiliser l’espace de travail.

Après connexion, la session est restaurée lors du rechargement de la page. La déconnexion termine la session. Une session expirée ramène à la connexion avec un message explicite. Les sessions serveur et BCrypt existants sont conservés et sécurisés ; une migration JWT ne fait pas partie de cette livraison.

### 2.3 Profils et annuaire

Chaque membre peut modifier son nom, prénom, sa biographie, son avatar et son mot de passe. L’annuaire permet de rechercher les collègues actifs de son entreprise et de consulter leur profil. Depuis un profil, il est possible d’ouvrir une conversation privée.

Les profils publics internes ne contiennent ni mot de passe ni donnée technique de sécurité. La modification d’un profil est réservée à son propriétaire.

### 2.4 Départements et membres

L’administrateur crée les départements de l’entreprise, par exemple Finance ou Ressources humaines. Chaque département possède un dossier racine créé automatiquement. Il affecte les membres aux départements et leur attribue un niveau d’accès numérique ; un membre peut appartenir à plusieurs départements.

Le niveau d’accès est une autorisation métier, indépendante de la profondeur du dossier dans l’arborescence. Les niveaux ne donnent aucun accès à une autre entreprise.

### 2.5 Dossiers et fichiers

L’explorateur affiche les départements et éléments accessibles, avec navigation dans les dossiers, fil d’Ariane et pagination. Selon ses droits, un membre peut :

- créer, renommer, déplacer et supprimer un dossier ;
- importer un fichier par sélection ou glisser-déposer ;
- consulter ses informations et télécharger son contenu ;
- prévisualiser les textes, images et PDF, ou télécharger les autres formats ;
- modifier et enregistrer un fichier texte, annuler son brouillon ou remplacer un fichier binaire.

Une sauvegarde vérifie que le fichier n’a pas changé depuis son ouverture. En cas de conflit, l’interface conserve le brouillon et demande de recharger la version récente avant de réessayer. La suppression d’un dossier annonce qu’elle supprime aussi son contenu et demande confirmation.

### 2.6 Permissions et partage

Pour un département donné, `L` représente le niveau du membre et `M` le seuil minimum du fichier ou dossier. Sans adhésion au département, l’accès est refusé, sauf pour l’administrateur de cette entreprise.

| Situation | Voir / télécharger | Modifier | Supprimer | Gérer seuil et contributeurs |
|---|---|---|---|---|
| Compte extérieur à l’entreprise, inactif ou non connecté | Non | Non | Non | Non |
| Membre avec `L < M`, même propriétaire ou contributeur | Non | Non | Non | Non |
| Membre simple avec `L = M` | Oui | Non | Non | Non |
| Contributeur avec `L = M` | Oui | Oui | Non | Non |
| Propriétaire avec `L = M` | Oui | Oui | Oui | Oui |
| Membre avec `L > M` | Oui | Oui | Oui | Oui |
| Administrateur de cette entreprise | Oui | Oui | Oui | Oui |

Un panneau de partage présente le propriétaire, le seuil et les contributeurs. Ajouter un contributeur ne contourne pas le seuil d’accès. Un membre ne peut définir un seuil supérieur à son propre niveau ; l’administrateur peut le faire.

Le seuil d’un enfant est au moins celui du parent. Un changement de seuil ou un déplacement qui rendrait l’arbre incohérent est refusé avec une explication. Un déplacement vérifie les droits sur l’élément et sur le dossier cible, interdit les cycles et reste dans la même entreprise. La suppression d’un dossier exige les droits sur tout le sous-arbre.

La création d’un enfant nécessite le droit de modification du dossier parent. Le serveur vérifie les permissions pour chaque requête et renvoie les actions autorisées pour aider l’interface à afficher les bons boutons.

### 2.7 Chat privé

Deux membres actifs de la même entreprise peuvent échanger des messages texte. Ils retrouvent la liste de leurs conversations, un historique paginé et leurs messages non lus. Les nouveaux messages arrivent en temps réel.

Après une coupure, le client se reconnecte et recharge les messages manquants sans les dupliquer. Un message en cours d’envoi ou en échec possède un état visible. Seuls les deux participants peuvent accéder à l’historique et aux événements de la conversation.

### 2.8 Recherche, favoris et activité

La recherche retrouve uniquement les dossiers et fichiers autorisés. Les favoris sont personnels et persistants ; un favori ne donne pas de droit supplémentaire et disparaît de la vue si l’accès est retiré.

L’activité indique les opérations sur les documents et les changements de droits avec leur auteur et leur date. Sa consultation respecte les accès : un membre voit l’activité des documents accessibles, l’administrateur celle de son entreprise. Le contenu des chats et les secrets ne sont pas journalisés.

### 2.9 Qualité de la démonstration et évolutions

Toutes les pages proposent des états de chargement, d’absence de données et d’erreur. Les écrans sont utilisables sur mobile et au clavier, avec des libellés français cohérents. La démo comprend des données de deux entreprises et plusieurs niveaux de permissions.

Après la première livraison : coédition simultanée, historique complet des versions, corbeille, conversations de groupe, récupération de mot de passe par email, notifications générales, quotas et analyse antivirus des imports. Ces évolutions ne bloquent pas la démo.

## 3. Répartition de l’équipe

Les identifiants ci-dessous seront remplacés par les prénoms des quatre personnes.

| Équipe | Personne | Responsabilité principale |
|---|---|---|
| Frontend | **F1** | Structure commune, comptes, profils, administration et partage |
| Frontend | **F2** | Explorateur, opérations sur les documents et chat |
| Backend | **B1** | Entreprises, comptes, sessions, profils et moteur de permissions |
| Backend | **B2** | Arborescence, stockage des fichiers, chat et activité |

Chaque tâche possède un responsable principal. Les contrats d’API et les règles métier sont relus par les quatre personnes. F1/B1 et F2/B2 coordonnent l’intégration de leurs fonctionnalités ; B1 et B2 coordonnent le modèle et les contrôles d’accès.

## 4. Tableau des tâches

**Priorités :** P0 = fondation indispensable ; P1 = nécessaire à la démo ; P2 = après la démo. La phase et les dépendances déterminent l’ordre réel de travail.

**États :** À faire = développement restant ; Partiel = base existante à compléter ; À vérifier = réalisation présente mais validation restante ; Terminé = critères vérifiés. Les états initiaux reflètent l’inspection du dépôt, sans considérer une entité ou une maquette comme une fonctionnalité complète.

Une dépendance désigne un prérequis pour terminer et intégrer la tâche. L’interface peut commencer sur des réponses simulées conformes au contrat d’API avant la disponibilité du backend.

| ID | Fonctionnalité | Tâche concrète | Responsable | Priorité | État actuel | Dépend de | Résultat attendu |
|---|---|---|---|---|---|---|---|
| T01 | Contrats d’API | Documenter routes, DTO, pagination et erreurs dans OpenAPI ; faire relire par l’équipe | B1 | P0 | À faire | — | Contrats utilisables par les deux équipes |
| T02 | Socle frontend | Unifier les pages de comptes et l’espace TypeScript dans un routeur et un style communs | F1 | P0 | Partiel | T01 | Une application avec des routes cohérentes |
| T03 | Intégration frontend | Créer client API, types partagés, gestion des erreurs et réponses simulées | F2 | P0 | À faire | T01 | Appels homogènes et travail frontend indépendant |
| T04 | Modèle entreprises | Modéliser entreprises, comptes, profils, départements et adhésions | B1 | P0 | Partiel | T01 | Relations et rattachements d’entreprise définis |
| T05 | Modèle documents | Compléter Node/File avec Folder, parenté, seuil, version et entreprise ; fournir la création interne des racines | B2 | P0 | Partiel | T04 | Arborescence persistable et modèle relu avec B1 |
| T06 | Base de données | Configurer PostgreSQL, migrations et environnements ; intégrer les tables de B2 | B1 | P0 | À faire | T04, T05 | Schéma reproductible et données persistantes |
| T07 | Isolation des comptes | Centraliser l’identité, l’entreprise courante et les restrictions des services comptes/profils | B1 | P0 | À faire | T06 | Identité fiable sans entreprise choisie librement par le client |
| T08 | Isolation des ressources | Filtrer documents et stockage par entreprise ; fournir les contrôles réutilisés pour le chat | B2 | P0 | À faire | T05, T07 | Aucun accès par référence à une autre entreprise |
| T09 | Intégration continue backend | Automatiser compilation, tests backend et migrations sur base de test | B1 | P0 | À faire | T06 | Échecs détectés avant intégration |
| T10 | Intégration continue frontend | Automatiser types, build et contrôles frontend avec la version Node requise | F1 | P0 | À faire | T02, T03 | Frontend compilable après chaque intégration |
| T11 | Sessions et sécurité | Compléter session courante/déconnexion, rotation de session, rôles, CSRF et cookies | B1 | P0 | Partiel | T07 | Accès privés centralisés et comptes inactifs exclus |
| T12 | Entreprises et inscription | Créer entreprise/premier administrateur ; corriger inscription JSON, champs et doublons | B1 | P0 | Partiel | T11 | Compte créé dans la bonne entreprise en attente d’approbation |
| T13 | Écrans d’accès | Brancher création d’entreprise, inscription, connexion et déconnexion ; protéger les routes | F1 | P0 | Partiel | T02, T03, T11, T12 | Parcours d’accès avec erreurs et expiration de session |
| T14 | Administration des comptes | Compléter approbation/refus/désactivation dans l’entreprise administrée | B1 | P1 | Partiel | T12 | Contrôles de rôle et révocation d’accès effectifs |
| T15 | Départements | Développer gestion des départements, membres et niveaux ; utiliser la création interne des racines fournie en T05 | B1 | P0 | À faire | T08, T11 | Adhésions et dossiers racines cohérents |
| T16 | Permissions | Implémenter le service central selon la matrice ; exposer les actions autorisées | B1 | P0 | À faire | T15 | Décisions de droits réutilisables par les services |
| T17 | Administration frontend | Brancher demandes de comptes, désactivation, départements et niveaux des membres | F1 | P1 | Partiel | T13, T14, T15 | Administration utilisable avec les données réelles |
| T18 | Exploration backend | Créer racines et API des enfants visibles, pagination et métadonnées | B2 | P1 | À faire | T08, T16 | Arborescence limitée aux éléments autorisés |
| T19 | Exploration frontend | Brancher navigation, fil d’Ariane et pagination ; afficher les actions permises | F2 | P1 | Partiel | T03, T18 | Explorateur connecté à l’API |
| T20 | Dossiers backend | Créer/renommer/déplacer/supprimer ; contrôler cycles, seuils et sous-arbres | B2 | P1 | À faire | T18 | Opérations cohérentes et protégées |
| T21 | Stockage et import | Développer upload multipart, limites et stockage privé hors ressources publiques | B2 | P1 | À faire | T18 | Fichier stocké avec ses métadonnées et sans chemin public |
| T22 | Lecture des fichiers | Servir contenu, métadonnées et téléchargement avec contrôle des droits | B2 | P1 | À faire | T21 | Lecture protégée sans exposition des chemins physiques |
| T23 | Écriture des fichiers | Sauvegarder/remplacer avec contrôle de version ; déplacer/supprimer en synchronisant base et disque | B2 | P1 | À faire | T20, T22 | Pas d’écrasement silencieux ni de suppression incohérente |
| T24 | Import et dossiers frontend | Brancher création et actions dossiers ; ajouter upload, progression et confirmations | F2 | P1 | Partiel | T19, T20, T21 | Documents importables et dossiers administrables selon droits |
| T25 | Consultation frontend | Afficher détails, aperçus texte/image/PDF et téléchargement des autres formats | F2 | P1 | Partiel | T19, T22 | Consultation réelle des fichiers autorisés |
| T26 | Édition frontend | Brancher sauvegarde, annulation, remplacement et gestion des conflits ; déplacement/suppression | F2 | P1 | Partiel | T23, T24, T25 | Éditeur persistant et brouillon préservé en cas de conflit |
| T27 | Partage backend | Gérer seuils et contributeurs en appliquant permissions et intégrité de l’arbre | B1 | P1 | À faire | T16, T20 | Partage protégé sans contournement des niveaux |
| T28 | Partage frontend | Ajouter le panneau propriétaire/seuil/contributeurs et les messages de refus | F1 | P1 | À faire | T17, T19, T27 | Droits consultables et modifiables selon autorisation |
| T29 | Profils et annuaire backend | Créer API profils, avatar, changement du mot de passe et recherche paginée des collègues | B1 | P1 | Partiel | T11, T14 | Données validées et consultation interne à l’entreprise |
| T30 | Profils et annuaire frontend | Créer édition du profil, avatar, mot de passe et recherche de collègues | F1 | P1 | À faire | T13, T29 | Profil persistant et annuaire fonctionnel |
| T31 | Recherche et favoris backend | Ajouter recherche filtrée par droits et favoris personnels persistants | B2 | P1 | À faire | T23 | Résultats et favoris sans fuite de documents |
| T32 | Recherche et favoris frontend | Brancher recherche et vue des favoris sur les API | F2 | P1 | Partiel | T19, T31 | Favoris conservés et résultats autorisés |
| T33 | Chat persistant backend | Créer conversations à deux, envoi, historique paginé et état de lecture | B2 | P1 | À faire | T08, T11, T29 | Messages persistants accessibles uniquement aux participants |
| T34 | Chat temps réel backend | Ajouter WebSocket authentifié, contrôle des abonnements et reprise après coupure | B2 | P1 | À faire | T33 | Livraison des messages sans accès indu ni duplication |
| T35 | Chat frontend | Créer liste et historique, lancement depuis un profil, envoi, non-lus et reconnexion | F2 | P1 | À faire | T03, T30, T33, T34 | Deux navigateurs peuvent discuter en temps réel |
| T36 | Activité backend | Étendre Log et journaliser auteurs/dates/opérations ; filtrer la consultation par droits | B2 | P1 | Partiel | T23, T27 | Historique exploitable sans secrets ni messages privés |
| T37 | Activité frontend | Afficher opérations récentes et auteurs des modifications | F1 | P1 | À faire | T28, T36 | Activité réelle visible selon les accès |
| T38 | Qualité écrans F1 | Traiter chargements, erreurs, états vides, mobile, clavier et libellés français | F1 | P1 | Partiel | T17, T28, T30, T37 | Parcours comptes/administration/profils accessibles |
| T39 | Qualité écrans F2 | Traiter les mêmes états pour explorateur, éditeur, upload et chat | F2 | P1 | Partiel | T26, T32, T35 | Parcours documents/chat accessibles |
| T40 | Tests comptes et permissions | Tester sessions, comptes inactifs, isolation, rôles et chaque case de la matrice | B1 | P0 | À faire | T11, T16 | Refus d’accès démontrés par tests automatisés |
| T41 | Tests documents et chat | Tester uploads, cycles, sous-arbres, versions, persistance et accès aux conversations | B2 | P0 | À faire | T23, T34, T36 | Règles métier et isolation REST/WebSocket vérifiées |
| T42 | Tests frontend F1 | Automatiser inscription/approbation/connexion, profil, partage et expiration de session | F1 | P1 | À faire | T38, T40 | Parcours F1 vérifiés et contrôle mobile réalisé |
| T43 | Tests frontend F2 | Automatiser import/édition/conflit, favoris et conversation entre deux comptes | F2 | P1 | À faire | T39, T41 | Parcours F2 vérifiés et contrôle mobile réalisé |
| T44 | Déploiement backend | Préparer Docker Compose, PostgreSQL, volumes, secrets, HTTPS et passage WebSocket | B1 | P1 | À faire | T09, T40, T41 | Backend et stockage déployables avec données durables |
| T45 | Déploiement frontend | Servir le build avec routage SPA, API et WebSocket ; vérifier le point d’entrée commun | F1 | P1 | À faire | T10, T42, T43, T44 | Application utilisable sur l’URL de démo |
| T46 | Données et sauvegarde | Préparer deux entreprises, comptes et documents ; documenter et vérifier restauration base/fichiers | B2 | P1 | À faire | T36, T44 | Démo reproductible et restauration contrôlée |
| T47 | Documentation et recette | Mettre à jour guides installation/utilisation et recueillir la validation des quatre personnes | F1 | P1 | À faire | T45, T46 | Consignes vérifiées et checklist de livraison complétée |
| T48 | Démonstration | Préparer le scénario complet, exécuter la recette sur l’hébergement et suivre les corrections | F2 | P1 | À faire | T45, T46 | Parcours complet présenté sans données simulées |
| T49 | Évolutions interface | Décrire groupes, coédition, versions, corbeille et notifications ; chiffrer avec F1 | F2 | P2 | À faire | T47, T48 | Backlog d’évolutions distinct de la démo |
| T50 | Évolutions backend | Décrire récupération par email, quotas, antivirus et exploitation ; chiffrer avec B2 | B1 | P2 | À faire | T47, T48 | Backlog technique priorisé après livraison |

## 5. Chronologie de réalisation

Aucune échéance n’est fixée : les phases décrivent l’ordre et les dépendances, sans attribuer de dates ni de durées arbitraires. Les tâches d’une cellule ne sont pas nécessairement simultanées ; leurs dépendances figurent dans le tableau précédent.

| Phase | F1 — Frontend 1 | F2 — Frontend 2 | B1 — Backend 1 | B2 — Backend 2 | Condition de passage |
|---|---|---|---|---|---|
| **1 — Fondations** | Structure et CI frontend : T02, T10 | Client API, types et simulations : T03 | Contrats, modèle comptes, base, contexte entreprise et CI : T01, T04, T06, T07, T09 | Modèle documents et isolation : T05, T08 | Contrats relus, modèle partagé et base persistante ; application frontend compilable |
| **2 — Comptes et droits** | Accès et administration : T13, T17 | Début de l’explorateur T19 sur simulations puis API | Sessions, inscriptions, approbation, départements et permissions : T11, T12, T14, T15, T16 ; premiers tests T40 | Exploration et racines : T18, puis début des dossiers T20 | Inscription → approbation → connexion fonctionnelles ; droits et isolation vérifiés |
| **3 — Documents** | Panneau de partage : T28 ; début profils T30 dès contrat disponible | Explorateur et opérations documents : fin T19, T24, T25, T26 | Partage T27 et profils/annuaire T29 ; enrichissement T40 | Fin dossiers T20, import/lecture/écriture T21–T23 ; début tests T41 | Importer, consulter, modifier, partager, déplacer et supprimer selon les droits ; conflit d’édition traité |
| **4 — Collaboration** | Fin profils T30, activité T37 et qualité T38 | Recherche/favoris T32, chat T35 et qualité T39 | Finalisation sécurité T40 ; assistance d’intégration | Recherche/favoris T31, chat T33–T34, activité T36 ; enrichissement T41 | Profils, favoris, activité et chat fonctionnent avec les données réelles |
| **5 — Recette et livraison** | Tests T42, déploiement frontend T45 et documentation T47 | Tests T43 et démonstration T48 | Finalisation T40, déploiement backend T44 | Finalisation T41, données et restauration T46 | Checklist validée sur l’hébergement par les quatre personnes |
| **Après la démo** | Contribution au backlog interface | Évolutions interface T49 | Évolutions backend T50 | Contribution au backlog technique | Évolutions priorisées séparément |

### Coordination entre les équipes

- Valider les contrats d’API avant leur intégration ; faire évoluer la documentation, les DTO et les types frontend ensemble.
- Faire développer les écrans sur des réponses simulées tant que l’API n’est pas prête, puis vérifier chaque parcours sur le backend réel.
- Faire relire par B1 l’usage du service de permissions dans les services documents et chat de B2.
- Ajouter les tests et les états d’interface pendant le développement ; les tâches de recette terminent leur couverture avant livraison.
- Garder la phase 5 pour l’intégration finale, les corrections et la démonstration. Mettre à jour l’état de chaque tâche et signaler ses blocages lors des points d’équipe.

## 6. Checklist de validation de la livraison

Une fonctionnalité est terminée lorsque son interface utilise l’API réelle, que ses données sont persistées, que ses droits sont contrôlés côté serveur et que ses cas d’erreur ont été vérifiés.

- [ ] Les quatre personnes peuvent lancer le projet depuis les instructions du dépôt avec les mêmes versions d’outils.
- [ ] Une entreprise et son administrateur peuvent être créés sans donner accès aux données d’une autre entreprise.
- [ ] Une inscription conserve tous les champs ; l’approbation est nécessaire pour accéder à l’espace.
- [ ] La connexion, la restauration de session, la déconnexion et l’expiration fonctionnent ; un compte désactivé perd son accès.
- [ ] Les profils, avatars et changements du mot de passe sont enregistrés ; l’annuaire reste limité à l’entreprise.
- [ ] Créer un département produit son dossier racine ; les membres et leurs niveaux sont modifiables.
- [ ] Chaque cas de la matrice des permissions est vérifié, y compris propriétaire/contributeur sous le seuil.
- [ ] Modifier directement une URL, une requête API ou un abonnement WebSocket ne permet aucun accès interdit, notamment entre entreprises.
- [ ] Les dossiers et fichiers peuvent être créés/importés, consultés, modifiés, déplacés et supprimés selon les droits.
- [ ] Les cycles, seuils incohérents et suppressions de sous-arbres non autorisées sont refusés ; les imports respectent les limites configurées.
- [ ] Deux éditions concurrentes produisent un conflit explicite et préservent le brouillon local.
- [ ] La recherche, les favoris et l’activité n’exposent aucun document devenu inaccessible.
- [ ] Deux comptes actifs de la même entreprise échangent en temps réel ; historique, non-lus et reconnexion fonctionnent sans doublons.
- [ ] Un tiers, même administrateur, ne peut pas lire une conversation privée à laquelle il ne participe pas.
- [ ] Les comptes, documents, profils, favoris et messages survivent au redémarrage ; une sauvegarde base/fichiers a été restaurée avec succès.
- [ ] Les écrans sont vérifiés sur mobile et au clavier, avec chargement, états vides et erreurs lisibles.
- [ ] La CI passe ; l’URL de démonstration sert les routes frontend, l’API et le WebSocket.
- [ ] La démonstration utilise deux entreprises et plusieurs niveaux de droits, sans dépendre des données simulées du frontend.
