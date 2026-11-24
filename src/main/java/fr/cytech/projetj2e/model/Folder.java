package fr.cytech.projetj2e.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;

/**
 * Dossier de l'arborescence. Un dossier sans parent est le dossier racine d'un département
 * (créé par FolderService.createDepartmentRoot).
 */
@Entity
@Table(name = "folders")
public class Folder extends Node {

    // 1-N : supprimer un dossier supprime tout son sous-arbre.
    // Pas d'orphanRemoval : un enfant retiré de la liste lors d'un déplacement ne doit pas être supprimé.
    @OneToMany(mappedBy = "parent", cascade = CascadeType.REMOVE)
    private List<Node> children = new ArrayList<>();

    protected Folder() {
        // Constructeur requis par JPA.
    }

    private Folder(User owner, String name, Department department) {
        super(owner, name, department, 0);
    }

    /** Sous-dossier : hérite de l'entreprise, du département et du seuil du parent. */
    public Folder(User owner, String name, Folder parent) {
        super(owner, name, parent);
        parent.addChild(this);
    }

    /** Dossier racine d'un département, nommé comme lui, accessible dès le niveau 0. */
    public static Folder createRoot(User owner, Department department) {
        Objects.requireNonNull(department, "Le département est obligatoire.");
        return new Folder(owner, department.getName(), department);
    }

    public List<Node> getChildren() {
        return Collections.unmodifiableList(children);
    }

    /**
     * Rattache un nœud à ce dossier (création ou déplacement), en vérifiant :
     * même entreprise, absence de cycle et seuil de l'enfant au moins égal à celui du dossier.
     * Le nœud quitte son ancien parent et prend le département de ce dossier (sous-arbre compris).
     */
    public void addChild(Node child) {
        Objects.requireNonNull(child, "L'élément à ajouter est obligatoire.");
        if (!sameCompany(getCompany(), child.getCompany())) {
            throw new IllegalArgumentException("Un élément ne peut pas être déplacé vers une autre entreprise.");
        }
        if (child == this || (child instanceof Folder folder && folder.isAncestorOf(this))) {
            throw new IllegalArgumentException("Un dossier ne peut pas être déplacé dans lui-même ou dans un de ses sous-dossiers.");
        }
        if (child.getMinAccessLevel() < getMinAccessLevel()) {
            throw new IllegalArgumentException(
                "Le seuil de l'élément (" + child.getMinAccessLevel()
                    + ") est inférieur à celui du dossier cible (" + getMinAccessLevel() + ").");
        }
        Folder previous = child.getParent();
        if (previous == this) {
            return;
        }
        if (previous != null) {
            previous.children.remove(child);
        }
        children.add(child);
        child.setParent(this);
        child.moveToDepartment(getDepartment());
    }

    /** Détache un enfant sans le supprimer (à rattacher ailleurs ou à supprimer par le service). */
    public void removeChild(Node child) {
        if (children.remove(child)) {
            child.setParent(null);
        }
    }

    /** Vrai si ce dossier est le nœud donné ou l'un de ses ancêtres. */
    public boolean isAncestorOf(Node node) {
        for (Node current = node; current != null; current = current.getParent()) {
            if (current == this) {
                return true;
            }
        }
        return false;
    }

    @Override
    void moveToDepartment(Department department) {
        super.moveToDepartment(department);
        for (Node child : children) {
            child.moveToDepartment(department);
        }
    }

    /** Refuse aussi un seuil qui dépasserait celui d'un enfant (l'arbre deviendrait incohérent). */
    @Override
    public void setMinAccessLevel(int minAccessLevel) {
        for (Node child : children) {
            if (child.getMinAccessLevel() < minAccessLevel) {
                throw new IllegalArgumentException(
                    "Le seuil (" + minAccessLevel + ") dépasse celui de l'élément « " + child.getName()
                        + " » (" + child.getMinAccessLevel() + ") ; relevez d'abord le seuil de ses enfants.");
            }
        }
        super.setMinAccessLevel(minAccessLevel);
    }
}
