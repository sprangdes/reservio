package com.reservio.repo;

import com.reservio.entity.Notification;
import com.reservio.entity.UserData;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.Optional;

public interface NotificationRepo extends JpaRepository<Notification, Long> {
    boolean existsByDedupeKey(String dedupeKey);
    Page<Notification> findAllByRecipient(UserData recipient, Pageable pageable);
    long countByRecipientAndReadAtIsNull(UserData recipient);
    Optional<Notification> findByIdAndRecipient(Long id, UserData recipient);
    void deleteAllByExpiresAtBefore(LocalDateTime now);

    @Modifying
    @Query("update Notification n set n.readAt = :now where n.recipient = :recipient and n.readAt is null")
    void markAllRead(UserData recipient, LocalDateTime now);
}
