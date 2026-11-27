package fr.cytech.projetj2e.websocket;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.CookieManager;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.WebSocket;
import java.net.http.WebSocketHandshakeException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;

import fr.cytech.projetj2e.model.AccountStatus;
import fr.cytech.projetj2e.model.Company;
import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.model.UserRole;
import fr.cytech.projetj2e.repository.CompanyRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import fr.cytech.projetj2e.service.ChatService;

/**
 * Chat temps réel de bout en bout (T34) : serveur démarré, base migrée par Flyway,
 * connexion par le formulaire /login et client WebSocket du JDK.
 * Base du profil actif : H2 en mémoire pour le profil h2 (src/test/resources/application-h2.properties),
 * PostgreSQL du CI pour le profil postgres ; le test valide donc aussi les migrations sur les deux moteurs.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "app.storage.root=target/test-storage")
class ChatWebSocketIntegrationTest {

    private static final String PASSWORD = "Secret123!";
    private static final Pattern CSRF = Pattern.compile("name=\"_csrf\" (?:value|content)=\"([^\"]+)\"");

    @LocalServerPort
    private int port;

    @Autowired
    private UserRepository users;

    @Autowired
    private CompanyRepository companies;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ChatService chat;

    private User alice;
    private User bob;
    private User eve;
    private Browser aliceBrowser;
    private Browser bobBrowser;
    private Browser eveBrowser;
    private Socket aliceSocket;
    private Socket bobSocket;
    private Socket eveSocket;

    @BeforeEach
    void setUp() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Company company = companies.save(new Company("Acme " + suffix, "WS" + suffix));
        alice = users.save(user("alice", suffix, company, UserRole.MEMBER));
        bob = users.save(user("bob", suffix, company, UserRole.MEMBER));
        eve = users.save(user("eve", suffix, company, UserRole.COMPANY_ADMIN));
        aliceBrowser = login(alice);
        bobBrowser = login(bob);
        eveBrowser = login(eve);
    }

    @AfterEach
    void tearDown() {
        for (Socket socket : new Socket[] { aliceSocket, bobSocket, eveSocket }) {
            if (socket != null) {
                socket.webSocket.abort();
            }
        }
    }

    @Test
    void handshakeRequiresAnAuthenticatedSessionFromTheSameOrigin() {
        assertEquals(403, refusedHandshakeStatus(null, null));
        assertEquals(403, refusedHandshakeStatus("JSESSIONID=inconnu", null));
        assertEquals(403, refusedHandshakeStatus(aliceBrowser.cookie(), "http://site-malveillant.example"));
    }

    @Test
    void participantsReceiveNewMessagesAndOthersDoNot() throws Exception {
        aliceSocket = connect(aliceBrowser);
        bobSocket = connect(bobBrowser);
        eveSocket = connect(eveBrowser); // administratrice de l'entreprise, mais pas participante
        assertTrue(aliceSocket.next().contains("\"type\":\"ready\""));
        assertTrue(bobSocket.next().contains("\"userId\":" + bob.getId()));
        assertTrue(eveSocket.next().contains("\"type\":\"ready\""));

        Long conversationId = chat.open(alice, bob.getId()).id();
        chat.send(alice, conversationId, "Réunion à 14 h ?", "c-1");

        String forBob = bobSocket.next();
        assertTrue(forBob.contains("\"type\":\"message.created\""), forBob);
        assertTrue(forBob.contains("\"content\":\"Réunion à 14 h ?\"") && forBob.contains("\"mine\":false"), forBob);
        assertTrue(aliceSocket.next().contains("\"mine\":true"));
        assertNull(eveSocket.poll(500));

        // Renvoi du même clientMessageId : aucun doublon diffusé.
        chat.send(alice, conversationId, "Réunion à 14 h ?", "c-1");
        assertNull(bobSocket.poll(500));

        chat.markRead(bob, conversationId, null);
        assertTrue(aliceSocket.next().contains("\"type\":\"conversation.read\""));
        assertTrue(bobSocket.next().contains("\"readerId\":" + bob.getId()));
        assertNull(eveSocket.poll(300));
    }

    @Test
    void answersPingsAndRejectsOtherClientMessages() throws Exception {
        aliceSocket = connect(aliceBrowser);
        aliceSocket.next(); // ready

        aliceSocket.webSocket.sendText("{\"type\":\"ping\"}", true).join();
        assertEquals("{\"type\":\"pong\"}", aliceSocket.next());
        aliceSocket.webSocket.sendText("{\"type\":\"send\",\"content\":\"x\"}", true).join();
        assertTrue(aliceSocket.next().contains("\"type\":\"error\""));
        aliceSocket.webSocket.sendText("pas du json", true).join();
        assertTrue(aliceSocket.next().contains("JSON invalide"));
    }

    @Test
    void logoutClosesTheSocketWithACodeThatForbidsReconnecting() throws Exception {
        bobSocket = connect(bobBrowser);
        bobSocket.next(); // ready

        bobBrowser.logout();

        assertEquals(4401, bobSocket.closeCode.get(5, TimeUnit.SECONDS));
    }

    // ---------------------------------------------------------------- Client de test

    private Browser login(User user) throws Exception {
        CookieManager cookies = new CookieManager();
        HttpClient http = HttpClient.newBuilder().cookieHandler(cookies).build();
        String token = csrf(http.send(get("/login"), HttpResponse.BodyHandlers.ofString()).body());
        HttpResponse<String> response = http.send(postForm("/login",
                "_csrf=" + token + "&email=" + encode(user.getEmail()) + "&password=" + encode(PASSWORD)),
                HttpResponse.BodyHandlers.ofString());
        assertTrue(response.headers().firstValue("Location").orElse("").endsWith("/dashboard"),
                "connexion refusée pour " + user.getEmail());
        return new Browser(http, cookies);
    }

    private Socket connect(Browser browser) {
        Socket socket = new Socket();
        socket.webSocket = HttpClient.newHttpClient().newWebSocketBuilder()
                .header("Cookie", browser.cookie())
                .buildAsync(URI.create("ws://localhost:" + port + "/ws/chat"), socket)
                .join();
        return socket;
    }

    private int refusedHandshakeStatus(String cookie, String origin) {
        WebSocket.Builder builder = HttpClient.newHttpClient().newWebSocketBuilder();
        if (cookie != null) {
            builder.header("Cookie", cookie);
        }
        if (origin != null) {
            builder.header("Origin", origin);
        }
        ExecutionException failure = assertThrows(ExecutionException.class,
                () -> builder.buildAsync(URI.create("ws://localhost:" + port + "/ws/chat"), new Socket()).get(5, TimeUnit.SECONDS));
        return assertInstanceOf(WebSocketHandshakeException.class, failure.getCause()).getResponse().statusCode();
    }

    private final class Browser {
        private final HttpClient http;
        private final CookieManager cookies;

        private Browser(HttpClient http, CookieManager cookies) {
            this.http = http;
            this.cookies = cookies;
        }

        String cookie() {
            return cookies.getCookieStore().getCookies().stream()
                    .filter(cookie -> cookie.getName().equals("JSESSIONID"))
                    .map(cookie -> "JSESSIONID=" + cookie.getValue())
                    .findFirst().orElseThrow();
        }

        void logout() throws Exception {
            String token = csrf(http.send(get("/dashboard"), HttpResponse.BodyHandlers.ofString()).body());
            http.send(postForm("/logout", "_csrf=" + token), HttpResponse.BodyHandlers.discarding());
        }
    }

    /** Collecte les messages reçus et le code de fermeture. */
    private static final class Socket implements WebSocket.Listener {
        private final BlockingQueue<String> received = new LinkedBlockingQueue<>();
        private final CompletableFuture<Integer> closeCode = new CompletableFuture<>();
        private final StringBuilder partial = new StringBuilder();
        private WebSocket webSocket;

        @Override
        public CompletionStage<?> onText(WebSocket socket, CharSequence data, boolean last) {
            partial.append(data);
            if (last) {
                received.add(partial.toString());
                partial.setLength(0);
            }
            socket.request(1);
            return null;
        }

        @Override
        public CompletionStage<?> onClose(WebSocket socket, int statusCode, String reason) {
            closeCode.complete(statusCode);
            return null;
        }

        String next() throws InterruptedException {
            String message = received.poll(5, TimeUnit.SECONDS);
            if (message == null) {
                throw new AssertionError("Aucun événement reçu dans les 5 s.");
            }
            return message;
        }

        String poll(long millis) throws InterruptedException {
            return received.poll(millis, TimeUnit.MILLISECONDS);
        }
    }

    private HttpRequest get(String path) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).timeout(Duration.ofSeconds(10)).build();
    }

    private HttpRequest postForm(String path, String body) {
        return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();
    }

    private static String csrf(String html) {
        Matcher matcher = CSRF.matcher(html);
        if (!matcher.find()) {
            throw new AssertionError("Jeton CSRF introuvable dans la page.");
        }
        return encode(matcher.group(1));
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
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
