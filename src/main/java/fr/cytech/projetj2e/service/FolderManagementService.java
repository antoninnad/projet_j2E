package fr.cytech.projetj2e.service;

import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.exception.ConflictException;
import fr.cytech.projetj2e.model.ActivityAction;
import fr.cytech.projetj2e.exception.ForbiddenException;
import fr.cytech.projetj2e.exception.ResourceNotFoundException;
import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.FolderRepository;
import fr.cytech.projetj2e.repository.NodeRepository;

/**
 * Opérations sur l'arborescence (T20) : créer, renommer, déplacer, supprimer.
 *
 * Contrôles, dans cet ordre :
 * 1. isolation : un élément d'une autre entreprise ou invisible pour le compte renvoie 404 ;
 * 2. version : si le client envoie la version qu'il a chargée et qu'elle a changé, 409 ;
 * 3. droits (PermissionService, section 2.6) : 403 avec le motif ;
 * 4. intégrité de l'arbre (modèle Folder) : cycle, seuil, autre entreprise → 400 avec explication.
 *
 * Les dossiers racines appartiennent aux départements : ils se renomment avec le département (T15)
 * et ne peuvent être ni déplacés ni supprimés ici.
 */
@Service
@Transactional
public class FolderManagementService {

    private final CompanyIsolationService isolation;
    private final PermissionService permissions;
    private final NodeRepository nodeRepository;
    private final FolderRepository folderRepository;
    private final CompanyStorage storage;
    private final NodeResponseMapper mapper;
    private final NodeNames names;
    private final ActivityRecorder activity;

    public FolderManagementService(CompanyIsolationService isolation,
                                   PermissionService permissions,
                                   NodeRepository nodeRepository,
                                   FolderRepository folderRepository,
                                   CompanyStorage storage,
                                   NodeResponseMapper mapper,
                                   NodeNames names,
                                   ActivityRecorder activity) {
        this.isolation = isolation;
        this.permissions = permissions;
        this.nodeRepository = nodeRepository;
        this.folderRepository = folderRepository;
        this.storage = storage;
        this.mapper = mapper;
        this.names = names;
        this.activity = activity;
    }

    /** Crée un sous-dossier. Il hérite du département et du seuil du parent ; le compte en est propriétaire. */
    public NodeResponse createFolder(User actor, Long parentId, String rawName) {
        Folder parent = requireVisibleFolder(actor, parentId);
        permissions.requireCreateChild(actor, parent);
        String name = NodeNames.valid(rawName);
        names.requireFree(parent, name, null);
        Folder folder = folderRepository.save(new Folder(actor, name, parent));
        activity.node(actor, ActivityAction.FOLDER_CREATED, folder, "dans « " + parent.getName() + " »");
        return mapper.toResponse(actor, folder);
    }

    /** Renomme un dossier (droit de modification). */
    public NodeResponse renameFolder(User actor, Long folderId, String rawName, Long expectedVersion) {
        Folder folder = requireVisibleFolder(actor, folderId);
        requireNotRoot(folder, "renommé : renommez son département");
        requireVersion(folder, expectedVersion);
        permissions.requireModify(actor, folder);
        String name = NodeNames.valid(rawName);
        names.requireFree(folder.getParent(), name, folder.getId());
        String previous = folder.getName();
        folder.setName(name);
        nodeRepository.flush(); // déclenche le contrôle @Version maintenant, pour renvoyer la nouvelle version
        if (!previous.equals(name)) {
            activity.node(actor, ActivityAction.FOLDER_RENAMED, folder, ActivityRecorder.change(previous, name));
        }
        return mapper.toResponse(actor, folder);
    }

    /**
     * Déplace un dossier ou un fichier dans un autre dossier de l'entreprise.
     * Exige le droit de suppression sur l'élément (il quitte son emplacement) et le droit
     * de création dans le dossier cible. Un dossier emmène son sous-arbre, qui prend le département de la cible.
     */
    public NodeResponse move(User actor, Long nodeId, Long targetFolderId, Long expectedVersion) {
        Node node = requireVisibleNode(actor, nodeId);
        requireNotRoot(node, "déplacé");
        requireVersion(node, expectedVersion);
        permissions.requireDelete(actor, node);
        Folder target = requireVisibleFolder(actor, targetFolderId);
        permissions.requireCreateChild(actor, target);
        if (Objects.equals(node.getParent().getId(), target.getId())) {
            return mapper.toResponse(actor, node);
        }
        names.requireFree(target, node.getName(), node.getId());
        String from = node.getParent().getName();
        target.addChild(node); // refuse cycle, autre entreprise et seuil inférieur à celui de la cible
        nodeRepository.flush();
        activity.node(actor, ActivityAction.NODE_MOVED, node, "de « " + from + " » vers « " + target.getName() + " »");
        return mapper.toResponse(actor, node);
    }

    /**
     * Supprime un dossier et tout son contenu. Le compte doit pouvoir supprimer chaque élément du sous-arbre ;
     * sinon rien n'est supprimé. Les contenus des fichiers sont effacés du disque après validation.
     */
    public void deleteFolder(User actor, Long folderId, Long expectedVersion) {
        Folder folder = requireVisibleFolder(actor, folderId);
        requireNotRoot(folder, "supprimé : supprimez son département");
        requireVersion(folder, expectedVersion);

        List<Node> subtree = new ArrayList<>();
        collect(folder, subtree);
        List<Path> contents = new ArrayList<>();
        for (Node node : subtree) {
            if (!permissions.permissions(actor, node).delete()) {
                throw new ForbiddenException("Suppression refusée : le dossier contient des éléments"
                        + " que vous n'avez pas le droit de supprimer.");
            }
            if (node instanceof File file) {
                contents.add(storage.resolve(file));
            }
        }

        int contained = subtree.size() - 1;
        activity.node(actor, ActivityAction.FOLDER_DELETED, folder,
                contained == 0 ? "dossier vide" : "avec " + contained + " élément" + (contained > 1 ? "s" : ""));
        activity.freezeHistory(subtree);
        folder.getParent().removeChild(folder);
        nodeRepository.delete(folder); // cascade REMOVE sur tout le sous-arbre
        nodeRepository.flush();
        storage.deleteAfterCommit(contents);
    }

    // ---------------------------------------------------------------- Contrôles

    private Folder requireVisibleFolder(User actor, Long folderId) {
        Folder folder = isolation.requireFolder(actor, folderId);
        requireVisible(actor, folder);
        return folder;
    }

    private Node requireVisibleNode(User actor, Long nodeId) {
        Node node = isolation.requireNode(actor, nodeId);
        requireVisible(actor, node);
        return node;
    }

    /** Un élément invisible est traité comme inexistant, comme dans l'exploration (T18). */
    private void requireVisible(User actor, Node node) {
        if (!permissions.permissions(actor, node).view()) {
            throw new ResourceNotFoundException("Élément introuvable.");
        }
    }

    private static void requireNotRoot(Node node, String action) {
        if (node.isRoot()) {
            throw new ForbiddenException("Le dossier racine d'un département ne peut pas être " + action + ".");
        }
    }

    private static void requireVersion(Node node, Long expectedVersion) {
        if (expectedVersion != null && !expectedVersion.equals(node.getVersion())) {
            throw new ConflictException("« " + node.getName() + " » a été modifié entre-temps ; rechargez-le avant de réessayer.");
        }
    }

    private static void collect(Node node, List<Node> subtree) {
        subtree.add(node);
        if (node instanceof Folder folder) {
            for (Node child : folder.getChildren()) {
                collect(child, subtree);
            }
        }
    }
}
