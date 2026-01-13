package com.reservio.repo;

import com.reservio.entity.Reservation;
import com.reservio.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReservationRepo extends JpaRepository<Reservation, Long> {
    List<Reservation> findAllByReservationDateAndStatusNot(LocalDate date, ReservationStatus status);
}
