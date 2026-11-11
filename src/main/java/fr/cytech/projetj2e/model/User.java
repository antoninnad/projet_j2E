package fr.cytech.projetj2e.model;

import jakarta.validation.constraints.NotBlank;


import jakarta.persistence.*;
import lombok.Data;
import lombok.ToString;


@Entity  @Data 
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    @NotBlank
    private String username;

    @Column(unique = true, nullable = false)
    @NotBlank
    private String email;

    @Column 
    @NotBlank 
    private String firstName;

    @Column 
    @NotBlank
    private String lastName;

    @Column(nullable = false)
    @ToString.Exclude
    private String passwordHash;

    @Column(nullable = false)
    private boolean active = false;

    @OneToOne
    private UserProfile profile;


    // methods ...
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    

    public void setProfile(UserProfile profile) {
        this.profile = profile;
    }

    public UserProfile getProfile() {
        return profile;
    }

   
}
