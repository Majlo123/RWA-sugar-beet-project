package com.psp.core.config;

import com.psp.core.security.JwtAuthenticationFilter;
import com.psp.core.security.MerchantAuthenticationFilter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Security Configuration for PSP Core Service
 * PCI DSS 8 - Access control and authentication
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final MerchantAuthenticationFilter merchantAuthenticationFilter;
    private final boolean disableAuth;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                         MerchantAuthenticationFilter merchantAuthenticationFilter,
                         @Value("${psp.disable-auth:false}") boolean disableAuth) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.merchantAuthenticationFilter = merchantAuthenticationFilter;
        this.disableAuth = disableAuth;
        
        // Log the auth status at startup
        if (disableAuth) {
            System.out.println("⚠️  WARNING: Authentication is DISABLED (PSP_DISABLE_AUTH=true)");
        } else {
            System.out.println("🔐 Authentication is ENABLED");
        }
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS));
        
        // If auth is disabled (development mode), permit all requests
        if (disableAuth) {
            http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        } else {
            http.authorizeHttpRequests(auth -> auth
                // Public endpoints - no authentication required
                .requestMatchers("/auth/**").permitAll()
                .requestMatchers("/actuator/**").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                
                // Super Admin only endpoints
                .requestMatchers("/admin/**").hasRole("SUPER_ADMIN")
                
                // Merchant registration is public (for now - can be restricted)
                .requestMatchers("/merchants/register").permitAll()
                
                // Merchant payment methods - accessible to customers for payment flow
                .requestMatchers("/merchants/*/methods").hasAnyRole("CUSTOMER", "MERCHANT", "SUPER_ADMIN")
                
                // Transaction endpoints - require either merchant or authenticated user
                .requestMatchers("/transactions/initiate").hasAnyRole("MERCHANT", "CUSTOMER", "SUPER_ADMIN")
                .requestMatchers("/transactions/status/**").hasAnyRole("MERCHANT", "CUSTOMER", "SUPER_ADMIN")
                .requestMatchers("/transactions/**").hasAnyRole("MERCHANT", "CUSTOMER", "SUPER_ADMIN")
                
                // QR code generation is public for payment flow
                .requestMatchers("/api/qr/**").permitAll()
                
                // Merchant management - Super Admin only (except methods endpoint above)
                .requestMatchers("/merchants/**").hasAnyRole("SUPER_ADMIN", "MERCHANT")
                
                // Audit logs - Super Admin only
                .requestMatchers("/audit/**").hasRole("SUPER_ADMIN")
                
                // All other requests require authentication
                .anyRequest().authenticated()
            );
        }
        
        http
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterAfter(merchantAuthenticationFilter, JwtAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(
            "http://localhost:4200",
            "https://localhost",
            "http://localhost:80",
            "https://localhost:443"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "X-Merchant-Id"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
