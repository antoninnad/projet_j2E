package fr.cytech.projetj2e.repository;

import java.util.Optional;

import fr.cytech.projetj2e.model.User;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;



@Repository 
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
    Optional<User> findByUsernameAndPassword(String username, String password);
    boolean existsByUsernameAndPassword(String username, String password);
    boolean existsByUsername(String username);

}