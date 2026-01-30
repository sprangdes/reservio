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

import static com.reservio.enums.ReservationStatus.*;

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

    public List<Reservation> getMyReservations() {
        UserData user = userDataService.getCurrentUser();
        return reservationRepo.findAllByUserAndStatusNotOrderByReservationDateDescStartTimeDesc(user, CANCELLED);
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
     * 一般客戶：以 user + status 查
     * 店家：以 business + status 查（店家「待確認」的核心）
     */
    public long countPendingReservations() {
        UserData user = userDataService.getCurrentUser();
        BusinessData businessData = user.getBusinessData();

        if (businessData != null) {
            return reservationRepo.countByBusinessAndStatusIn(businessData, List.of(PENDING, CANCEL_REQUESTED));
        }
        return reservationRepo.countByUserAndStatus(user, PENDING);
    }

    public List<Reservation> getAllReservationsForBusiness() {
        UserData currentUser = userDataService.getCurrentUser();
        BusinessData businessData = currentUser.getBusinessData();
        if (businessData == null) {
            return List.of();
        }
        return reservationRepo.findAllByBusinessAndStatusIn(businessData, List.of(PENDING, CANCEL_REQUESTED));
    }

    public List<Reservation> getPendingReservationsForBusiness() {
        UserData currentUser = userDataService.getCurrentUser();
        BusinessData businessData = currentUser.getBusinessData();
        if (businessData == null) {
            return List.of();
        }
        return reservationRepo.findAllByBusinessAndStatus(businessData, PENDING);
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
     * 客戶取消預約：
     * - 若為 PENDING：直接取消(CANCELLED)
     * - 若為 CONFIRMED：改為取消確認中(CANCEL_REQUESTED) 並記錄 cancelReason
     */
    @Transactional
    public void customerCancel(Long reservationId, String cancelReason) {
        UserData currentUser = userDataService.getCurrentUser();
        Reservation reservation = reservationRepo.findByIdAndUser(reservationId, currentUser)
                .orElseThrow(() -> new IllegalArgumentException("找不到您的預約或無權限操作: " + reservationId));

        ReservationStatus currentStatus = reservation.getStatus();

        if (currentStatus == PENDING) {
            reservation.setStatus(CANCELLED);
            reservation.setCancelledAt(LocalDateTime.now());
            reservation.setCancelReason(null);
        } else if (currentStatus == CONFIRMED) {
            reservation.setStatus(CANCEL_REQUESTED);
            reservation.setCancelReason(cancelReason.trim());
        } else {
            throw new IllegalStateException("此預約狀態不可取消: " + currentStatus);
        }

        reservation.setUpdatedAt(LocalDateTime.now());
        reservation.setUpdatedBy(currentUser.getUsername());
        reservationRepo.save(reservation);
    }

    /**
     * 更新預約狀態
     * @param id 預約ID
     * @param newStatus 欲變更的新狀態
     */
    public void updateReservationStatus(Long id, ReservationStatus newStatus) {
        UserData actor = userDataService.getCurrentUser();

        Reservation reservation = reservationRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("找不到該筆預約資料: " + id));

        reservation.setStatus(newStatus);
        reservation.setUpdatedAt(LocalDateTime.now());
        reservation.setUpdatedBy(actor.getUsername());

        if (newStatus == CANCELLED) {
            reservation.setCancelledAt(LocalDateTime.now());
        }

        reservationRepo.save(reservation);
    }

    /**
     * 店家處理「取消確認中」：
     * - approve=true  -> CANCELLED
     * - approve=false -> CONFIRMED (駁回取消)
     */
    @Transactional
    public void handleCancelRequestForBusiness(Long reservationId, boolean approve) {
        UserData actor = userDataService.getCurrentUser();
        BusinessData businessData = actor.getBusinessData();
        if (businessData == null) {
            throw new IllegalStateException("非店家帳號無法處理取消申請");
        }

        Reservation reservation = reservationRepo.findByIdAndBusiness(reservationId, businessData)
                .orElseThrow(() -> new IllegalArgumentException("找不到該店家的預約或無權限操作: " + reservationId));

        if (reservation.getStatus() != CANCEL_REQUESTED) {
            throw new IllegalStateException("此預約目前不是取消確認中，無法處理: " + reservation.getStatus());
        }

        if (approve) {
            reservation.setStatus(CANCELLED);
            reservation.setCancelledAt(LocalDateTime.now());
        } else {
            reservation.setStatus(CONFIRMED);
        }

        reservation.setUpdatedAt(LocalDateTime.now());
        reservation.setUpdatedBy(actor.getUsername());
        reservationRepo.save(reservation);
    }
}
