package com.reservio.repo;

import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepo extends JpaRepository<Reservation, Long> {
    List<Reservation> findAllByReservationDateAndStatusNot(LocalDate date, ReservationStatus status);

    List<Reservation> findAllByBusinessAndReservationDate(BusinessData businessData, LocalDate now);

    List<Reservation> findAllByBusiness(BusinessData businessData);

    List<Reservation> findAllByUserAndStatusNotOrderByReservationDateDescStartTimeDesc(UserData user, ReservationStatus status);

    long countByUserAndReservationDateAndStatusNot(UserData user, LocalDate date, ReservationStatus status);

    long countByBusinessAndReservationDateAndStatusNot(BusinessData businessData, LocalDate now, ReservationStatus reservationStatus);

    Optional<Reservation> findByIdAndUser(Long id, UserData user);

    Optional<Reservation> findByIdAndBusiness(Long id, BusinessData businessData);

    List<Reservation> findAllByBusinessAndStatusIn(BusinessData businessData, List<ReservationStatus> statuses);

    long countByBusinessAndStatusIn(BusinessData businessData, List<ReservationStatus> statuses);
}
