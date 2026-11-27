package fr.cytech.projetj2e.dto;

import java.time.Instant;

/**
 * Entrée d'activité (T36). label est le libellé français de l'action (« a créé le dossier »),
 * à afficher après le nom de l'auteur puis celui de l'élément ou du département.
 * node* et department* décrivent l'élément tel qu'il était au moment de l'action ; nodeId peut désigner
 * un élément supprimé depuis. actor est absent pour une action de l'administrateur de plateforme.
 */
public record ActivityResponse(Long id, String action, String category, String label, Instant occurredAt,
                               ActorResponse actor, Long nodeId, String nodeName, String nodeKind,
                               Long departmentId, String departmentName, Long targetUserId, String targetUserName,
                               String details) {

    public record ActorResponse(Long id, String firstName, String lastName) {}
}
