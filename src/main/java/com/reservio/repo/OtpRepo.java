package com.reservio.repo;

import com.reservio.entity.Otp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpRepo extends JpaRepository<Otp, Long> {
    Optional<Otp> findTopByUserIdOrderByCreatedAtDesc(Long userId);
}
