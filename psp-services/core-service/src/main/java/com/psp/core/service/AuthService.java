package com.psp.core.service;

import com.psp.core.dto.AuthResponse;
import com.psp.core.dto.LoginRequest;
import com.psp.core.dto.RegisterRequest;
import com.psp.core.model.AuditLog.AuditActionType;
import com.psp.core.model.AuditLog.AuditOutcome;
import com.psp.core.model.User;
import com.psp.core.model.User.Role;
import com.psp.core.repository.UserRepository;
import com.psp.core.security.JwtTokenProvider;
import com.psp.core.security.PasswordHasher;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Authentication Service for users (Super Admin and Customers)
 * PCI DSS 8.1 - User authentication and management
 */
@Service
@Transactional
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private AuditService auditService;

    private final PasswordHasher passwordHasher = new PasswordHasher();

    @Value("${pci-dss.account-lockout.max-failed-attempts:6}")
    private int maxFailedAttempts;

    @Value("${pci-dss.account-lockout.lockout-duration-minutes:30}")
    private int lockoutDurationMinutes;

    @Value("${jwt.expiration:3600000}")
    private long jwtExpiration;

    /**
     * Register a new customer
     */
    public AuthResponse registerCustomer(RegisterRequest request) {
        return registerUser(request, Role.CUSTOMER);
    }

    /**
     * Register a new Super Admin (should be restricted in production)
     */
    public AuthResponse registerSuperAdmin(RegisterRequest request) {
        return registerUser(request, Role.SUPER_ADMIN);
    }

    private AuthResponse registerUser(RegisterRequest request, Role role) {
        // Check if username or email already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        // Create new user
        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(passwordHasher.hash(request.getPassword()));
        user.setRole(role);
        user.setFirstName(request.getFirstName());
        user.setLastName(request.getLastName());
        user.setIsActive(true);
        user.setFailedLoginAttempts(0);

        User savedUser = userRepository.save(user);

        // Audit log - use LOGIN_SUCCESS for registration (new account creation)
        auditService.log(AuditActionType.LOGIN_SUCCESS, savedUser.getUsername(),
                savedUser.getId().toString(), "USER", AuditOutcome.SUCCESS,
                "User registered with role: " + role);

        // Generate tokens
        String accessToken = jwtTokenProvider.generateAccessToken(
                savedUser.getUsername(), savedUser.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(
                savedUser.getUsername(), savedUser.getRole().name());

        return new AuthResponse(
                accessToken,
                refreshToken,
                jwtExpiration / 1000,
                savedUser.getUsername(),
                savedUser.getEmail(),
                savedUser.getRole().name(),
                savedUser.getFirstName(),
                savedUser.getLastName()
        );
    }

    /**
     * Login user (Customer or Super Admin)
     */
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsernameOrEmail(
                request.getUsernameOrEmail(), request.getUsernameOrEmail())
                .orElseThrow(() -> {
                    auditService.log(AuditActionType.LOGIN_FAILURE, request.getUsernameOrEmail(),
                            null, "USER", AuditOutcome.FAILURE, "User not found");
                    return new RuntimeException("Invalid credentials");
                });

        // Check if account is locked
        if (user.isLocked()) {
            auditService.log(AuditActionType.LOGIN_FAILURE, user.getUsername(),
                    user.getId().toString(), "USER", AuditOutcome.FAILURE, "Account locked");
            throw new RuntimeException("Account is locked. Please try again later.");
        }

        // Check if account is active
        if (!user.getIsActive()) {
            auditService.log(AuditActionType.LOGIN_FAILURE, user.getUsername(),
                    user.getId().toString(), "USER", AuditOutcome.FAILURE, "Account inactive");
            throw new RuntimeException("Account is inactive");
        }

        // Verify password
        if (!passwordHasher.verify(request.getPassword(), user.getPassword())) {
            handleFailedLogin(user);
            throw new RuntimeException("Invalid credentials");
        }

        // Successful login - reset failed attempts
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        user.setLastLogin(Instant.now());
        userRepository.save(user);

        // Audit log
        auditService.log(AuditActionType.LOGIN_SUCCESS, user.getUsername(),
                user.getId().toString(), "USER", AuditOutcome.SUCCESS, 
                "Login successful, role: " + user.getRole());

        // Generate tokens
        String accessToken = jwtTokenProvider.generateAccessToken(
                user.getUsername(), user.getRole().name());
        String refreshToken = jwtTokenProvider.generateRefreshToken(
                user.getUsername(), user.getRole().name());

        return new AuthResponse(
                accessToken,
                refreshToken,
                jwtExpiration / 1000,
                user.getUsername(),
                user.getEmail(),
                user.getRole().name(),
                user.getFirstName(),
                user.getLastName()
        );
    }

    /**
     * Handle failed login attempt - PCI DSS 8.1.6
     */
    private void handleFailedLogin(User user) {
        int attempts = user.getFailedLoginAttempts() + 1;
        user.setFailedLoginAttempts(attempts);
        user.setLastFailedLogin(Instant.now());

        if (attempts >= maxFailedAttempts) {
            user.setLockedUntil(Instant.now().plus(lockoutDurationMinutes, ChronoUnit.MINUTES));
            auditService.log(AuditActionType.LOGIN_FAILURE, user.getUsername(),
                    user.getId().toString(), "USER", AuditOutcome.FAILURE,
                    "Account locked after " + attempts + " failed attempts");
        } else {
            auditService.log(AuditActionType.LOGIN_FAILURE, user.getUsername(),
                    user.getId().toString(), "USER", AuditOutcome.FAILURE,
                    "Failed login attempt " + attempts + "/" + maxFailedAttempts);
        }

        userRepository.save(user);
    }

    /**
     * Refresh access token
     */
    public AuthResponse refreshToken(String refreshToken) {
        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new RuntimeException("Invalid refresh token");
        }

        if (!"refresh".equals(jwtTokenProvider.getTokenType(refreshToken))) {
            throw new RuntimeException("Invalid token type");
        }

        String username = jwtTokenProvider.getUsernameFromToken(refreshToken);
        String role = jwtTokenProvider.getRoleFromToken(refreshToken);

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        String newAccessToken = jwtTokenProvider.generateAccessToken(username, role);
        String newRefreshToken = jwtTokenProvider.generateRefreshToken(username, role);

        return new AuthResponse(
                newAccessToken,
                newRefreshToken,
                jwtExpiration / 1000,
                user.getUsername(),
                user.getEmail(),
                user.getRole().name(),
                user.getFirstName(),
                user.getLastName()
        );
    }

    /**
     * Get user by username
     */
    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    /**
     * Validate token and return user
     */
    public User validateTokenAndGetUser(String token) {
        if (!jwtTokenProvider.validateToken(token)) {
            throw new RuntimeException("Invalid token");
        }
        String username = jwtTokenProvider.getUsernameFromToken(token);
        return getUserByUsername(username);
    }
}
