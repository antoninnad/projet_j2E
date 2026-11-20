package fr.cytech.projetj2e.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.FileRepository;
import fr.cytech.projetj2e.repository.FolderRepository;
import fr.cytech.projetj2e.repository.NodeRepository;
import fr.cytech.projetj2e.repository.UserRepository;

/**
 * Isolation entre entreprises (T08) : point d'entrée unique pour charger une ressource
 * à partir d'un identifiant envoyé par le client.
 *
 * - Un compte absent, inactif ou sans entreprise est refusé (403).
 * - Une ressource d'une autre entreprise est traitée comme inexistante (404),
 *   pour ne pas révéler son existence.
 * - L'entreprise vient toujours du compte connecté, jamais d'un paramètre du client.
 *
 * Ce service ne décide pas des droits dans l'entreprise (seuil, propriétaire, contributeurs) :
 * c'est le rôle du service de permissions (T16), appelé après ces contrôles.
 * L'utilisateur passé en paramètre doit être chargé depuis la session par l'appelant
 * (identité centralisée en T07).
 */
@Service
@Transactional(readOnly = true)
public class CompanyIsolationService {

    private final NodeRepository nodeRepository;
    private final FolderRepository folderRepository;
    private final FileRepository fileRepository;
    private final UserRepository userRepository;

    public CompanyIsolationService(NodeRepository nodeRepository,
                                   FolderRepository folderRepository,
                                   FileRepository fileRepository,
                                   UserRepository userRepository) {
        this.nodeRepository = nodeRepository;
        this.folderRepository = folderRepository;
        this.fileRepository = fileRepository;
        this.userRepository = userRepository;
    }

    /** Identifiant de l'entreprise du compte, si celui-ci est actif. */
    public Long requireActiveCompanyId(User actor) {
        if (actor == null || !actor.isActive()) {
            throw new ForbiddenException("Compte inactif ou non connecté.");
        }
        Long companyId = companyId(actor.getCompany());
        if (companyId == null) {
            throw new ForbiddenException("Compte non rattaché à une entreprise.");
        }
        return companyId;
    }

    // ---------------------------------------------------------------- Documents

    public Node requireNode(User actor, Long nodeId) {
        Long companyId = requireActiveCompanyId(actor);
        return nodeRepository.findByIdAndCompany_Id(requireId(nodeId), companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Élément introuvable."));
    }

    public Folder requireFolder(User actor, Long folderId) {
        Long companyId = requireActiveCompanyId(actor);
        return folderRepository.findByIdAndCompany_Id(requireId(folderId), companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Dossier introuvable."));
    }

    public File requireFile(User actor, Long fileId) {
        Long companyId = requireActiveCompanyId(actor);
        return fileRepository.findByIdAndCompany_Id(requireId(fileId), companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Fichier introuvable."));
    }

    /** Pour un nœud déjà chargé par un autre moyen (ex. cible d'un déplacement, résultat de recherche). */
    public void requireSameCompany(User actor, Node node) {
        Long companyId = requireActiveCompanyId(actor);
        if (node == null || !companyId.equals(companyId(node.getCompany()))) {
            throw new ResourceNotFoundException("Élément introuvable.");
        }
    }

    // ---------------------------------------------------------------- Comptes (chat, profils)

    /**
     * Collègue actif de la même entreprise que le compte connecté.
     * Réutilisé par le chat (T33/T34) pour ouvrir une conversation ou s'abonner à ses événements.
     */
    public User requireColleague(User actor, Long userId) {
        Long companyId = requireActiveCompanyId(actor);
        return userRepository.findById(requireId(userId))
                .filter(User::isActive)
                .filter(other -> companyId.equals(companyId(other.getCompany())))
                .orElseThrow(() -> new ResourceNotFoundException("Utilisateur introuvable."));
    }

    /** Vrai si les deux comptes sont actifs et dans la même entreprise. */
    public boolean areActiveColleagues(User a, User b) {
        if (a == null || b == null || !a.isActive() || !b.isActive()) {
            return false;
        }
        Long companyA = companyId(a.getCompany());
        return companyA != null && companyA.equals(companyId(b.getCompany()));
    }

    // ---------------------------------------------------------------- Utilitaires

    private static Long companyId(Company company) {
        // getId() sur un proxy Hibernate ne déclenche pas de requête.
        return company == null ? null : company.getId();
    }

    private static Long requireId(Long id) {
        if (id == null) {
            throw new ResourceNotFoundException("Identifiant manquant.");
        }
        return id;
    }
}
