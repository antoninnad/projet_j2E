package fr.cytech.projetj2e.model;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Dossier de l'arborescence. Un dossier sans parent est un dossier racine.
 */
@Entity
@Table(name = "folders")
public class Folder extends Node {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Folder parent;

    protected Folder() {
        // Constructeur requis par JPA.
    }

    public Folder(User owner, String name, Folder parent) {
        super(owner, name);
        this.parent = parent;
    }

    public Folder getParent() {
        return parent;
    }

    public void setParent(Folder parent) {
        this.parent = parent;
    }
}
