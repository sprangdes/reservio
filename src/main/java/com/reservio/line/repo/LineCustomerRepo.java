package com.reservio.line.repo;

import com.reservio.line.entity.LineCustomer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LineCustomerRepo extends JpaRepository<LineCustomer, Long> {
    Optional<LineCustomer> findByBusinessIdAndLineUserId(Long businessId, String lineUserId);
}
