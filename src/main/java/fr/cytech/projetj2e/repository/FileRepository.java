package fr.cytech.projetj2e.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.File;

@Repository
public interface FileRepository extends JpaRepository<File, Long> {

    /** Vide si le fichier n'existe pas ou appartient à une autre entreprise. */
    Optional<File> findByIdAndCompany_Id(Long id, Long companyId);
}
