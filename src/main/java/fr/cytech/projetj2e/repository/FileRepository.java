package fr.cytech.projetj2e.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.File;
import fr.cytech.projetj2e.model.User;

@Repository
public interface FileRepository extends JpaRepository<File, Long> {

    /** Vide si le fichier n'existe pas ou appartient à une autre entreprise. */
    Optional<File> findByIdAndCompany_Id(Long id, Long companyId);

    /** Fichiers récents de l'entreprise que le membre peut voir (niveau L ≥ seuil M dans le département). */
    @Query("""
            select f from File f
            where f.company.id = :companyId
              and exists (select m.id from Membership m
                          where m.user = :user
                            and m.department = f.department
                            and m.accessLevel >= f.minAccessLevel)
            order by f.updatedAt desc, f.id desc
            """)
    List<File> findRecentVisibleTo(@Param("companyId") Long companyId, @Param("user") User user, Pageable pageable);

    /** Fichiers récents de toute l'entreprise (administrateur d'entreprise). */
    @Query("select f from File f where f.company.id = :companyId order by f.updatedAt desc, f.id desc")
    List<File> findRecentInCompany(@Param("companyId") Long companyId, Pageable pageable);
}
