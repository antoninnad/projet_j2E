package fr.cytech.projetj2e.model;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

import jakarta.persistence.*;
import lombok.Data;


@Entity  @Data 
@Table(name = "users")
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column 
    @NotBlank 
    private String username;

    @Column 
    private String password;

    @OneToOne
    private UserProfile profile;


    // methods ...
    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public void setProfile(UserProfile profile) {
        this.profile = profile;
    }

    public UserProfile getProfile() {
        return profile;
    }

   
}
