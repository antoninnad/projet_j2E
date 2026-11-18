package fr.cytech.projetj2e.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.Node;

@Repository
public interface NodeRepository extends JpaRepository<Node, Long> {
}
