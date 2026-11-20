package fr.cytech.projetj2e.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.File;
import java.util.List;
import java.util.Optional;

@Repository
public interface FileRepository extends JpaRepository<File, Long> {

    List<File> findByCompany(Company company);

    Optional<File> findByIdAndCompany(Long id, Company company);
}
