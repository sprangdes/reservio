package com.reservio.service;

import com.reservio.entity.Reservation;
import com.reservio.entity.UserData;
import com.reservio.exception.UserNotFoundException;
import com.reservio.repo.ReservationRepo;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static com.reservio.enums.ReservationStatus.CANCELLED;
import static com.reservio.enums.ReservationStatus.PENDING;

@Service
public class ReservationService {

    private final ReservationRepo reservationRepo;
    private final UserDataService userDataService;

    public ReservationService(
            ReservationRepo reservationRepo,
            UserDataService userDataService) {
        this.reservationRepo = reservationRepo;
        this.userDataService = userDataService;
    }

    public void saveReservation(Reservation reservation) {
        UserData user = userDataService.getCurrentUser();
        if (user == null) {
            throw new UserNotFoundException("無法為不存在的使用者建立預約");
        }
        reservation.setUser(user);
        reservation.setCreatedAt(LocalDateTime.now());
        reservation.setCreatedBy("SYSTEM");
        reservation.setDeletedFlag(false);

        reservationRepo.save(reservation);
    }

    public long countTodayReservations() {
        UserData user = userDataService.getCurrentUser();
        return reservationRepo.countByUserAndReservationDateAndStatusNot(
                user,
                LocalDate.now(),
                CANCELLED
        );
    }

    public long countPendingReservations() {
        UserData user = userDataService.getCurrentUser();
        return reservationRepo.countByUserAndStatus(user, PENDING);
    }

    public List<Reservation> getTodayReservations() {
        return reservationRepo.findAllByReservationDate(LocalDate.now());
    }
}
