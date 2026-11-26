package fr.cytech.projetj2e.service;

/**
 * Publié par ChatService quand un participant avance son « dernier lu » (T34) :
 * accusé de lecture pour le correspondant et mise à jour des non-lus sur les autres onglets du lecteur.
 */
public record ChatReadEvent(Long conversationId, Long readerId, Long peerId, Long lastReadMessageId) {}
