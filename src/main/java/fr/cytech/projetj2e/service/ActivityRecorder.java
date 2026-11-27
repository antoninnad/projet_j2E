package fr.cytech.projetj2e.service;

import java.time.Instant;
import java.util.Collection;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import fr.cytech.projetj2e.model.ActivityAction;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Log;
import fr.cytech.projetj2e.model.Node;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.LogRepository;

/**
 * Enregistre l'activité (T36) dans la transaction de l'opération : si elle est annulée, rien n'est journalisé.
 * Appelé après les contrôles et la modification, jamais pour une lecture, un téléchargement ou un message de chat.
 * Les détails ne contiennent que des noms et des niveaux, jamais de contenu ni de secret.
 */
@Component
@Transactional(propagation = Propagation.MANDATORY)
public class ActivityRecorder {

    private final LogRepository logs;

    public ActivityRecorder(LogRepository logs) {
        this.logs = logs;
    }

    /** Opération sur un dossier ou un fichier (état de l'élément après l'opération, ou avant une suppression). */
    public void node(User actor, ActivityAction action, Node node, String details) {
        logs.save(new Log(action, Instant.now(), node.getCompany(), actor).about(node).details(details));
    }

    /** Changement de droits visant un compte sur un élément (contributeur ajouté ou retiré). */
    public void node(User actor, ActivityAction action, Node node, User target, String details) {
        logs.save(new Log(action, Instant.now(), node.getCompany(), actor).about(node).target(target).details(details));
    }

    /** Administration d'un département, éventuellement pour un membre. */
    public void department(User actor, ActivityAction action, Department department, User target, String details) {
        Log log = new Log(action, Instant.now(), department.getCompany(), actor).in(department).details(details);
        logs.save(target == null ? log : log.target(target));
    }

    /** Administration d'un compte (approbation, refus, désactivation). */
    public void account(User actor, ActivityAction action, User target) {
        logs.save(new Log(action, Instant.now(), actor.getCompany(), actor).target(target));
    }

    /**
     * Avant la suppression d'éléments : leurs entrées gardent le département et le seuil qu'ils avaient en dernier,
     * pour que leur historique reste réservé à ceux qui pouvaient les voir.
     */
    public void freezeHistory(Collection<? extends Node> deleted) {
        for (Node node : deleted) {
            logs.freezeAccess(node.getId(), node.getDepartment().getId(), node.getMinAccessLevel());
        }
    }

    /** « ancien » → « nouveau », pour les renommages et les changements de niveau. */
    static String change(Object before, Object after) {
        return "« " + before + " » → « " + after + " »";
    }
}
