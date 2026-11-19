package fr.cytech.projetj2e.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Long> {

    List<Department> findByCompany(Company company);
    Optional<Department> findByCompanyAndName(Company company, String name);
    boolean existsByCompanyAndName(Company company, String name);
}
