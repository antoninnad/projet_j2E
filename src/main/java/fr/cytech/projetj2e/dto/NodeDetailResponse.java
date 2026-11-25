package fr.cytech.projetj2e.dto;

import java.util.List;

/**
 * Détail d'un élément : ses métadonnées et le fil d'Ariane de ses dossiers parents,
 * de la racine du département jusqu'au parent direct (vide pour une racine).
 */
public record NodeDetailResponse(NodeResponse node, List<BreadcrumbItem> path) {

    public record BreadcrumbItem(Long id, String name) {}
}
