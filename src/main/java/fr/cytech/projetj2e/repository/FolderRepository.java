package fr.cytech.projetj2e.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Folder;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {

    List<Folder> findByParent(Folder parent);

    /** Dossier racine d'un département (un seul par département). */
    Optional<Folder> findByDepartmentAndParentIsNull(Department department);

    boolean existsByDepartmentAndParentIsNull(Department department);

    /** Racines des départements d'une entreprise, sans jamais mélanger les entreprises. */
    List<Folder> findByCompanyAndParentIsNull(Company company);
}
