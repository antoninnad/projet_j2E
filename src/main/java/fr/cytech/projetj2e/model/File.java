package fr.cytech.projetj2e.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * Fichier stocké. L'id, le nom, le parent, l'entreprise, le département, le seuil,
 * la version, le propriétaire, les contributeurs et les dates sont hérités de Node
 * (ne pas redéclarer d'@Id ici). Un fichier est toujours rangé dans un dossier.
 */
@Entity
@Table(name = "files")
public class File extends Node {

    @Column(nullable = false)
    private String originalFileName;

    @Column
    private String contentType;

    @Column(nullable = false)
    private long size;

    /** Chemin dans le stockage privé ; ne doit jamais être exposé au client. */
    @Column(nullable = false)
    private String storagePath;

    protected File() {
        // Constructeur requis par JPA.
    }

    public File(User owner, String name, Folder parent, String originalFileName,
                String contentType, String storagePath, long size) {
        super(owner, name, parent);
        this.originalFileName = originalFileName;
        this.contentType = contentType;
        this.storagePath = storagePath;
        this.size = size;
        parent.addChild(this);
    }

    public String getOriginalFileName() {
        return originalFileName;
    }

    public void setOriginalFileName(String originalFileName) {
        this.originalFileName = originalFileName;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public long getSize() {
        return size;
    }

    public String getStoragePath() {
        return storagePath;
    }

    /**
     * Remplace le contenu (T23) : nouveau chemin de stockage, taille, type et nom d'origine.
     * La version (Node) est incrémentée à l'enregistrement ; l'ancien contenu est effacé par le service après validation.
     */
    public void replaceContent(String storagePath, long size, String contentType, String originalFileName) {
        this.storagePath = storagePath;
        this.size = size;
        this.contentType = contentType;
        this.originalFileName = originalFileName;
    }
}
