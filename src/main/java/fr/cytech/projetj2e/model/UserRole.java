package fr.cytech.projetj2e.model;

/** Rôle d'un utilisateur au sein de son entreprise. */
public enum UserRole {
    /** Salarié : droits déterminés par ses adhésions aux départements. */
    MEMBER,
    /** Administrateur de l'entreprise : gère comptes, départements et tous les documents de l'entreprise. */
    COMPANY_ADMIN
}
