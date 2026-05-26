package com.psp.core.service;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import com.psp.core.model.Transaction;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
public class QRService {

    public Map<String, String> generateIPSQRCode(Transaction transaction) throws Exception {
        String amountFormatted = String.format("%.2f", transaction.getAmount()).replace(".", ",");
        
        // NBS IPS Standardni format (Stavka 1.2 specifikacije)
        String ipsString = String.format(
            "K:PR|V:01|C:1|R:%s|N:%s|I:RSD%s|SF:%s|S:%s|RO:%s",
            "265000000012345678",      // Račun prodavca
            "Rent-A-Car Agency DOO",   // Naziv prodavca
            amountFormatted,           // Iznos
            "289",                     // Šifra plaćanja
            "Placanje po transakciji", // Svrha
            transaction.getId()        // Poziv na broj
        );

        QRCodeWriter qrCodeWriter = new QRCodeWriter();
        BitMatrix bitMatrix = qrCodeWriter.encode(ipsString, BarcodeFormat.QR_CODE, 300, 300);

        ByteArrayOutputStream pngOutputStream = new ByteArrayOutputStream();
        MatrixToImageWriter.writeToStream(bitMatrix, "PNG", pngOutputStream);
        String base64Image = Base64.getEncoder().encodeToString(pngOutputStream.toByteArray());

        Map<String, String> response = new HashMap<>();
        response.put("qrCode", base64Image);
        response.put("ipsString", ipsString);
        return response;
    }
}