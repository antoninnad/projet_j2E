package fr.cytech.projetj2e.service;

import java.util.Objects;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.FolderRepository;

/**
 * Services internes de l'arborescence.
 * createDepartmentRoot est appelé par la gestion des départements (T15) juste après
 * l'enregistrement d'un département ; il n'est pas exposé directement par l'API.
 */
@Service
public class FolderService {

    private final FolderRepository folderRepository;

    public FolderService(FolderRepository folderRepository) {
        this.folderRepository = folderRepository;
    }

    /**
     * Crée le dossier racine d'un département déjà enregistré.
     *
     * @param department département enregistré, sans dossier racine
     * @param owner      compte de la même entreprise (en pratique l'administrateur qui crée le département)
     * @throws IllegalArgumentException si le département n'est pas enregistré ou si le propriétaire est d'une autre entreprise
     * @throws IllegalStateException    si le département possède déjà un dossier racine
     */
    @Transactional
    public Folder createDepartmentRoot(Department department, User owner) {
        Objects.requireNonNull(department, "Le département est obligatoire.");
        Objects.requireNonNull(owner, "Le propriétaire est obligatoire.");
        if (department.getId() == null) {
            throw new IllegalArgumentException("Le département doit être enregistré avant la création de son dossier racine.");
        }
        if (!Node.sameCompany(owner.getCompany(), department.getCompany())) {
            throw new IllegalArgumentException("Le propriétaire du dossier racine doit appartenir à l'entreprise du département.");
        }
        if (folderRepository.existsByDepartmentAndParentIsNull(department)) {
            throw new IllegalStateException("Le département « " + department.getName() + " » possède déjà un dossier racine.");
        }
        return folderRepository.save(Folder.createRoot(owner, department));
    }

    @Transactional(readOnly = true)
    public Optional<Folder> findDepartmentRoot(Department department) {
        return folderRepository.findByDepartmentAndParentIsNull(department);
    }
}
