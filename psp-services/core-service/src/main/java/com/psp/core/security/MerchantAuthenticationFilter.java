package com.psp.core.security;

import com.psp.core.model.Merchant;
import com.psp.core.repository.MerchantRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.Optional;

/**
 * Merchant API Authentication Filter
 * Validates Merchant credentials on every API call
 * PCI DSS 8.3 - Strong authentication for merchants
 */
@Component
public class MerchantAuthenticationFilter extends OncePerRequestFilter {

    private final MerchantRepository merchantRepository;
    private final PasswordHasher passwordHasher;

    public MerchantAuthenticationFilter(MerchantRepository merchantRepository) {
        this.merchantRepository = merchantRepository;
        this.passwordHasher = new PasswordHasher();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        
        // Only apply to merchant-specific endpoints that need API key authentication
        // Skip if already authenticated via JWT
        if (SecurityContextHolder.getContext().getAuthentication() != null &&
            SecurityContextHolder.getContext().getAuthentication().isAuthenticated()) {
            filterChain.doFilter(request, response);
            return;
        }

        String merchantId = request.getHeader("X-Merchant-Id");
        String merchantPassword = request.getHeader("X-Merchant-Password");

        if (merchantId != null && merchantPassword != null) {
            Optional<Merchant> merchantOpt = merchantRepository.findById(merchantId);
            
            if (merchantOpt.isPresent()) {
                Merchant merchant = merchantOpt.get();
                
                // Check if merchant is active and not locked
                if (merchant.getIsActive() && 
                    (merchant.getFailedAuthAttempts() == null || merchant.getFailedAuthAttempts() < 6)) {
                    
                    // Verify password using secure comparison
                    if (passwordHasher.verify(merchantPassword, merchant.getMerchantPassword())) {
                        // Reset failed attempts on successful auth
                        merchant.setFailedAuthAttempts(0);
                        merchantRepository.save(merchant);
                        
                        UsernamePasswordAuthenticationToken authentication =
                                new UsernamePasswordAuthenticationToken(
                                        merchantId,
                                        null,
                                        Collections.singletonList(new SimpleGrantedAuthority("ROLE_MERCHANT"))
                                );
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    } else {
                        // Increment failed attempts
                        int attempts = merchant.getFailedAuthAttempts() != null ? 
                                merchant.getFailedAuthAttempts() : 0;
                        merchant.setFailedAuthAttempts(attempts + 1);
                        merchantRepository.save(merchant);
                    }
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        // Don't apply to auth endpoints or public endpoints
        return path.startsWith("/auth/") || 
               path.startsWith("/actuator/") ||
               path.startsWith("/swagger-ui/") ||
               path.startsWith("/v3/api-docs");
    }
}
