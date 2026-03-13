package com.reservio.repo;

import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepo extends JpaRepository<Reservation, Long> {
    List<Reservation> findAllByReservationDateAndStatusNot(LocalDate date, ReservationStatus status);

    List<Reservation> findAllByBusinessAndReservationDate(BusinessData businessData, LocalDate now);

    Page<Reservation> findAllByBusinessAndReservationDate(BusinessData businessData, LocalDate now, Pageable pageable);

    List<Reservation> findAllByBusiness(BusinessData businessData);

    Page<Reservation> findAllByBusiness(BusinessData businessData, Pageable pageable);

    List<Reservation> findAllByUserAndStatusNotOrderByReservationDateDescStartTimeDesc(UserData user, ReservationStatus status);

    Page<Reservation> findAllByUserAndStatusNot(UserData user, ReservationStatus status, Pageable pageable);

    long countByUserAndReservationDateAndStatusNot(UserData user, LocalDate date, ReservationStatus status);

    long countByBusinessAndReservationDateAndStatusNot(BusinessData businessData, LocalDate now, ReservationStatus reservationStatus);

    Optional<Reservation> findByIdAndUser(Long id, UserData user);

    Optional<Reservation> findByIdAndBusiness(Long id, BusinessData businessData);

    List<Reservation> findAllByBusinessAndStatusIn(BusinessData businessData, List<ReservationStatus> statuses);

    Page<Reservation> findAllByBusinessAndStatusIn(BusinessData businessData, List<ReservationStatus> statuses, Pageable pageable);

    long countByBusinessAndStatusIn(BusinessData businessData, List<ReservationStatus> statuses);

    long countByUserAndStatus(UserData user, ReservationStatus reservationStatus);

    List<Reservation> findAllByStatusIn(List<ReservationStatus> statuses);

    long countByBusinessAndTitleAndStatusIn(BusinessData businessData, String title, List<ReservationStatus> statuses);
}
