package com.psp.core.repository;

import com.psp.core.model.Merchant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MerchantRepository extends JpaRepository<Merchant, String> {
    // Spring Data JPA već ima metodu findById, to nam je dovoljno
}