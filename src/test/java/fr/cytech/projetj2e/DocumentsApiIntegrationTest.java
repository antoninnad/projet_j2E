package fr.cytech.projetj2e;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import java.util.stream.Stream;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.Department;
import fr.cytech.projetj2e.model.Folder;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import fr.cytech.projetj2e.service.CompanyStorage;
import fr.cytech.projetj2e.service.DepartmentService;
import fr.cytech.projetj2e.service.FolderManagementService;
import fr.cytech.projetj2e.service.FolderService;
import fr.cytech.projetj2e.service.SharingService;
import fr.cytech.projetj2e.support.TestBrowser;
import fr.cytech.projetj2e.support.TestBrowser.Response;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Règles documents et chat vérifiées de bout en bout par HTTP (T41) : serveur démarré, chaîne Spring Security
 * réelle (session, CSRF), migrations Flyway, multipart réel et stockage disque. Les tests de contrôleurs
 * (@WebMvcTest) simulent les services ; ceux-ci vérifient que les règles tiennent à travers toute la pile.
 *
 * Acme : Ada (administratrice), Alice (Finance niveau 1), Bob (Finance niveau 0).
 * Finance (0) ── Budget (1). Autre entreprise : Mallory (administratrice).
 * Limite d'import réduite à 1 Ko pour tester le 413 sur un vrai envoi.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.storage.root=target/test-storage-e2e",
        "spring.servlet.multipart.max-file-size=1KB",
        "spring.servlet.multipart.max-request-size=4KB"
})
class DocumentsApiIntegrationTest {

    private static final String PASSWORD = "Secret123!";

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository users;

    @Autowired
    private CompanyRepository companies;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private DepartmentService departments;

    @Autowired
    private FolderService folderService;

    @Autowired
    private FolderManagementService folders;

    @Autowired
    private SharingService sharing;

    @Autowired
    private CompanyStorage storage;

    @Autowired
    private JsonMapper json;

    private Company acme;
    private User ada;
    private User alice;
    private User bob;
    private User mallory;
    private Long financeRootId;
    private Long budgetId;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        acme = companies.save(new Company("Acme " + suffix, "AC" + suffix));
        Company other = companies.save(new Company("Autre " + suffix, "AU" + suffix));
        ada = users.save(user("ada", suffix, acme, UserRole.COMPANY_ADMIN));
        alice = users.save(user("alice", suffix, acme, UserRole.MEMBER));
        bob = users.save(user("bob", suffix, acme, UserRole.MEMBER));
        mallory = users.save(user("mallory", suffix, other, UserRole.COMPANY_ADMIN));

        Department finance = departments.create(ada, "Finance");
        departments.setMember(ada, finance.getId(), alice, 1);
        departments.setMember(ada, finance.getId(), bob, 0);
        Folder root = folderService.findDepartmentRoot(finance).orElseThrow();
        financeRootId = root.getId();
        budgetId = folders.createFolder(ada, financeRootId, "Budget").id();
        sharing.setThreshold(ada, budgetId, 1);
    }

    @Test
    void writesRequireASessionAndItsCsrfToken() {
        TestBrowser anonymous = new TestBrowser(port);
        assertEquals(403, anonymous.get("/api/folders/roots").status());

        TestBrowser aliceBrowser = login(alice);
        String body = "{\"parentId\":" + financeRootId + ",\"name\":\"Projets\"}";
        assertEquals(403, aliceBrowser.jsonWithoutCsrf("POST", "/api/folders", body).status());
        assertEquals(201, aliceBrowser.json("POST", "/api/folders", body).status());
    }

    @Test
    void uploadedFilesAreStoredPrivatelyReadBackAndLimited() throws IOException {
        TestBrowser aliceBrowser = login(alice);
        byte[] content = "Bilan 2026 — été".getBytes(StandardCharsets.UTF_8);

        Response uploaded = aliceBrowser.upload("/api/folders/" + financeRootId + "/files", "bilan.txt", "text/plain", content);
        assertEquals(201, uploaded.status(), uploaded.body());
        JsonNode file = json.readTree(uploaded.body());
        assertFalse(uploaded.body().contains("storagePath"));
        assertFalse(uploaded.body().contains("companies/"));
        long fileId = file.get("id").asLong();

        Response read = aliceBrowser.get("/api/files/" + fileId + "/content");
        assertEquals(200, read.status());
        assertEquals("Bilan 2026 — été", read.body());
        assertEquals("nosniff", read.header("X-Content-Type-Options"));
        assertTrue(aliceBrowser.get("/api/files/" + fileId + "/download").header("Content-Disposition").startsWith("attachment"));
        // Le stockage privé n'est pas servi par URL.
        assertEquals(404, aliceBrowser.get("/storage/companies/" + acme.getId() + "/").status());

        long before = storedContents();
        Response tooLarge = aliceBrowser.upload("/api/folders/" + financeRootId + "/files", "gros.bin",
                "application/octet-stream", new byte[1500]);
        assertEquals(413, tooLarge.status());
        assertTrue(tooLarge.body().contains("1 Ko"), tooLarge.body());
        assertEquals(before, storedContents());
    }

    @Test
    void otherCompaniesAndHiddenElementsLookNonExistent() {
        // Alice (niveau 1 = seuil de Budget, ni propriétaire ni contributrice) peut lire Budget mais pas y écrire.
        TestBrowser aliceBrowser = login(alice);
        assertEquals(403, aliceBrowser.upload("/api/folders/" + budgetId + "/files", "plan.txt", "text/plain",
                "plan".getBytes(StandardCharsets.UTF_8)).status());
        long fileId = json.readTree(login(ada).upload("/api/folders/" + budgetId + "/files", "plan.txt", "text/plain",
                "plan".getBytes(StandardCharsets.UTF_8)).body()).get("id").asLong();
        assertEquals("plan", aliceBrowser.get("/api/files/" + fileId + "/content").body());

        TestBrowser malloryBrowser = login(mallory);
        assertEquals(404, malloryBrowser.get("/api/nodes/" + financeRootId).status());
        assertEquals(404, malloryBrowser.get("/api/files/" + fileId + "/content").status());
        assertEquals(404, malloryBrowser.json("PUT", "/api/favorites/" + fileId, null).status());
        assertEquals(404, malloryBrowser.json("DELETE", "/api/folders/" + budgetId, null).status());
        assertEquals(0, total(malloryBrowser.get("/api/search?q=plan")));

        // Bob (niveau 0) ne voit pas Budget (seuil 1), ni son contenu, ni son historique.
        TestBrowser bobBrowser = login(bob);
        assertEquals(404, bobBrowser.get("/api/nodes/" + budgetId).status());
        assertEquals(404, bobBrowser.get("/api/files/" + fileId + "/download").status());
        assertEquals(404, bobBrowser.get("/api/nodes/" + budgetId + "/activity").status());
        assertEquals(0, total(bobBrowser.get("/api/search?q=plan")));
        assertEquals(1, total(aliceBrowser.get("/api/search?q=plan")));

        // Requêtes JPQL propres au projet, exécutées ici sur la vraie base (PostgreSQL dans le CI) :
        // recherche avec filtres et caractères échappés, favoris filtrés, activité filtrée.
        assertEquals(1, total(aliceBrowser.get("/api/search?q=pl&kind=file&departmentId=" + financeDepartmentId())));
        assertEquals(0, total(aliceBrowser.get("/api/search?q=%25_")));
        assertEquals(200, aliceBrowser.json("PUT", "/api/favorites/" + fileId, null).status());
        assertEquals(1, total(aliceBrowser.get("/api/favorites")));
        assertEquals(0, total(bobBrowser.get("/api/favorites")));
        String bobActivity = bobBrowser.get("/api/activity").body();
        assertFalse(bobActivity.contains("plan.txt"), bobActivity);
        assertTrue(login(ada).get("/api/activity").body().contains("plan.txt"));
    }

    @Test
    void versionsPreventSilentOverwrites() {
        TestBrowser aliceBrowser = login(alice);
        long fileId = json.readTree(aliceBrowser.upload("/api/folders/" + financeRootId + "/files", "note.txt", "text/plain",
                "v0".getBytes(StandardCharsets.UTF_8)).body()).get("id").asLong();

        Response first = aliceBrowser.json("PUT", "/api/files/" + fileId + "/content", "{\"content\":\"v1\",\"version\":0}");
        assertEquals(200, first.status(), first.body());
        assertEquals(1, json.readTree(first.body()).get("version").asLong());
        // Un second onglet resté sur la version 0 ne doit pas écraser v1.
        Response stale = aliceBrowser.json("PUT", "/api/files/" + fileId + "/content", "{\"content\":\"autre\",\"version\":0}");
        assertEquals(409, stale.status());
        assertEquals("v1", aliceBrowser.get("/api/files/" + fileId + "/content").body());
        // Bob (L = M, ni propriétaire ni contributeur) ne peut pas écrire.
        assertEquals(403, login(bob).json("PUT", "/api/files/" + fileId + "/content", "{\"content\":\"x\",\"version\":1}").status());
    }

    @Test
    void cyclesAndProtectedSubtreesAreRefused() {
        TestBrowser aliceBrowser = login(alice);
        long parent = json.readTree(aliceBrowser.json("POST", "/api/folders",
                "{\"parentId\":" + financeRootId + ",\"name\":\"Parent\"}").body()).get("id").asLong();
        long child = json.readTree(aliceBrowser.json("POST", "/api/folders",
                "{\"parentId\":" + parent + ",\"name\":\"Enfant\"}").body()).get("id").asLong();

        Response cycle = aliceBrowser.json("POST", "/api/nodes/" + parent + "/move", "{\"targetFolderId\":" + child + "}");
        assertEquals(400, cycle.status(), cycle.body());

        // Un élément qu'Alice ne peut pas supprimer (seuil 1 = son niveau, créé par Ada) protège tout le sous-arbre.
        long locked = folders.createFolder(ada, child, "Verrouillé").id();
        sharing.setThreshold(ada, locked, 1);
        assertEquals(403, aliceBrowser.json("DELETE", "/api/folders/" + parent, null).status());
        assertEquals(200, aliceBrowser.get("/api/nodes/" + locked).status());
        assertEquals(204, login(ada).json("DELETE", "/api/folders/" + parent, null).status());
        assertEquals(404, aliceBrowser.get("/api/nodes/" + child).status());
    }

    @Test
    void conversationsAreOnlyReachableByTheirParticipants() {
        TestBrowser aliceBrowser = login(alice);
        long conversationId = json.readTree(aliceBrowser.json("POST", "/api/conversations",
                "{\"peerId\":" + bob.getId() + "}").body()).get("id").asLong();
        assertEquals(201, aliceBrowser.json("POST", "/api/conversations/" + conversationId + "/messages",
                "{\"content\":\"Confidentiel\",\"clientMessageId\":\"c-1\"}").status());

        TestBrowser bobBrowser = login(bob);
        assertEquals(1, json.readTree(bobBrowser.get("/api/conversations/" + conversationId + "/messages").body())
                .get("items").size());
        // Non-lus comptés en base (requête propre au projet, exécutée aussi sur PostgreSQL dans le CI).
        assertEquals(1, json.readTree(bobBrowser.get("/api/conversations/unread").body()).get("total").asLong());
        assertEquals(1, json.readTree(bobBrowser.get("/api/conversations").body())
                .get("items").get(0).get("unreadCount").asLong());
        for (TestBrowser outsider : new TestBrowser[] { login(ada), login(mallory) }) {
            assertEquals(404, outsider.get("/api/conversations/" + conversationId + "/messages").status());
            assertEquals(404, outsider.json("POST", "/api/conversations/" + conversationId + "/messages",
                    "{\"content\":\"Intrusion\"}").status());
        }
        assertEquals(404, login(mallory).json("POST", "/api/conversations", "{\"peerId\":" + alice.getId() + "}").status());
    }

    // ---------------------------------------------------------------- Outils

    private TestBrowser login(User user) {
        return new TestBrowser(port).login(user.getEmail(), PASSWORD);
    }

    private Long financeDepartmentId() {
        return json.readTree(login(ada).get("/api/nodes/" + financeRootId).body()).get("node").get("departmentId").asLong();
    }

    private long total(Response page) {
        assertEquals(200, page.status(), page.body());
        return json.readTree(page.body()).get("page").get("totalElements").asLong();
    }

    private long storedContents() throws IOException {
        Path directory = storage.companyDirectory(acme);
        if (Files.notExists(directory)) {
            return 0;
        }
        try (Stream<Path> files = Files.list(directory)) {
            return files.count();
        }
    }

    private User user(String name, String suffix, Company company, UserRole role) {
        User user = new User();
        user.setUsername(name + "-" + suffix);
        user.setEmail(name + "-" + suffix + "@example.test");
        user.setFirstName(name);
        user.setLastName("Test");
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setStatus(AccountStatus.ACTIVE);
        user.setRole(role);
        user.setCompany(company);
        return user;
    }
}
