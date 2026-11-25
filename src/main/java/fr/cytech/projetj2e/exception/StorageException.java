package fr.cytech.projetj2e.exception;

/** Échec d'écriture ou de lecture dans le stockage privé des fichiers (500, sans chemin dans le message). */
public class StorageException extends RuntimeException {

    public StorageException(String message) {
        super(message);
    }

    public StorageException(String message, Throwable cause) {
        super(message, cause);
    }
}
