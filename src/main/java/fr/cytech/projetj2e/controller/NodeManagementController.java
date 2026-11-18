package fr.cytech.projetj2e.controller;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import fr.cytech.projetj2e.repository.AdminRepository;
import fr.cytech.projetj2e.repository.NodeRepository;
import fr.cytech.projetj2e.repository.UserRepository;

@Controller 
@RequestMapping("/nodes")
public class NodeManagementController {

    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final NodeRepository nodeRepository;
    
    public NodeManagementController(UserRepository userRepository,
                                    AdminRepository adminRepository,
                                    NodeRepository nodeRepository) {
        this.userRepository = userRepository;
        this.adminRepository = adminRepository;
        this.nodeRepository = nodeRepository;
    }
    @GetMapping("/admin/listNodes")
    public String listNodes() {
        return "node-list";
    }
}
