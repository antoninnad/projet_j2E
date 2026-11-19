package fr.cytech.projetj2e.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity @Data 
@Table (name = "user_profiles")
public class UserProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column 
    private String bio;
    @Column 
    private String profilePictureUrl;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    
   
}
