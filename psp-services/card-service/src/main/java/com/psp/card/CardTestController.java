package com.psp.card;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CardTestController {
    @GetMapping("/test")
    public String test() {
        return "Pozdrav iz PSP Card Servisa (Port 8082)!";
    }
}