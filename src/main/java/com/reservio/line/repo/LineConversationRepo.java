package com.reservio.line.repo;

import com.reservio.line.entity.LineConversation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.time.LocalDateTime;

public interface LineConversationRepo extends JpaRepository<LineConversation, Long> {
    Optional<LineConversation> findByBusinessIdAndLineUserId(Long businessId, String lineUserId);

    long deleteByUpdatedAtBefore(LocalDateTime updatedAt);
}
