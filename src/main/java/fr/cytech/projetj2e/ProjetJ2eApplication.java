package fr.cytech.projetj2e;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import fr.cytech.projetj2e.model.Admin;
import fr.cytech.projetj2e.repository.AdminRepository;

@SpringBootApplication
public class ProjetJ2eApplication {

    @Autowired
    static 
    AdminRepository adminRepository;
    public static void main(String[] args) {
        SpringApplication.run(ProjetJ2eApplication.class, args);
    }


    @Bean
    CommandLineRunner init(AdminRepository adminRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (adminRepository.findByUsername("admin").isEmpty()) {
                Admin admin = new Admin();
                admin.setUsername("admin");
                admin.setPassword(passwordEncoder.encode("admin123"));
                adminRepository.save(admin);
            }
        };
    }

    
}
