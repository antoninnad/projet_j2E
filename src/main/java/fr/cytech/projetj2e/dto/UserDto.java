package fr.cytech.projetj2e.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UserDto {

    @NotBlank
    @Size(min = 3, max = 50)
    private String username;

    @NotBlank
    @Size(min = 8, max = 72)   // BCrypt ignores bytes beyond 72
    private String password;

    @NotBlank
    private String confirmPassword;

    @NotBlank 
    private String firstName;

    @NotBlank
    private String lastName;

    @NotBlank
    @Email
    private String email;

    /** Code de l'entreprise à rejoindre (voir Company.code). */
    @NotBlank
    private String companyCode;
}