package com.psp.crypto.repository;

import com.psp.crypto.model.CryptoTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface CryptoTransactionRepository extends MongoRepository<CryptoTransaction, String> {
    Optional<CryptoTransaction> findByBtcAddress(String btcAddress);
    Optional<CryptoTransaction> findByMerchantOrderId(String merchantOrderId);
}
