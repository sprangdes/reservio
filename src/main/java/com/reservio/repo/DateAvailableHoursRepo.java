package com.reservio.repo;

import com.reservio.entity.DateAvailableHours;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface DateAvailableHoursRepo extends JpaRepository<DateAvailableHours, Long> {
    Optional<DateAvailableHours> findByDate(LocalDate date);
}
