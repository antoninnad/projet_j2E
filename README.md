# Projet J2EE

Application Spring Boot avec Thymeleaf, structurée comme les projets de `dev_JEE`.

## Démarrer

Depuis ce dossier :

```bash
./mvnw spring-boot:run
```

La page d’accueil est disponible sur <http://localhost:8080/>.



## Securité

### Gestion Connexion

On utilisera un jwt: signé par la variable `SECRET_APPLICATION` dans le `.env`:
-  `flux access token` cookie signé token de 5 minutes 
-  `refresh token` cookie signé d'une semaine pour regénérer le token de 5 minutes

Le nom du patter est le `pattern access token / refresh token`.

### Encryptage de mot de passe

Comme demandé on ajoutera dans la classe `User` associé à la table `User` le paramètre `salt`.

On hashera le mdp avec du sha256(`mot de passe` + `salt`)