package fr.cytech.projetj2e.model;

/**
 * Opérations journalisées (T36), avec leur libellé français affiché après le nom de l'auteur.
 * DOCUMENT et RIGHTS portent sur un élément de l'arborescence ; ADMINISTRATION sur un département ou un compte.
 */
public enum ActivityAction {

    FOLDER_CREATED(Category.DOCUMENT, "a créé le dossier"),
    FOLDER_RENAMED(Category.DOCUMENT, "a renommé le dossier"),
    FOLDER_DELETED(Category.DOCUMENT, "a supprimé le dossier"),
    NODE_MOVED(Category.DOCUMENT, "a déplacé"),
    FILE_UPLOADED(Category.DOCUMENT, "a importé le fichier"),
    FILE_SAVED(Category.DOCUMENT, "a enregistré le fichier"),
    FILE_REPLACED(Category.DOCUMENT, "a remplacé le contenu du fichier"),
    FILE_RENAMED(Category.DOCUMENT, "a renommé le fichier"),
    FILE_DELETED(Category.DOCUMENT, "a supprimé le fichier"),

    THRESHOLD_CHANGED(Category.RIGHTS, "a changé le seuil d'accès de"),
    CONTRIBUTOR_ADDED(Category.RIGHTS, "a ajouté un contributeur à"),
    CONTRIBUTOR_REMOVED(Category.RIGHTS, "a retiré un contributeur de"),

    DEPARTMENT_CREATED(Category.ADMINISTRATION, "a créé le département"),
    DEPARTMENT_RENAMED(Category.ADMINISTRATION, "a renommé le département"),
    MEMBER_ACCESS_SET(Category.ADMINISTRATION, "a défini le niveau d'accès d'un membre dans"),
    MEMBER_REMOVED(Category.ADMINISTRATION, "a retiré un membre de"),
    ACCOUNT_APPROVED(Category.ADMINISTRATION, "a approuvé l'inscription de"),
    ACCOUNT_DECLINED(Category.ADMINISTRATION, "a refusé l'inscription de"),
    ACCOUNT_DISABLED(Category.ADMINISTRATION, "a désactivé le compte de");

    public enum Category { DOCUMENT, RIGHTS, ADMINISTRATION }

    private final Category category;
    private final String label;

    ActivityAction(Category category, String label) {
        this.category = category;
        this.label = label;
    }

    public Category getCategory() {
        return category;
    }

    public String getLabel() {
        return label;
    }
}
