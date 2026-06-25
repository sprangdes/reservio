package com.reservio.line.repo;

import com.reservio.line.entity.LineAccountLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LineAccountLinkRepo extends JpaRepository<LineAccountLink, Long> {
    Optional<LineAccountLink> findByRequestTokenHash(String requestTokenHash);
    Optional<LineAccountLink> findByNonceHash(String nonceHash);
}
