package fr.cytech.projetj2e.repository;

import java.util.List;
import java.util.Optional;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;



@Repository 
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    List<User> findByStatus(AccountStatus status);
    List<User> findByCompany(Company company);
    List<User> findByCompanyAndStatus(Company company, AccountStatus status);
    @Query("""
            SELECT u FROM User u
            WHERE u.company = :company
              AND (:status IS NULL OR u.status = :status)
              AND (:search IS NULL
                   OR LOWER(u.username) LIKE LOWER(CONCAT(CONCAT('%', :search), '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT(CONCAT('%', :search), '%'))
                   OR LOWER(u.firstName) LIKE LOWER(CONCAT(CONCAT('%', :search), '%'))
                   OR LOWER(u.lastName) LIKE LOWER(CONCAT(CONCAT('%', :search), '%')))
            """)
    Page<User> searchCompanyUsers(@Param("company") Company company,
                                  @Param("status") AccountStatus status,
                                  @Param("search") String search,
                                  Pageable pageable);
    Optional<User> findByIdAndCompany(Long id, Company company);
    boolean existsByCompanyAndUsername(Company company, String username);
    boolean existsByCompanyAndEmail(Company company, String email);

}