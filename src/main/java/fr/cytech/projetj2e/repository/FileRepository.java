package fr.cytech.projetj2e.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.File;

@Repository
public interface FileRepository extends JpaRepository<File, Long> {
}
