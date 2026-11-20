package fr.cytech.projetj2e.service;

import java.nio.file.Path;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.FileRepository;
import fr.cytech.projetj2e.repository.FolderRepository;
import fr.cytech.projetj2e.repository.NodeRepository;

/**
 * Garde centralisée des accès aux ressources.
 * Elle isole les entreprises avant que T16 n'ajoute la matrice de permissions détaillée.
 */
@Service
public class ResourceIsolationService {

    private final NodeRepository nodeRepository;
    private final FolderRepository folderRepository;
    private final FileRepository fileRepository;

    public ResourceIsolationService(NodeRepository nodeRepository,
                                    FolderRepository folderRepository,
                                    FileRepository fileRepository) {
        this.nodeRepository = nodeRepository;
        this.folderRepository = folderRepository;
        this.fileRepository = fileRepository;
    }

    public void requireSameCompany(User first, User second) {
        if (first == null || second == null) {
            throw new IllegalArgumentException("Les deux comptes sont obligatoires.");
        }
        if (!Node.sameCompany(first.getCompany(), second.getCompany())) {
            throw new SecurityException("Deux comptes d'entreprises différentes ne peuvent pas interagir.");
        }
    }

    public boolean canChat(User first, User second) {
        if (first == null || second == null) {
            return false;
        }
        return Node.sameCompany(first.getCompany(), second.getCompany());
    }

    public void requireSameCompany(Node node, Company company) {
        if (node == null || company == null) {
            throw new IllegalArgumentException("La ressource et l'entreprise sont obligatoires.");
        }
        if (!Node.sameCompany(node.getCompany(), company)) {
            throw new SecurityException("La ressource appartient a une autre entreprise.");
        }
    }

    public Optional<Node> findNode(Long id, Company company) {
        if (id == null || company == null) {
            return Optional.empty();
        }
        return nodeRepository.findByIdAndCompany(id, company);
    }

    public Optional<Folder> findFolder(Long id, Company company) {
        if (id == null || company == null) {
            return Optional.empty();
        }
        return folderRepository.findByIdAndCompany(id, company);
    }

    public Optional<File> findFile(Long id, Company company) {
        if (id == null || company == null) {
            return Optional.empty();
        }
        return fileRepository.findByIdAndCompany(id, company);
    }

    public List<Node> listNodes(Company company) {
        if (company == null) {
            return List.of();
        }
        return nodeRepository.findByCompany(company);
    }

    public List<Folder> listRootFolders(Company company) {
        if (company == null) {
            return List.of();
        }
        return folderRepository.findByCompanyAndParentIsNull(company);
    }

    public List<File> listFiles(Company company) {
        if (company == null) {
            return List.of();
        }
        return fileRepository.findByCompany(company);
    }

    public String companyStoragePrefix(Company company) {
        if (company == null || company.getId() == null) {
            throw new IllegalArgumentException("L'entreprise doit être enregistrée.");
        }
        return "companies/" + company.getId() + "/";
    }

    public String buildPrivateStoragePath(Company company, String relativePath) {
        if (relativePath == null || relativePath.isBlank()) {
            throw new IllegalArgumentException("Le chemin de stockage relatif est obligatoire.");
        }
        Path relative = Path.of(relativePath).normalize();
        if (relative.isAbsolute() || relative.startsWith("..")) {
            throw new IllegalArgumentException("Le chemin de stockage doit être relatif et privé.");
        }
        return companyStoragePrefix(company) + relative;
    }

    public boolean isStoragePathAllowed(String storagePath, Company company) {
        if (storagePath == null || company == null || company.getId() == null) {
            return false;
        }
        try {
            Path path = Path.of(storagePath).normalize();
            Path prefix = Path.of(companyStoragePrefix(company)).normalize();
            return !path.isAbsolute() && path.startsWith(prefix);
        } catch (RuntimeException ex) {
            return false;
        }
    }

    public void requireStoragePathAllowed(String storagePath, Company company) {
        if (!isStoragePathAllowed(storagePath, company)) {
            throw new SecurityException("Le chemin de stockage appartient a une autre entreprise.");
        }
    }
}
