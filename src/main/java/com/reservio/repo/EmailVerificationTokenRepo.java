package com.reservio.repo;

import com.reservio.entity.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmailVerificationTokenRepo extends JpaRepository<EmailVerificationToken, Long> {
    Optional<EmailVerificationToken> findTopByUserIdOrderByCreatedAtDesc(Long userId);
}
