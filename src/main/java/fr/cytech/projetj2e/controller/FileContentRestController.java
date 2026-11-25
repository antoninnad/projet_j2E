package fr.cytech.projetj2e.controller;

import java.nio.charset.StandardCharsets;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.service.FileContentService;
import fr.cytech.projetj2e.service.FileContentService.FileContent;
import fr.cytech.projetj2e.service.SessionIdentityService;
import jakarta.servlet.http.HttpSession;

/**
 * Lecture protégée du contenu des fichiers (T22), consommée par la consultation React (T25).
 * Les métadonnées restent servies par GET /api/nodes/{nodeId} (T18).
 *
 * - /content : aperçu dans le navigateur (texte, images, PDF) ; les autres formats y sont servis
 *   en pièce jointe, pour que l'interface se rabatte sur le téléchargement.
 * - /download : toujours en pièce jointe, sous le nom du fichier.
 *
 * Les deux réponses portent un ETag lié à la version du fichier (304 si le client l'a déjà),
 * acceptent les requêtes partielles (Range, 206) et interdisent la détection de type par le navigateur.
 */
@RestController
@RequestMapping("/api/files/{fileId}")
public class FileContentRestController {

    private final FileContentService files;
    private final SessionIdentityService identity;

    public FileContentRestController(FileContentService files, SessionIdentityService identity) {
        this.files = files;
        this.identity = identity;
    }

    @GetMapping("/content")
    public ResponseEntity<Resource> content(@PathVariable Long fileId, HttpSession session) {
        FileContent content = read(fileId, session);
        return content.previewType()
                .map(type -> respond(content, type, ContentDisposition.inline()))
                .orElseGet(() -> respond(content, MediaType.APPLICATION_OCTET_STREAM, ContentDisposition.attachment()));
    }

    @GetMapping("/download")
    public ResponseEntity<Resource> download(@PathVariable Long fileId, HttpSession session) {
        FileContent content = read(fileId, session);
        return respond(content, content.contentType(), ContentDisposition.attachment());
    }

    private FileContent read(Long fileId, HttpSession session) {
        User actor = identity.requireActiveMember(session);
        return files.read(actor, fileId);
    }

    private static ResponseEntity<Resource> respond(FileContent content, MediaType type,
                                                    ContentDisposition.Builder disposition) {
        return ResponseEntity.ok()
                .contentType(type)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        disposition.filename(content.name(), StandardCharsets.UTF_8).build().toString())
                .header("X-Content-Type-Options", "nosniff")
                .cacheControl(CacheControl.noCache().cachePrivate())
                .eTag("\"" + content.id() + "-" + content.version() + "\"")
                .body(new FileSystemResource(content.path()));
    }
}
