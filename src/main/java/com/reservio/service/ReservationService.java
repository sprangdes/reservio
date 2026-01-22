package com.reservio.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationStatus;
import com.reservio.exception.UserNotFoundException;
import com.reservio.repo.ReservationRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    /**
     * 儲存預約
     * @param reservation 預約資料
     */
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

    /**
     * 取得今日預約數量
     * @return 今日預約數量
     */
    public long countTodayReservations() {
        UserData user = userDataService.getCurrentUser();
        BusinessData businessData = user.getBusinessData();
        LocalDate now = LocalDate.now();
        // 商家看店內的預約數，客戶看自己的預約數
        if (businessData != null) {
            return reservationRepo.countByBusinessAndReservationDateAndStatusNot(businessData, now, CANCELLED);
        }
        return reservationRepo.countByUserAndReservationDateAndStatusNot(user, now, CANCELLED);
    }

    /**
     * 取得今日待處理預約數量
     * @return 今日待處理預約數量
     */
    public long countPendingReservations() {
        UserData user = userDataService.getCurrentUser();
        return reservationRepo.countByUserAndStatus(user, PENDING);
    }

    /**
     * 取得今日預約清單
     * @return 今日預約清單
     */
    public List<Reservation> getTodayReservations() {
        UserData currentUser = userDataService.getCurrentUser();
        BusinessData businessData = currentUser.getBusinessData();
        LocalDate now = LocalDate.now();
        // 如果是商家登入，只查詢該店家的預約
        if (businessData != null) {
            return reservationRepo.findAllByBusinessAndReservationDate(businessData, now);
        }
        return List.of();
    }

    /**
     * 更新預約狀態
     * @param id 預約ID
     * @param newStatus 欲變更的新狀態
     */
    @Transactional
    public void updateReservationStatus(Long id, ReservationStatus newStatus) {
        Reservation reservation = reservationRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("找不到該筆預約資料: " + id));

        reservation.setStatus(newStatus);
        reservation.setUpdatedAt(LocalDateTime.now());
        reservation.setUpdatedBy("SYSTEM"); // 後續可改為當前登入者

        if (newStatus == CANCELLED) {
            reservation.setCancelledAt(LocalDateTime.now());
        }

        reservationRepo.save(reservation);
    }
}
