package com.psp.paypal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PaypalTestController {
    @GetMapping("/test")
    public String test() {
        return "Pozdrav iz PSP PayPal Servisa (Port 8083) - MongoDB!";
    }
}