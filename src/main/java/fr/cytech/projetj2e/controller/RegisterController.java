package fr.cytech.projetj2e.controller;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import fr.cytech.projetj2e.dto.UserDto;
import fr.cytech.projetj2e.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@Controller
@RequiredArgsConstructor
public class RegisterController {

    private final UserService userService;

    @GetMapping("/register")
    public String form(Model model) {
        model.addAttribute("userDto", new UserDto());
        return "register";
    }

    @PostMapping("/register")
    public String submit(@Valid @ModelAttribute UserDto dto,
                         BindingResult result,
                         RedirectAttributes redirect) {

        if (!dto.getPassword().equals(dto.getConfirmPassword())) {
            result.rejectValue("confirmPassword", "mismatch", "Passwords do not match");
        }
        if (result.hasErrors()) {
            return "register";
        }
        try {
            userService.register(dto);
        } catch (IllegalArgumentException e) {
            result.rejectValue("username", "taken", e.getMessage());
            return "register";
        }
        redirect.addFlashAttribute("success", "Account created, you can log in after admin approval.");
        return "redirect:/login";
    }

}