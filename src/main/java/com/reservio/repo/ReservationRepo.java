package com.reservio.repo;

import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepo extends JpaRepository<Reservation, Long>, JpaSpecificationExecutor<Reservation> {
    List<Reservation> findAllByReservationDateAndStatusNot(LocalDate date, ReservationStatus status);

    long countByUserAndReservationDateAndStatusNot(UserData user, LocalDate date, ReservationStatus status);

    long countByBusinessAndReservationDateAndStatusNot(BusinessData businessData, LocalDate now, ReservationStatus reservationStatus);

    Optional<Reservation> findByIdAndUser(Long id, UserData user);

    Optional<Reservation> findByIdAndBusiness(Long id, BusinessData businessData);

    long countByBusinessAndStatusIn(BusinessData businessData, List<ReservationStatus> statuses);

    long countByUserAndStatus(UserData user, ReservationStatus reservationStatus);

    List<Reservation> findAllByStatusIn(List<ReservationStatus> statuses);

    List<Reservation> findAllByUser(UserData user);

    long countByBusinessAndTitleAndStatusIn(BusinessData businessData, String title, List<ReservationStatus> statuses);

    List<Reservation> getAllByUserAndReservationDate(UserData user, LocalDate date);

    List<Reservation> getAllByBusinessAndReservationDate(BusinessData businessData, LocalDate today);
}
