package com.reservio.repo;

import com.reservio.entity.NotificationPreference;
import com.reservio.entity.UserData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NotificationPreferenceRepo extends JpaRepository<NotificationPreference, Long> {
    Optional<NotificationPreference> findByUser(UserData user);
}
