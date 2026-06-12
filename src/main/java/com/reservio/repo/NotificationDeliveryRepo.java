package com.reservio.repo;

import com.reservio.entity.NotificationDelivery;
import com.reservio.enums.NotificationDeliveryStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface NotificationDeliveryRepo extends JpaRepository<NotificationDelivery, Long> {
    List<NotificationDelivery> findTop50ByStatusAndNextAttemptAtBeforeOrderById(
            NotificationDeliveryStatus status, LocalDateTime now);
}
