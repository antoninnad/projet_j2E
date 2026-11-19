package fr.cytech.projetj2e.repository;

import java.util.List;
import java.util.Optional;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;



@Repository 
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<User> findByStatus(AccountStatus status);
    List<User> findByCompany(Company company);
    boolean existsByCompanyAndUsername(Company company, String username);
    boolean existsByCompanyAndEmail(Company company, String email);

}