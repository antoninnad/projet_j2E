package fr.cytech.projetj2e.controller;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.UserProfileRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import jakarta.servlet.http.HttpSession;





@Controller
public class LoginController{

    @Autowired
    UserRepository userRepository;
    @Autowired
    UserProfileRepository userProfileRepository;

    @GetMapping ("/login")
    String login(@ModelAttribute("success") String success) {
        return "loginPage";
    }

    @PostMapping ("/login")
    String login(@ModelAttribute User user, RedirectAttributes redirectAttributes, HttpSession session ){
        Optional<User> userOptional = userRepository.findByUsername(user.getUsername());

        if( userOptional.isPresent() && userOptional.get().isActive() ) {
            session.setAttribute("user", userOptional.get());
            return "redirect:/welcomePage";
        } else {
            redirectAttributes.addFlashAttribute("error", "Invalid username or password");
            return "redirect:/login";
        }
    }

}