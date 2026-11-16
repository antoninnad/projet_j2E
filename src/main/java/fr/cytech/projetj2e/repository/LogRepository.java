package fr.cytech.projetj2e.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import fr.cytech.projetj2e.model.Log;

public interface LogRepository extends JpaRepository<Log, Long> {
    
}
