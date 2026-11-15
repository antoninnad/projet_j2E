package fr.cytech.projetj2e.model;

import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;


/*attributes:
- id: Long
- username: String
- logs: List<Log>
*/

@Entity @Data 
@Table (name = "admins")
public class Admin {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    @NotBlank
    private String username;

    @OneToMany(mappedBy = "admin")
    private List<Log> logs;

    @Column (nullable = false)
    @NotBlank
    private String password;
}
