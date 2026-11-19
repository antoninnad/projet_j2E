package fr.cytech.projetj2e.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Contrôleur MVC de la page d'accueil publique (GET / -> index.html).
 * Les autres routes MVC du socle sont portées par LoginController (/login, /logout),
 * RegisterController (/register) et PageController (/dashboard).
 */
@Controller
public class HomeController {

    @GetMapping("/")
    public String index() {
        return "index";
    }
}
