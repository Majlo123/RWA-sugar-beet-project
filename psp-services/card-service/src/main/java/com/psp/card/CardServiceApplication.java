package com.psp.card; // Proveri paket

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean; // <--- OBAVEZNO
import org.springframework.web.client.RestTemplate; // <--- OBAVEZNO

@SpringBootApplication
public class CardServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(CardServiceApplication.class, args);
    }

    // --- DODAJ OVO ---
    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}