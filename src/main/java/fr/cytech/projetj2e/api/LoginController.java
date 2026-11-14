package fr.cytech.projetj2e.api;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import fr.cytech.projetj2e.model.User;
import fr.cytech.projetj2e.repository.UserProfileRepository;
import fr.cytech.projetj2e.repository.UserRepository;
import jakarta.servlet.http.HttpSession;





@RestController
@RequestMapping ("/api/login")
public class LoginController{

    @Autowired
    UserRepository userRepository;
    @Autowired
    UserProfileRepository userProfileRepository;

    @GetMapping ("/")
    String login(@ModelAttribute("success") String success) {
        return "loginPage";
    }

    @PostMapping ("/")
    String login(@ModelAttribute User user, RedirectAttributes redirectAttributes, HttpSession session ){
        Optional<User> userOptional = userRepository.findByUsername(user.getUsername());

        if( userOptional.isPresent() && userOptional.get().isActive() ) {
            session.setAttribute("user", userOptional.get());
            return "welcomePage";
        } else {
            redirectAttributes.addFlashAttribute("error", "Invalid username or password");
            return "loginPage";
        }
    }

}