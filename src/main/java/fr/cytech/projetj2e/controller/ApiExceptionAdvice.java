package fr.cytech.projetj2e.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.util.unit.DataSize;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

import fr.cytech.projetj2e.exception.ConflictException;
import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.exception.StorageException;

@RestControllerAdvice
public class ApiExceptionAdvice {

    public record ErrorResponse(String code, String message) {}

    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionAdvice.class);

    /** Taille maximale d'un fichier importé (T21), rappelée dans le message 413. */
    @Value("${spring.servlet.multipart.max-file-size:1MB}")
    private DataSize maxFileSize;

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ErrorResponse> forbidden(ForbiddenException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse("FORBIDDEN", exception.getMessage()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> notFound(ResourceNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("NOT_FOUND", exception.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ErrorResponse> conflict(ConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("CONFLICT", exception.getMessage()));
    }

    /** Modification concurrente détectée par @Version au moment de l'écriture en base. */
    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<ErrorResponse> concurrentModification(ObjectOptimisticLockingFailureException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("CONFLICT",
                        "L'élément a été modifié entre-temps ; rechargez-le avant de réessayer."));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> badRequest(IllegalArgumentException exception) {
        return ResponseEntity.badRequest()
                .body(new ErrorResponse("VALIDATION_FAILED", exception.getMessage()));
    }

    /** Import plus gros que spring.servlet.multipart.max-file-size / max-request-size (T21). */
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ErrorResponse> payloadTooLarge(MaxUploadSizeExceededException exception) {
        return ResponseEntity.status(HttpStatus.CONTENT_TOO_LARGE)
                .body(new ErrorResponse("PAYLOAD_TOO_LARGE",
                        "Le fichier dépasse la taille maximale autorisée (" + maxFileSize.toMegabytes() + " Mo)."));
    }

    /** Échec disque : détail dans le journal du serveur, jamais de chemin dans la réponse. */
    @ExceptionHandler(StorageException.class)
    public ResponseEntity<ErrorResponse> storageError(StorageException exception) {
        LOG.error("Erreur de stockage", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("STORAGE_ERROR", exception.getMessage()));
    }
}
