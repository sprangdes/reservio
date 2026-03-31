package com.reservio.repo;

import com.reservio.entity.DefaultAvailableHour;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.DayOfWeek;
import java.util.Optional;
import java.util.List;

@Repository
public interface DefaultAvailableHoursRepo extends JpaRepository<DefaultAvailableHour, Long> {
    Optional<DefaultAvailableHour> findByBusinessIdAndDayOfWeek(Long businessId, DayOfWeek dayOfWeek);
    List<DefaultAvailableHour> findAllByBusinessId(Long businessId);
}
