package com.reservio.repo;

import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationStatus;
import com.reservio.enums.ReservationSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ReservationRepo extends JpaRepository<Reservation, Long>, JpaSpecificationExecutor<Reservation> {

    List<Reservation> findAllByReservationDateAndStatusNot(LocalDate date, ReservationStatus status);
    List<Reservation> findAllByBusinessIdAndReservationDateAndStatusNot(Long businessId, LocalDate date, ReservationStatus status);

    long countByUserAndReservationDateAndStatusNot(UserData user, LocalDate date, ReservationStatus status);

    long countByBusinessAndReservationDateAndStatusNot(BusinessData businessData, LocalDate now, ReservationStatus reservationStatus);

    Optional<Reservation> findByIdAndUser(Long id, UserData user);

    Optional<Reservation> findByIdAndBusiness(Long id, BusinessData businessData);

    long countByBusinessAndStatusIn(BusinessData businessData, List<ReservationStatus> statuses);

    long countByUserAndStatus(UserData user, ReservationStatus reservationStatus);

    long countByBusinessAndTitleAndStatusIn(BusinessData businessData, String title, List<ReservationStatus> statuses);

    List<Reservation> findAllByStatusIn(List<ReservationStatus> statuses);
    List<Reservation> findAllByStatusAndReservationDateBetween(
            ReservationStatus status, LocalDate startDate, LocalDate endDate);

    List<Reservation> findAllByUser(UserData user);

    List<Reservation> getAllByUserAndReservationDateAndStatusIn(UserData user, LocalDate date, List<ReservationStatus> statuses);

    List<Reservation> getAllByBusinessAndReservationDateAndStatusIn(BusinessData businessData, LocalDate today, List<ReservationStatus> statuses);

    List<Reservation> getAllByBusinessAndReservationDateBetweenAndStatusIn(BusinessData businessData, LocalDate startOfWeek, LocalDate endOfWeek, List<ReservationStatus> statuses);

    List<Reservation> getAllByUserAndReservationDateBetweenAndStatusIn(UserData currentUser, LocalDate startOfWeek, LocalDate endOfWeek, List<ReservationStatus> statuses);

    @Modifying
    @Query("""
            update Reservation reservation
               set reservation.user = :targetUser
             where reservation.business = :business
               and reservation.user = :sourceUser
               and reservation.source = :source
            """)
    int transferLineReservations(
            @Param("business") BusinessData business,
            @Param("sourceUser") UserData sourceUser,
            @Param("targetUser") UserData targetUser,
            @Param("source") ReservationSource source);
}
