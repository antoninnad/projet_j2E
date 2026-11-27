package fr.cytech.projetj2e.support;

import java.io.ByteArrayOutputStream;
import java.net.CookieManager;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Navigateur de test pour les tests de bout en bout (T41) : se connecte par le formulaire /login,
 * garde le cookie de session et envoie le jeton CSRF lu dans la page /dashboard, comme le frontend React.
 * Sans connexion, il se comporte comme un visiteur anonyme.
 */
public final class TestBrowser {

    private static final Pattern CSRF = Pattern.compile("name=\"_csrf\" (?:value|content)=\"([^\"]+)\"");

    /** Réponse HTTP simplifiée. */
    public record Response(int status, String body, HttpResponse<byte[]> raw) {
        public String header(String name) {
            return raw.headers().firstValue(name).orElse(null);
        }
    }

    private final String baseUrl;
    private final HttpClient http;
    private String csrfToken;

    public TestBrowser(int port) {
        this.baseUrl = "http://localhost:" + port;
        this.http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
    }

    /** Se connecte par le formulaire MVC ; échoue si la connexion n'aboutit pas sur /dashboard. */
    public TestBrowser login(String email, String password) {
        String token = csrfIn(send(HttpRequest.newBuilder(uri("/login")).GET()).body());
        Response response = send(HttpRequest.newBuilder(uri("/login"))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .POST(HttpRequest.BodyPublishers.ofString("_csrf=" + encode(token) + "&email=" + encode(email)
                        + "&password=" + encode(password))));
        String location = response.header("Location");
        if (location == null || !location.endsWith("/dashboard")) {
            throw new AssertionError("Connexion refusée pour " + email + " : " + response.status() + " " + location);
        }
        csrfToken = csrfIn(send(HttpRequest.newBuilder(uri("/dashboard")).GET()).body());
        return this;
    }

    public Response get(String path) {
        return send(HttpRequest.newBuilder(uri(path)).GET());
    }

    /** Requête JSON avec le jeton CSRF de la session (comme le frontend). */
    public Response json(String method, String path, String body) {
        return send(withCsrf(HttpRequest.newBuilder(uri(path)))
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body)));
    }

    /** Même requête sans jeton CSRF : doit être refusée par Spring Security. */
    public Response jsonWithoutCsrf(String method, String path, String body) {
        return send(HttpRequest.newBuilder(uri(path))
                .header("Content-Type", "application/json")
                .method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body)));
    }

    /** Envoi multipart/form-data d'un fichier dans le champ « file », avec le jeton CSRF. */
    public Response upload(String path, String fileName, String contentType, byte[] content) {
        String boundary = "----t41" + UUID.randomUUID();
        ByteArrayOutputStream body = new ByteArrayOutputStream();
        body.writeBytes(("--" + boundary + "\r\nContent-Disposition: form-data; name=\"file\"; filename=\"" + fileName
                + "\"\r\nContent-Type: " + contentType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        body.writeBytes(content);
        body.writeBytes(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return send(withCsrf(HttpRequest.newBuilder(uri(path)))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray())));
    }

    private HttpRequest.Builder withCsrf(HttpRequest.Builder builder) {
        return csrfToken == null ? builder : builder.header("X-CSRF-TOKEN", csrfToken);
    }

    private Response send(HttpRequest.Builder builder) {
        try {
            HttpResponse<byte[]> response = http.send(builder.timeout(Duration.ofSeconds(20)).build(),
                    HttpResponse.BodyHandlers.ofByteArray());
            return new Response(response.statusCode(), new String(response.body(), StandardCharsets.UTF_8), response);
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(exception);
        } catch (java.io.IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private URI uri(String path) {
        return URI.create(baseUrl + path);
    }

    private static String csrfIn(String html) {
        Matcher matcher = CSRF.matcher(html);
        if (!matcher.find()) {
            throw new AssertionError("Jeton CSRF introuvable dans la page.");
        }
        return matcher.group(1);
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
