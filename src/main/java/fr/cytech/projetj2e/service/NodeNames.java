package fr.cytech.projetj2e.service;

import org.springframework.stereotype.Component;

import fr.cytech.projetj2e.exception.ConflictException;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.repository.NodeRepository;

/**
 * Règles de nommage communes aux dossiers (T20) et aux fichiers (T21, T23) :
 * nom non vide, 255 caractères au plus, sans séparateur de chemin,
 * unique dans son dossier sans tenir compte de la casse.
 */
@Component
public class NodeNames {

    public static final int MAX_LENGTH = 255;

    private final NodeRepository nodeRepository;

    public NodeNames(NodeRepository nodeRepository) {
        this.nodeRepository = nodeRepository;
    }

    /** Nom nettoyé des espaces de bord ; IllegalArgumentException (400) s'il est invalide. */
    public static String valid(String rawName) {
        String name = rawName == null ? "" : rawName.trim();
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Le nom est obligatoire.");
        }
        if (name.length() > MAX_LENGTH) {
            throw new IllegalArgumentException("Le nom ne doit pas dépasser " + MAX_LENGTH + " caractères.");
        }
        if (name.contains("/") || name.contains("\\") || name.equals(".") || name.equals("..")) {
            throw new IllegalArgumentException("Le nom ne doit pas contenir « / » ou « \\ » ni valoir « . » ou « .. ».");
        }
        if (name.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException("Le nom ne doit pas contenir de caractère de contrôle.");
        }
        return name;
    }

    /** ConflictException (409) si le nom est déjà pris dans le dossier, hors l'élément excludedId. */
    public void requireFree(Folder parent, String name, Long excludedId) {
        boolean taken = excludedId == null
                ? nodeRepository.existsByParentAndNameIgnoreCase(parent, name)
                : nodeRepository.existsByParentAndNameIgnoreCaseAndIdNot(parent, name, excludedId);
        if (taken) {
            throw new ConflictException("Un élément nommé « " + name + " » existe déjà dans « " + parent.getName() + " ».");
        }
    }
}
