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

    /**
     * 取得「目前登入的客戶」的預約清單（預設不含已取消）。
     * 用於「我的預約」畫面。
     *
     * @return 我的預約清單（依日期/開始時間由新到舊）
     */
    public List<Reservation> getMyReservations() {
        UserData user = userDataService.getCurrentUser();
        return reservationRepo.findAllByUserAndStatusNotOrderByReservationDateDescStartTimeDesc(user, CANCELLED);
    }

    /**
     * 建立一筆新的預約（客戶端送出預約表單）。
     * 會自動補上：
     * - user（目前登入者）
     * - createdAt/createdBy
     * - deletedFlag
     *
     * @param reservation 預約資料（由表單綁定）
     * @throws UserNotFoundException 當找不到當前登入使用者時
     */
    public Reservation saveReservation(Reservation reservation) {
        UserData user = userDataService.getCurrentUser();
        if (user == null) {
            throw new UserNotFoundException("無法為不存在的使用者建立預約");
        }
        reservation.setUser(user);
        reservation.setCreatedAt(LocalDateTime.now());
        reservation.setCreatedBy("SYSTEM");
        reservation.setDeletedFlag(false);

        return reservationRepo.save(reservation);
    }

    /**
     * 取得「今日預約數量」。
     * - 店家：計算該店家今日預約（排除 CANCELLED）
     * - 客戶：計算該客戶今日預約（排除 CANCELLED）
     *
     * @return 今日預約數量
     */
    public long countTodayReservations() {
        UserData user = userDataService.getCurrentUser();
        BusinessData businessData = user.getBusinessData();
        if (businessData != null) {
            return reservationRepo.countByBusinessAndReservationDateAndStatusNot(businessData, LocalDate.now(), CANCELLED);
        }
        return reservationRepo.countByUserAndReservationDateAndStatusNot(user, LocalDate.now(), CANCELLED);
    }

    /**
    /**
     * 取得待處理預約數量
     * - 客戶：只計算自己的 PENDING
     * - 店家：計算該店家的 PENDING + CANCEL_REQUESTED
     *
     * @return 待處理預約數量
     */
    public long countPendingReservations() {
        UserData user = userDataService.getCurrentUser();
        BusinessData businessData = user.getBusinessData();

        // 店家：待處理包含「待確認」與「取消確認中」
        if (businessData != null) {
            return reservationRepo.countByBusinessAndStatusIn(businessData, List.of(PENDING, CANCEL_REQUESTED));
        }

        // 客戶：待處理就是自己的「待確認」
        return reservationRepo.countByUserAndStatus(user, PENDING);
    }

    /**
     * 取得店家的「全部預約」清單。
     * 若當前登入者不是店家帳號，回傳空清單。
     *
     * @return 店家全部預約清單
     */
    public List<Reservation> getAllReservationsForBusiness() {
        UserData currentUser = userDataService.getCurrentUser();
        BusinessData businessData = currentUser.getBusinessData();
        if (businessData == null) {
            return List.of();
        }
        return reservationRepo.findAllByBusiness(businessData);
    }

    /**
     * 取得店家的「待處理」預約清單（PENDING + CANCEL_REQUESTED）。
     * 若當前登入者不是店家帳號，回傳空清單。
     *
     * @return 店家待處理預約清單
     */
    public List<Reservation> getPendingReservationsForBusiness() {
        UserData currentUser = userDataService.getCurrentUser();
        BusinessData businessData = currentUser.getBusinessData();
        if (businessData == null) {
            return List.of();
        }
        return reservationRepo.findAllByBusinessAndStatusIn(businessData, List.of(PENDING, CANCEL_REQUESTED));
    }

    /**
     * 取得店家「今日預約清單」。
     * 僅店家帳號可取得；非店家回空清單。
     *
     * @return 今日預約清單
     */
    public List<Reservation> getTodayReservations() {
        UserData currentUser = userDataService.getCurrentUser();
        BusinessData businessData = currentUser.getBusinessData();
        if (businessData == null) {
            return List.of();
        }
        return reservationRepo.findAllByBusinessAndReservationDate(businessData, LocalDate.now());
    }

    /**
     * 客戶取消預約。
     * 規則：
     * - 若目前狀態為 PENDING：可直接取消，狀態 -> CANCELLED（立即生效）
     * - 若目前狀態為 CONFIRMED：送出取消原因，狀態 -> CANCEL_REQUESTED（待店家確認）
     * - 其他狀態不可取消
     *
     * @param reservationId 預約ID
     * @param cancelReason  取消原因（CONFIRMED 時必填；PENDING 時可為 null）
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
            String reason = cancelReason == null ? "" : cancelReason.trim();
            reservation.setCancelReason(reason);
        } else {
            throw new IllegalStateException("此預約狀態不可取消: " + currentStatus);
        }

        reservation.setUpdatedAt(LocalDateTime.now());
        reservation.setUpdatedBy(currentUser.getUsername());
        reservationRepo.save(reservation);
    }

    /**
     * 更新預約狀態（店家後台操作使用）。
     * 此方法會自動寫入 updatedAt/updatedBy。
     * 若 newStatus = CANCELLED，會寫入 cancelledAt。
     *
     * @param id        預約ID
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
     * 店家處理客戶提出的取消申請（狀態為 CANCEL_REQUESTED）。
     * 規則：
     * - approve=true  -> 狀態改為 CANCELLED（取消完成）
     * - approve=false -> 狀態改回 CONFIRMED（駁回取消）
     *
     * @param reservationId 預約ID
     * @param approve       是否同意取消
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
