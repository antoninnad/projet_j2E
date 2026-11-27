# T41 — Tests documents et chat : bilan

Ce document relie chaque règle métier des documents, du chat, de la recherche et de l'activité (sections 2.5 à 2.8
de `work.md`) aux tests automatisés qui la vérifient.

## Lancer les tests

```bash
./mvnw test                                   # profil h2 : H2 en mémoire (jamais data/projetdb)
./mvnw test -Dspring.profiles.active=postgres # PostgreSQL (POSTGRES_URL, POSTGRES_USER, POSTGRES_PASSWORD)
```

Le CI backend (`.github/workflows/backend-ci.yml`) lance les deux à chaque push.

## Trois niveaux de tests

| Niveau | Classes | Ce qu'ils prouvent |
|---|---|---|
| Services sur base réelle (`@DataJpaTest`, H2 en mémoire) | `*ServiceTest` | Règles métier et droits, avec les vraies requêtes JPA |
| Contrats HTTP (`@WebMvcTest`, services simulés) | `*RestControllerTest` | Routes, codes HTTP, format JSON des erreurs et des pages |
| **De bout en bout** (`@SpringBootTest`, serveur démarré) | `DocumentsApiIntegrationTest`, `ChatWebSocketIntegrationTest`, `PersistenceAcrossRestartTest` | Toute la pile : connexion par `/login`, session, CSRF, multipart réel, disque, WebSocket, migrations Flyway, redémarrage |

Les tests de bout en bout utilisent la base du profil actif : ils valident donc aussi les migrations V1 à V5
et les requêtes propres au projet (recherche, favoris, activité, non-lus) sur **PostgreSQL** dans le CI.
Seul `PersistenceAcrossRestartTest` force une base **H2 fichier**, celle qu'exige le sujet.

## Couverture des règles

### Isolation et accès (REST)

| Règle | Tests |
|---|---|
| Sans session : refus (403) | `DocumentsApiIntegrationTest.writesRequireASessionAndItsCsrfToken`, `ExplorerRestControllerTest.refusesAnAnonymousSession` |
| Écriture sans jeton CSRF : refus (403) | `DocumentsApiIntegrationTest.writesRequireASessionAndItsCsrfToken` |
| Élément d'une autre entreprise : 404 (lecture, contenu, favori, suppression, recherche) | `DocumentsApiIntegrationTest.otherCompaniesAndHiddenElementsLookNonExistent`, `CompanyIsolationServiceTest` |
| Élément au-dessus du niveau du membre : 404, absent de la recherche, des favoris et de l'activité | `DocumentsApiIntegrationTest.otherCompaniesAndHiddenElementsLookNonExistent`, `ExplorationServiceTest`, `SearchAndFavoriteServiceTest.resultsAreLimitedToVisibleElements` |
| Matrice des droits de la section 2.6 (voir, modifier, supprimer, gérer) | `PermissionServiceTest`, `FileManagementServiceTest.contributorCanSaveButNotDelete`, `DocumentsApiIntegrationTest.versionsPreventSilentOverwrites` (Bob, L = M, refusé) |

### Imports et stockage

| Règle | Tests |
|---|---|
| Fichier stocké sous un nom généré, dans le répertoire de son entreprise, chemin jamais renvoyé | `FileUploadServiceTest.storesTheContentPrivatelyWithItsMetadata`, `DocumentsApiIntegrationTest.uploadedFilesAreStoredPrivatelyReadBackAndLimited` |
| Stockage non servi par URL | `DocumentsApiIntegrationTest.uploadedFilesAreStoredPrivatelyReadBackAndLimited` |
| Taille limitée : 413 avec un message clair, rien d'écrit sur le disque | `DocumentsApiIntegrationTest.uploadedFilesAreStoredPrivatelyReadBackAndLimited` (vrai envoi), `FileUploadRestControllerTest.tooLargeUploadIs413WithTheLimit` |
| Droit de création, nom valide et libre, fichier non vide ; un refus n'écrit rien | `FileUploadServiceTest.refusedUploadsWriteNothing` |
| Chemin hors de l'entreprise refusé | `CompanyStorageTest.pathEscapingTheCompanyDirectoryIsRefused` |
| Contenu effacé si la transaction échoue | `CompanyStorageTest.storedContentIsRemovedWhenTheTransactionRollsBack` |
| Aperçu sans contenu actif (HTML en texte, SVG en pièce jointe), `nosniff`, ETag, Range | `FileContentRestControllerTest`, `FileContentServiceTest.onlyPassiveFormatsArePreviewed` |

### Arborescence : cycles et sous-arbres

| Règle | Tests |
|---|---|
| Un dossier ne peut pas entrer dans lui-même ou un descendant (cycle) | `FolderTreeTest.movingAFolderIntoItselfOrItsDescendantIsRefused`, `FolderManagementServiceTest.refusesMovesThatBreakTheTree`, `DocumentsApiIntegrationTest.cyclesAndProtectedSubtreesAreRefused` |
| Seuil d'un enfant au moins égal à celui du parent ; déplacement vers un seuil supérieur refusé | `FolderTreeTest.childThresholdCannotBeLowerThanParent`, `FolderTreeTest.movingIntoAFolderWithHigherThresholdIsRefused` |
| Pas de déplacement vers une autre entreprise | `FolderTreeTest.movingToAnotherCompanyIsRefused` |
| Déplacement : le sous-arbre suit, y compris vers un autre département | `FolderManagementServiceTest.movesAFolderWithItsSubtree`, `movingToAnotherDepartmentMovesTheWholeSubtree` |
| Suppression d'un dossier : droit exigé sur tout le sous-arbre, sinon rien n'est supprimé | `FolderManagementServiceTest`, `DocumentsApiIntegrationTest.cyclesAndProtectedSubtreesAreRefused` |
| Racines de département : ni déplacées ni supprimées ici | `FolderManagementServiceTest.refusesMovesThatBreakTheTree`, `refusesInvalidRenames` |

### Versions et écriture

| Règle | Tests |
|---|---|
| Version obligatoire pour enregistrer ; version périmée : 409, rien n'est écrit | `FileManagementServiceTest.staleOrMissingVersionIsRefusedAndWritesNothing`, `DocumentsApiIntegrationTest.versionsPreventSilentOverwrites` |
| Deux enregistrements de la même version : le second est refusé | `FileManagementServiceTest.secondSaveWithTheSameLoadedVersionIsAConflict` |
| Modification concurrente détectée par `@Version` : 409 | `FileManagementRestControllerTest.staleVersionIsAConflict`, `FolderRestControllerTest` |
| Nouveau contenu écrit à part ; l'ancien gardé jusqu'à la validation | `FileManagementServiceTest.savingTextCreatesANewVersionWithoutOverwritingTheOldContent` |

### Persistance

| Règle | Tests |
|---|---|
| Base H2 fichier : documents, contenu, favoris, activité et messages conservés après redémarrage | `PersistenceAcrossRestartTest` |
| Migrations Flyway appliquées et schéma validé (`ddl-auto=validate`), sur H2 et PostgreSQL | tous les tests de bout en bout |

### Chat (REST et WebSocket)

| Règle | Tests |
|---|---|
| Conversation entre deux membres actifs de la même entreprise | `ChatServiceTest.onlyActiveColleaguesCanBeContacted`, `DocumentsApiIntegrationTest.conversationsAreOnlyReachableByTheirParticipants` |
| Seuls les participants accèdent à l'historique, administrateur compris (404) | `ChatServiceTest.onlyTheTwoParticipantsCanAccessTheConversation`, `DocumentsApiIntegrationTest.conversationsAreOnlyReachableByTheirParticipants` |
| Envoi idempotent : pas de doublon au renvoi | `ChatServiceTest.resendingTheSameClientMessageIdDoesNotDuplicate`, `ChatWebSocketIntegrationTest.participantsReceiveNewMessagesAndOthersDoNot` |
| Historique paginé et rattrapage après coupure (`after`) | `ChatServiceTest.historyIsPagedChronologicallyWithCursors` |
| Non-lus et marqueur de lecture | `ChatServiceTest.unreadCountsFollowTheReadMarker`, `DocumentsApiIntegrationTest.conversationsAreOnlyReachableByTheirParticipants` |
| WebSocket : session requise, même origine, refus sinon (403) | `ChatWebSocketIntegrationTest.handshakeRequiresAnAuthenticatedSessionFromTheSameOrigin` |
| WebSocket : seuls les participants reçoivent les événements | `ChatWebSocketIntegrationTest.participantsReceiveNewMessagesAndOthersDoNot`, `ChatRealtimeNotifierTest` |
| WebSocket : fermeture 4401 à la déconnexion ; compte désactivé coupé | `ChatWebSocketIntegrationTest.logoutClosesTheSocketWithACodeThatForbidsReconnecting`, `ChatRealtimeNotifierTest.disabledRecipientIsDisconnectedInsteadOfNotified` |

### Recherche, favoris et activité

| Règle | Tests |
|---|---|
| Recherche limitée aux éléments autorisés ; `%` et `_` cherchés tels quels | `SearchAndFavoriteServiceTest`, `DocumentsApiIntegrationTest.otherCompaniesAndHiddenElementsLookNonExistent` |
| Favori : personnel, sans droit supplémentaire, masqué si l'accès est retiré, supprimé avec l'élément | `SearchAndFavoriteServiceTest.aFavoriteGivesNoRightAndHidesWhileAccessIsRemoved`, `removingIsIdempotentAndDeletionRemovesFavorites` |
| Activité : administrateur = toute l'entreprise, membre = éléments accessibles ; historique d'un élément supprimé protégé par son dernier seuil | `ActivityServiceTest` |
| Opération refusée non journalisée ; ni contenu ni message de chat dans le journal | `ActivityServiceTest.refusedOperationsAreNotJournaled` |

## Vérifié à la main (application démarrée)

Chaque tâche B2 a aussi été vérifiée sur l'application démarrée, sur une base et un stockage temporaires
(détails dans les sections d'avancement de `work.md`) : migration d'une copie de `data/projetdb`,
échange de messages entre quatre comptes, disque synchronisé après enregistrement et suppression.

## Hors du périmètre de T41

- Parcours dans le navigateur (React) : T42 (F1) et T43 (F2).
- Charge, analyse antivirus des imports, quotas : évolutions après la livraison (section 2.9).
