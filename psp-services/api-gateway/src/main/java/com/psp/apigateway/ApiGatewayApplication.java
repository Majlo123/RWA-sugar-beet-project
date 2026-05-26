package com.psp.apigateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
// Importi potrebni za CORS
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsWebFilter;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;

@SpringBootApplication
@EnableWebFluxSecurity
public class ApiGatewayApplication {

    public static void main(String[] args) {
        SpringApplication.run(ApiGatewayApplication.class, args);
    }

    // 1. DEFINISANJE RUTA (Rutiranje ka mikroservisima)
    // Routes are defined in application.yml
    /*
    @Bean
    public RouteLocator myRoutes(RouteLocatorBuilder builder) {
        return builder.routes()
            // Ruta za Core Service (8081)
            .route("core-service", r -> r.path("/core/**")
                .filters(f -> f.stripPrefix(1))
                .uri("http://localhost:8081"))
            
            // Ruta za Card Service (8082)
            .route("card-service", r -> r.path("/card/**")
                .filters(f -> f.stripPrefix(1))
                .uri("http://localhost:8082"))
                
            // Ruta za PayPal Service (8083)
            .route("paypal-service", r -> r.path("/paypal/**")
                .filters(f -> f.stripPrefix(1))
                .uri("http://localhost:8083"))

            // --- NOVO: Ruta za Bank Service (Simulator) ---
            // Svi zahtevi koji idu na /bank/... biće prosleđeni na port 8085
            .route("bank-service", r -> r.path("/bank/**")
                .filters(f -> f.stripPrefix(1))
                .uri("http://localhost:8085"))
                
            .build();
    }
    */

    // 2. CORS KONFIGURACIJA
    @Bean
    public CorsWebFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedOriginPattern("*");
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return new CorsWebFilter(source);
    }

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        return http
            .csrf(ServerHttpSecurity.CsrfSpec::disable)
            .authorizeExchange(exchange -> exchange.anyExchange().permitAll())
            .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
            .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
            .build();
    }
}