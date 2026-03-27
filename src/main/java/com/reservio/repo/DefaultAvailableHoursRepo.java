package com.reservio.repo;

import com.reservio.entity.DefaultAvailableHours;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.util.Optional;
import java.util.List;

@Repository
public interface DefaultAvailableHoursRepo extends JpaRepository<DefaultAvailableHours, Long> {
    Optional<DefaultAvailableHours> findByBusinessIdAndDayOfWeek(Long businessId, DayOfWeek dayOfWeek);
    List<DefaultAvailableHours> findAllByBusinessId(Long businessId);
}
