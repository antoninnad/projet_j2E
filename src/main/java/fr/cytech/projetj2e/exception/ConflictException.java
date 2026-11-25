package fr.cytech.projetj2e.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Conflit avec l'état actuel d'une ressource (409) : nom déjà utilisé dans le dossier,
 * ou élément modifié depuis son chargement par le client (version périmée).
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
