package com.psp.paypal.repository;

import com.psp.paypal.model.PayPalTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PayPalTransactionRepository extends MongoRepository<PayPalTransaction, String> {
    Optional<PayPalTransaction> findByMerchantOrderId(String merchantOrderId);
    Optional<PayPalTransaction> findByPaypalPaymentId(String paypalPaymentId);
}
