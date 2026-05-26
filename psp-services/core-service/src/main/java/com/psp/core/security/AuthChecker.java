package com.psp.core.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Authorization checker that respects the psp.disable-auth flag
 * Used in @PreAuthorize expressions
 */
@Component("authChecker")
public class AuthChecker {

    @Value("${psp.disable-auth:false}")
    private boolean disableAuth;

    /**
     * Check if access is allowed (for admin endpoints)
     * Returns true if auth is disabled OR if user has SUPER_ADMIN role
     */
    public boolean isAllowed() {
        if (disableAuth) {
            return true;
        }
        return hasRole("SUPER_ADMIN");
    }

    /**
     * Check if user has SUPER_ADMIN role (for admin endpoints when auth is enabled)
     */
    public boolean isSuperAdmin() {
        if (disableAuth) {
            return true;
        }
        return hasRole("SUPER_ADMIN");
    }

    /**
     * Check if user has CUSTOMER role or auth is disabled
     */
    public boolean isCustomer() {
        if (disableAuth) {
            return true;
        }
        return hasRole("CUSTOMER");
    }

    /**
     * Check if user has MERCHANT role or auth is disabled
     */
    public boolean isMerchant() {
        if (disableAuth) {
            return true;
        }
        return hasRole("MERCHANT");
    }

    /**
     * Check if user has any of the specified roles
     */
    public boolean hasAnyRole(String... roles) {
        if (disableAuth) {
            return true;
        }
        for (String role : roles) {
            if (hasRole(role)) {
                return true;
            }
        }
        return false;
    }

    private boolean hasRole(String role) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        
        String roleWithPrefix = role.startsWith("ROLE_") ? role : "ROLE_" + role;
        
        for (GrantedAuthority authority : auth.getAuthorities()) {
            if (authority.getAuthority().equals(roleWithPrefix)) {
                return true;
            }
        }
        return false;
    }
}
