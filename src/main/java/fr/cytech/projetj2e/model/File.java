package fr.cytech.projetj2e.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

/**
 * Fichier stocké. L'id, le nom, le propriétaire, les contributeurs
 * et les dates sont hérités de Node (ne pas redéclarer d'@Id ici).
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

    @Column(nullable = false)
    private String storagePath;

    protected File() {
        // Constructeur requis par JPA.
    }

    public File(User owner, String name, String originalFileName, String contentType, String storagePath, long size) {
        super(owner, name);
        this.originalFileName = originalFileName;
        this.contentType = contentType;
        this.storagePath = storagePath;
        this.size = size;
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
}
