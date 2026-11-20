package fr.cytech.projetj2e.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Node;
import java.util.List;
import java.util.Optional;

@Repository
public interface NodeRepository extends JpaRepository<Node, Long> {

    List<Node> findByCompany(Company company);

    Optional<Node> findByIdAndCompany(Long id, Company company);
}
