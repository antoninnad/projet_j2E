package fr.cytech.projetj2e.model;

/** État d'un compte utilisateur. Seul un compte ACTIVE peut se connecter. */
public enum AccountStatus {
    /** Inscrit, en attente d'approbation par l'administrateur de l'entreprise. */
    PENDING,
    /** Approuvé : accès à l'espace de travail. */
    ACTIVE,
    /** Désactivé par l'administrateur : plus aucun accès. */
    DISABLED
}
