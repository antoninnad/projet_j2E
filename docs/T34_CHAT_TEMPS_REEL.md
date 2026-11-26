# T34 — Chat temps réel : protocole WebSocket

Ce document décrit ce que le module chat React (T35) doit faire pour recevoir les messages en temps réel.
Les routes REST du chat (T33) sont décrites dans `openapi.yaml`, tag Chat.

## Principe

- **Envoyer, relire, marquer comme lu : en REST** (`/api/conversations/...`), avec le jeton CSRF comme le reste de l'API.
- **Recevoir : par la WebSocket** `/ws/chat`. Le serveur y pousse les événements des conversations du compte connecté.
- Le client ne s'abonne à rien : le serveur n'envoie à un compte que les événements de **ses** conversations.
  Un autre compte, administrateur compris, ne reçoit jamais un message qui ne le concerne pas.

## Connexion

```ts
const url = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws/chat`
const socket = new WebSocket(url) // le cookie de session est envoyé automatiquement
```

- Il faut être connecté (session HTTP d'un membre actif). Sinon, la poignée de main est refusée (403) et le navigateur
  déclenche `onerror` puis `onclose` avec le code 1006.
- Seules les pages de la même origine peuvent l'ouvrir. En développement, Vite relaie `/ws` vers le port 8080
  (`vite.config.js`), donc la même URL fonctionne sur `localhost:5173`.

## Événements reçus (serveur → client)

Chaque message est un objet JSON avec un champ `type`.

| `type` | Champs | Quand |
|---|---|---|
| `ready` | `userId` | Juste après l'ouverture : la connexion est authentifiée |
| `message.created` | `conversationId`, `message` (même format que `ChatMessage` en REST, `mine` calculé pour le destinataire) | Nouveau message dans une de mes conversations, envoyé par moi (autre onglet compris) ou par mon correspondant |
| `conversation.read` | `conversationId`, `readerId`, `lastReadMessageId` | Un participant a lu jusqu'à ce message. Si `readerId` est moi : mettre à jour mes non-lus (autres onglets) ; sinon : accusé de lecture |
| `pong` | — | Réponse à un `ping` |
| `error` | `message` | Le client a envoyé autre chose qu'un `ping` |

Exemple :

```json
{"type":"message.created","conversationId":3,"message":{"id":42,"conversationId":3,"senderId":7,"content":"Réunion à 14 h ?","sentAt":"2026-11-26T10:15:00Z","clientMessageId":"c-1","mine":false}}
```

## Messages envoyés (client → serveur)

Uniquement `{"type":"ping"}`, **toutes les 30 secondes**. Sans trafic pendant 2 minutes, le serveur ferme la connexion.

## Codes de fermeture

| Code | Signification | Que faire |
|---|---|---|
| `4401` | Session terminée (déconnexion, expiration) ou compte désactivé | **Ne pas se reconnecter** : rediriger vers `/login?expired` |
| `4429` | Plus de 10 connexions ouvertes pour ce compte | Ne pas se reconnecter ; proposer de fermer d'autres onglets |
| autres (1001, 1006, 1011…) | Coupure réseau, redémarrage du serveur | Se reconnecter avec un délai croissant (1 s, 2 s, 4 s… jusqu'à 30 s) |

## Reprise après coupure (sans perte ni doublon)

1. Retenir, pour chaque conversation affichée, l'`id` du dernier message reçu.
2. À la reconnexion (événement `ready`), recharger ce qui a été manqué :
   `GET /api/conversations/{id}/messages?after={dernierId}`, à rappeler tant que `hasMore` vaut `true`.
   Recharger aussi `GET /api/conversations` (liste et non-lus).
3. Ignorer tout message dont l'`id` est déjà affiché : un même message peut arriver par la WebSocket et par le rattrapage.

## Envoi avec état visible

1. Générer un `clientMessageId` (`crypto.randomUUID()`), afficher le message en **« envoi… »**.
2. `POST /api/conversations/{id}/messages` avec `{content, clientMessageId}`.
   - `201` ou `200` : remplacer le message en attente par celui de la réponse (même `clientMessageId`).
   - Erreur réseau : afficher **« échec — réessayer »** ; réessayer avec le **même** `clientMessageId`.
     Si le premier envoi était en fait arrivé, le serveur répond `200` avec le message existant : pas de doublon.
   - `403` : le correspondant n'est plus actif (`canSend: false`), conversation en lecture seule.
3. L'événement `message.created` de ce même message arrive aussi sur la WebSocket : le rapprocher par `clientMessageId` ou `id`.

## Lecture

Quand la conversation est affichée et que de nouveaux messages arrivent, appeler
`POST /api/conversations/{id}/read` avec `{"lastMessageId": <id du dernier message affiché>}`.
Le badge global vient de `GET /api/conversations/unread`.
