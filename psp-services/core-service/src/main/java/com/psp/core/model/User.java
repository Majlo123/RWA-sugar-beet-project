package com.psp.core.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * User entity for PSP Super Admin and Web Shop Customers
 * PCI DSS 8.1 - Unique user identification
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users", indexes = {
    @Index(name = "idx_user_email", columnList = "email", unique = true),
    @Index(name = "idx_user_username", columnList = "username", unique = true)
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50)
    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    @Column(nullable = false, unique = true, length = 100)
    private String email;

    /**
     * PCI DSS 8.2.1 - Password stored as hash (salt:hash format)
     */
    @NotBlank(message = "Password is required")
    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    /** User's first name */
    @Size(max = 50)
    @Column(length = 50)
    private String firstName;

    /** User's last name */
    @Size(max = 50)
    @Column(length = 50)
    private String lastName;

    /** Whether the user account is active */
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    /** PCI DSS 8.1.6 - Account lockout after failed attempts */
    @Column(name = "failed_login_attempts")
    private Integer failedLoginAttempts = 0;

    /** Time of last failed login */
    @Column(name = "last_failed_login")
    private Instant lastFailedLogin;

    /** Account locked until this time */
    @Column(name = "locked_until")
    private Instant lockedUntil;

    /** Creation timestamp */
    @Column(name = "created_at")
    private Instant createdAt;

    /** Last update timestamp */
    @Column(name = "updated_at")
    private Instant updatedAt;

    /** Last login timestamp */
    @Column(name = "last_login")
    private Instant lastLogin;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    /**
     * Check if the account is currently locked
     */
    public boolean isLocked() {
        return lockedUntil != null && Instant.now().isBefore(lockedUntil);
    }

    /**
     * User roles in the system
     */
    public enum Role {
        SUPER_ADMIN,  // PSP administrator
        CUSTOMER      // Web Shop customer
    }
}
