package com.reservio.repo;

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

    // 計算特定使用者在特定日期的有效預約數
    long countByUserAndReservationDateAndStatusNot(UserData user, LocalDate date, ReservationStatus status);

    // 計算特定使用者的特定狀態預約數
    long countByUserAndStatus(UserData user, ReservationStatus status);
}
