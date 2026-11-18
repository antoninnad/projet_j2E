package fr.cytech.projetj2e.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.Folder;

@Repository
public interface FolderRepository extends JpaRepository<Folder, Long> {

    List<Folder> findByParent(Folder parent);

    List<Folder> findByParentIsNull();
}
