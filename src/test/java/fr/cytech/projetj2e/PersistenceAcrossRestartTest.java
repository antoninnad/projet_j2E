package fr.cytech.projetj2e;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;

import fr.cytech.projetj2e.dto.ChatMessageResponse;
import fr.cytech.projetj2e.dto.NodeResponse;
import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import fr.cytech.projetj2e.service.ActivityService;
import fr.cytech.projetj2e.service.ChatService;
import fr.cytech.projetj2e.service.DepartmentService;
import fr.cytech.projetj2e.service.ExplorationService;
import fr.cytech.projetj2e.service.FavoriteService;
import fr.cytech.projetj2e.service.FileContentService;
import fr.cytech.projetj2e.service.FileUploadService;
import fr.cytech.projetj2e.service.FolderManagementService;
import fr.cytech.projetj2e.service.FolderService;

/**
 * Persistance après redémarrage (T41) : comme l'exige le sujet, la base H2 est un fichier.
 * L'application est démarrée une première fois sur une base fichier neuve (migrations Flyway), les services réels
 * créent un département, un dossier, un fichier, un favori et une conversation ; l'application est arrêtée,
 * redémarrée sur le même fichier et le même stockage, et tout doit être retrouvé, contenu du fichier compris.
 * Le profil actif est ignoré : la base est toujours H2 fichier, aussi dans le job PostgreSQL du CI.
 */
class PersistenceAcrossRestartTest {

    private static final String PASSWORD = "Secret123!";

    @Test
    void documentsFavoritesActivityAndConversationsSurviveARestart() throws Exception {
        Path directory = Path.of("target", "t41-persistence", UUID.randomUUID().toString()).toAbsolutePath();
        String[] args = {
                "--server.port=0",
                "--spring.datasource.url=jdbc:h2:file:" + directory.resolve("db"),
                "--spring.datasource.driver-class-name=org.h2.Driver",
                "--spring.datasource.username=sa",
                "--spring.datasource.password=",
                "--spring.h2.console.enabled=false",
                "--app.storage.root=" + directory.resolve("storage")
        };

        Long rootId;
        Long fileId;
        Long conversationId;
        try (ConfigurableApplicationContext first = start(args)) {
            Company acme = first.getBean(CompanyRepository.class).save(new Company("Acme persistance", "PERSIST"));
            UserRepository users = first.getBean(UserRepository.class);
            PasswordEncoder encoder = first.getBean(PasswordEncoder.class);
            User ada = users.save(user("ada", acme, UserRole.COMPANY_ADMIN, encoder));
            User bob = users.save(user("bob", acme, UserRole.MEMBER, encoder));

            DepartmentService departments = first.getBean(DepartmentService.class);
            Department finance = departments.create(ada, "Finance");
            departments.setMember(ada, finance.getId(), bob, 0);
            rootId = first.getBean(FolderService.class).findDepartmentRoot(finance).orElseThrow().getId();
            first.getBean(FolderManagementService.class).createFolder(ada, rootId, "Archives");
            fileId = first.getBean(FileUploadService.class).upload(ada, rootId,
                    new MockMultipartFile("file", "bilan.txt", "text/plain", "Bilan conservé".getBytes(StandardCharsets.UTF_8))).id();
            first.getBean(FavoriteService.class).add(bob, fileId);
            ChatService chat = first.getBean(ChatService.class);
            conversationId = chat.open(ada, bob.getId()).id();
            chat.send(ada, conversationId, "Message conservé", "c-1");
        }

        try (ConfigurableApplicationContext second = start(args)) {
            UserRepository users = second.getBean(UserRepository.class);
            User ada = users.findByEmail("ada-persist@example.test").orElseThrow();
            User bob = users.findByEmail("bob-persist@example.test").orElseThrow();

            List<String> children = second.getBean(ExplorationService.class).listChildren(bob, rootId, 0, 20).items()
                    .stream().map(NodeResponse::name).toList();
            assertEquals(List.of("Archives", "bilan.txt"), children);
            assertEquals("Bilan conservé", Files.readString(second.getBean(FileContentService.class).read(bob, fileId).path()));
            assertEquals(List.of("bilan.txt"), second.getBean(FavoriteService.class).list(bob, 0, 20).items().stream()
                    .map(favorite -> favorite.node().name()).toList());
            assertEquals(List.of("Message conservé"), second.getBean(ChatService.class)
                    .history(bob, conversationId, null, null, 10).items().stream().map(ChatMessageResponse::content).toList());
            assertTrue(second.getBean(ActivityService.class).companyFeed(ada, 0, 20).page().totalElements() >= 4);
        }
    }

    private static ConfigurableApplicationContext start(String[] args) {
        return new SpringApplicationBuilder(ProjetJ2eApplication.class).run(args);
    }

    private static User user(String name, Company company, UserRole role, PasswordEncoder encoder) {
        User user = new User();
        user.setUsername(name + "-persist");
        user.setEmail(name + "-persist@example.test");
        user.setFirstName(name);
        user.setLastName("Test");
        user.setPasswordHash(encoder.encode(PASSWORD));
        user.setStatus(AccountStatus.ACTIVE);
        user.setRole(role);
        user.setCompany(company);
        return user;
    }
}
