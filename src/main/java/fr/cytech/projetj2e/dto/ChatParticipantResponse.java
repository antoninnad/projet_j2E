package fr.cytech.projetj2e.dto;

/** Correspondant d'une conversation (T33) : identité publique interne, sans email ni donnée de sécurité. */
public record ChatParticipantResponse(Long id, String firstName, String lastName, String username, boolean active) {}
