package com.reservio.repo;

import com.reservio.entity.DateAvailableHours;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DateAvailableHoursRepo extends JpaRepository<DateAvailableHours, Long> {
    Optional<DateAvailableHours> findByBusinessIdAndDate(Long businessId, LocalDate date);
    List<DateAvailableHours> findAllByBusinessIdAndIsClosedTrueAndDateBetween(Long businessId, LocalDate startDate, LocalDate endDate);
    List<DateAvailableHours> findAllByBusinessIdAndDate(Long businessId, LocalDate date);
    List<DateAvailableHours> findAllByBusinessIdAndDateAfter(Long businessId, LocalDate today);
}
