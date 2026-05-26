package com.psp.core.repository;

import com.psp.core.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    
    // --- DODAJ OVO ---
    Transaction findByMerchantOrderId(String merchantOrderId);
    
}