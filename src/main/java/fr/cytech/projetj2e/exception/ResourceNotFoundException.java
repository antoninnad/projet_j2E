package fr.cytech.projetj2e.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Ressource absente OU appartenant à une autre entreprise.
 * Les deux cas renvoient la même réponse 404 pour ne pas révéler
 * l'existence des données d'une autre entreprise.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
