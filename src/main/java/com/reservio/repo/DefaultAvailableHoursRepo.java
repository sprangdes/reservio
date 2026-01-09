package com.reservio.repo;

import com.reservio.entity.DateAvailableHours;
import com.reservio.entity.DefaultAvailableHours;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface DefaultAvailableHoursRepo extends JpaRepository<DefaultAvailableHours, Long> {
    Optional<DefaultAvailableHours> findByShopId(Long shopId);
}
