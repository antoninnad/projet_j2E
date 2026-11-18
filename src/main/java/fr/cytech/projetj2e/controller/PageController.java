package fr.cytech.projetj2e.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.ui.Model;

import jakarta.servlet.http.HttpSession;

@Controller
public class PageController {

    @GetMapping("/dashboard")
    public String dashboard(HttpSession session, Model model) {
        Object userId = session.getAttribute("userId");
        if (userId == null) {
            return "redirect:/login";
        }

        model.addAttribute("userId", userId);
        return "dashboard";
    }

}
