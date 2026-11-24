package fr.cytech.projetj2e.service;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.File;

/**
 * Cloisonnement du stockage disque par entreprise (T08).
 *
 * Arborescence : {app.storage.root}/companies/{idEntreprise}/{uuid}
 * - le répertoire racine est privé, hors des ressources statiques servies par Spring ;
 * - le nom sur disque est un UUID généré par le serveur, jamais le nom envoyé par le client ;
 * - File.storagePath contient le chemin relatif, qui ne doit jamais être renvoyé au client ;
 * - resolve() refuse tout chemin qui sortirait du répertoire de l'entreprise du fichier.
 *
 * L'écriture et la lecture des contenus sont faites par T21/T22 à partir de ces chemins.
 */
@Component
public class CompanyStorage {

    private static final String COMPANIES_DIR = "companies";

    private final Path root;

    public CompanyStorage(@Value("${app.storage.root:./storage}") String root) {
        this.root = Paths.get(root).toAbsolutePath().normalize();
    }

    public Path getRoot() {
        return root;
    }

    /** Répertoire privé d'une entreprise enregistrée. */
    public Path companyDirectory(Company company) {
        return root.resolve(COMPANIES_DIR).resolve(String.valueOf(requireCompanyId(company)));
    }

    /** Nouveau chemin relatif, unique, à enregistrer dans File.storagePath. */
    public String newStoragePath(Company company) {
        return COMPANIES_DIR + "/" + requireCompanyId(company) + "/" + UUID.randomUUID();
    }

    /** Chemin absolu du contenu d'un fichier, garanti dans le répertoire de son entreprise. */
    public Path resolve(File file) {
        Path companyDir = companyDirectory(file.getCompany());
        String storagePath = file.getStoragePath();
        if (storagePath == null || storagePath.isBlank()) {
            throw new IllegalStateException("Le fichier n'a pas de chemin de stockage.");
        }
        Path path = root.resolve(storagePath).normalize();
        if (!path.startsWith(companyDir) || path.equals(companyDir)) {
            throw new IllegalStateException("Chemin de stockage hors de l'espace de l'entreprise.");
        }
        return path;
    }

    private static Long requireCompanyId(Company company) {
        if (company == null || company.getId() == null) {
            throw new IllegalArgumentException("L'entreprise doit être enregistrée.");
        }
        return company.getId();
    }
}
