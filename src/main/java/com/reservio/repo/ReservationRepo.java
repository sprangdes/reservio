package com.reservio.repo;

import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ReservationRepo extends JpaRepository<Reservation, Long> {
    List<Reservation> findAllByReservationDateAndStatusNot(LocalDate date, ReservationStatus status);

    List<Reservation> findAllByBusinessAndReservationDate(BusinessData businessData, LocalDate now);

    long countByUserAndReservationDateAndStatusNot(UserData user, LocalDate date, ReservationStatus status);

    long countByUserAndStatus(UserData user, ReservationStatus status);

    long countByBusinessAndReservationDateAndStatusNot(BusinessData businessData, LocalDate now, ReservationStatus reservationStatus);

    long countByBusinessAndStatus(BusinessData businessData, ReservationStatus status);
}
