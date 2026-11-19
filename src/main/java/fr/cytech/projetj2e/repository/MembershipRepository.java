package fr.cytech.projetj2e.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Membership;
import fr.cytech.projetj2e.model.User;

@Repository
public interface MembershipRepository extends JpaRepository<Membership, Long> {

    /** Adhésion d'un utilisateur à un département : donne son niveau L (vide = aucun accès). */
    Optional<Membership> findByUserAndDepartment(User user, Department department);

    List<Membership> findByUser(User user);
    List<Membership> findByDepartment(Department department);
}
