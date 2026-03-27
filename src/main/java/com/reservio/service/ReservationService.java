package com.reservio.service;

import com.reservio.dto.BusinessDTO;
import com.reservio.dto.QueryReservationCondition;
import com.reservio.dto.ReservationDTO;
import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationStatus;
import com.reservio.exception.UserNotFoundException;
import com.reservio.repo.ReservationRepo;
import com.reservio.service.specification.ReservationSpecification;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

import static com.reservio.enums.ReservationStatus.*;
import static com.reservio.enums.Role.ROLE_BUSINESS;
import static com.reservio.enums.SystemEnum.*;
import static org.springframework.data.domain.Sort.Direction.*;

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
        reservation.setCreatedBy(SYSTEM.name());
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

    public Page<Reservation> queryReservationsForCustomerPage(
            QueryReservationCondition condition,
            int page,
            int size,
            String sortBy,
            String sortDir) {
        UserData user = userDataService.getCurrentUser();
        Pageable pageable = PageRequest.of(page, size, buildSort(sortBy, sortDir));
        Specification<Reservation> spec = Specification.where(ReservationSpecification.customerIs(user.getId()));
        // 動態處理日期條件
        spec = timeSpecification(condition, spec);
        // 狀態條件
        spec = statusSpecification(condition, spec);
        // 商家條件
        spec = businessSpecification(condition, spec);
        // 服務條件
        spec = serviceSpecification(condition, spec);
        // keyword 條件
        spec = keywordSpecificationForCustomer(condition, spec);
        return reservationRepo.findAll(spec, pageable);
    }

    public Page<Reservation> queryReservationsForBusinessPage(
            QueryReservationCondition condition,
            int page,
            int size,
            String sortBy,
            String sortDir) {
        UserData currentUser = userDataService.getCurrentUser();
        BusinessData businessData = currentUser.getBusinessData();
        if (businessData == null) {
            return Page.empty();
        }
        Pageable pageable = PageRequest.of(page, size, buildSort(sortBy, sortDir));
        Specification<Reservation> spec = Specification.where(ReservationSpecification.businessIs(businessData.getId()));
        // 動態處理日期條件
        spec = timeSpecification(condition, spec);
        // 服務條件
        spec = serviceSpecification(condition, spec);
        // 狀態條件
        spec = statusSpecification(condition, spec);
        // keyword 條件：假設想讓 customerNameLike 和 remarkLike 以 OR 組合（同時搜尋），然後與整體 AND
        spec = keywordSpecificationForBusiness(condition, spec);
        return reservationRepo.findAll(spec, pageable);
    }

    public List<BusinessDTO> getReservedBusinesses() {
        UserData currentUser = userDataService.getCurrentUser();
        List<Reservation> customerReservations = reservationRepo.findAllByUser(currentUser);
        return customerReservations.stream()
                .map(Reservation::getBusiness)
                .map(this::toBusinessDTO)
                .distinct()
                .toList();
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

        if (isEnded(reservation)) {
            markCompleted(reservation);
            throw new IllegalStateException("已完成的預約不可取消");
        }

        ReservationStatus currentStatus = reservation.getStatus();

        if (currentStatus == COMPLETED) {
            throw new IllegalStateException("已完成的預約不可取消");
        }

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

        if (isEnded(reservation)) {
            markCompleted(reservation);
            throw new IllegalStateException("已完成的預約不可變更狀態");
        }

        if (reservation.getStatus() == COMPLETED) {
            throw new IllegalStateException("已完成的預約不可變更狀態");
        }

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

        if (isEnded(reservation)) {
            markCompleted(reservation);
            throw new IllegalStateException("已完成的預約不可處理取消");
        }

        if (reservation.getStatus() == COMPLETED) {
            throw new IllegalStateException("已完成的預約不可處理取消");
        }

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

    @Scheduled(cron = "0 */5 * * * * ")
    public void markCompletedReservations() {
        LocalDateTime now = LocalDateTime.now();
        List<Reservation> candidates = reservationRepo.findAllByStatusIn(List.of(PENDING, CONFIRMED, CANCEL_REQUESTED));
        for (Reservation reservation : candidates) {
            LocalDateTime endAt = LocalDateTime.of(reservation.getReservationDate(), reservation.getEndTime());
            if (!endAt.isAfter(now)) {
                reservation.setStatus(COMPLETED);
                reservation.setUpdatedAt(now);
                reservation.setUpdatedBy(SYSTEM.name());
                reservationRepo.save(reservation);
            }
        }
    }

    public List<Reservation> getTodayReservations() {
        UserData currentUser = userDataService.getCurrentUser();
        LocalDate today = LocalDate.now();
        if (currentUser.getRole().equals(ROLE_BUSINESS.name())) {
            return reservationRepo.getAllByBusinessAndReservationDateAndStatusIn(
                    currentUser.getBusinessData(),
                    today,
                    List.of(CONFIRMED, COMPLETED)
            );
        }
        return reservationRepo.getAllByUserAndReservationDateAndStatusIn(
                currentUser,
                today,
                List.of(CONFIRMED, COMPLETED)
        );
    }

    public List<Reservation> getWeekReservations() {
        UserData currentUser = userDataService.getCurrentUser();
        LocalDate today = LocalDate.now();
        LocalDate startOfWeek = today.with(DayOfWeek.MONDAY);
        LocalDate endOfWeek = today.with(DayOfWeek.SUNDAY);
        if (currentUser.getRole().equals(ROLE_BUSINESS.name())) {
            return reservationRepo.getAllByBusinessAndReservationDateBetweenAndStatusIn(
                    currentUser.getBusinessData(),
                    startOfWeek,
                    endOfWeek,
                    List.of(CONFIRMED, COMPLETED)
            );
        }
        return reservationRepo.getAllByUserAndReservationDateBetweenAndStatusIn(
                currentUser,
                startOfWeek,
                endOfWeek,
                List.of(CONFIRMED, COMPLETED)
        );
    }

    public List<Reservation> getMonthReservations() {
        UserData currentUser = userDataService.getCurrentUser();
        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());
        if (currentUser.getRole().equals(ROLE_BUSINESS.name())) {
            return reservationRepo.getAllByBusinessAndReservationDateBetweenAndStatusIn(
                    currentUser.getBusinessData(),
                    startOfMonth,
                    endOfMonth,
                    List.of(CONFIRMED, COMPLETED)
            );
        }
        return reservationRepo.getAllByUserAndReservationDateBetweenAndStatusIn(
                currentUser,
                startOfMonth,
                endOfMonth,
                List.of(CONFIRMED, COMPLETED)
        );
    }

    private void markCompleted(Reservation reservation) {
        reservation.setStatus(COMPLETED);
        reservation.setUpdatedAt(LocalDateTime.now());
        reservation.setUpdatedBy(SYSTEM.name());
        reservationRepo.save(reservation);
    }

    private boolean isEnded(Reservation reservation) {
        if (!List.of(PENDING, CONFIRMED, CANCEL_REQUESTED).contains(reservation.getStatus())) {
            return false;
        }
        LocalDateTime endAt = LocalDateTime.of(reservation.getReservationDate(), reservation.getEndTime());
        return !endAt.isAfter(LocalDateTime.now());
    }

    private Sort buildSort(String sortBy, String sortDir) {
        String sortField = mapSortField(sortBy);
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? ASC : DESC;
        return Sort.by(direction, sortField);
    }

    private String mapSortField(String sortBy) {
        if (sortBy == null || sortBy.isBlank()) {
            return "reservationDate";
        }
        return switch (sortBy) {
            case "startTime" -> "startTime";
            case "status" -> "status";
            case "title" -> "title";
            case "remark" -> "remark";
            case "username" -> "user.username";
            case "businessName" -> "business.name";
            default -> "reservationDate";
        };
    }

    private static Specification<Reservation> keywordSpecificationForBusiness(
            QueryReservationCondition condition,
            Specification<Reservation> spec) {
        if (condition.getKeyword() != null) {
            spec = spec.and(ReservationSpecification.keywordLikeForBusiness(condition.getKeyword()));
        }
        return spec;
    }

    private static Specification<Reservation> keywordSpecificationForCustomer(
            QueryReservationCondition condition,
            Specification<Reservation> spec) {
        if (condition.getKeyword() != null) {
            spec = spec.and(ReservationSpecification.keywordLikeForCustomer(condition.getKeyword()));
        }
        return spec;
    }

    private static Specification<Reservation> statusSpecification(
            QueryReservationCondition condition,
            Specification<Reservation> spec) {
        if (condition.getStatus() != null && !condition.getStatus().isBlank()) {
            try {
                Specification<Reservation> statusSpec = Arrays.stream(condition.getStatus().split(","))
                        .map(String::trim)
                        .map(str -> {
                            try {
                                return ReservationStatus.valueOf(str.toUpperCase());
                            } catch (IllegalArgumentException e) {
                                return null;
                            }
                        })
                        .filter(Objects::nonNull)
                        .map(ReservationSpecification::statusIs)
                        .reduce(Specification::or)
                        .orElse(null);
                if (statusSpec != null) {
                    spec = spec.and(statusSpec);
                }
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid reservation status: " + condition.getStatus(), e);
            }
        }
        return spec;
    }

    private static Specification<Reservation> serviceSpecification(
            QueryReservationCondition condition,
            Specification<Reservation> spec) {
        if (condition.getService() != null) {
            spec = spec.and(ReservationSpecification.serviceIs(condition.getService()));
        }
        return spec;
    }

    private static Specification<Reservation> timeSpecification(
            QueryReservationCondition condition,
            Specification<Reservation> spec) {
        if (condition.getStartDate() != null && condition.getEndDate() != null) {
            spec = spec.and(ReservationSpecification.dateBetween(condition.getStartDate(), condition.getEndDate()));
        } else if (condition.getStartDate() != null) {
            spec = spec.and(ReservationSpecification.dateAfter(condition.getStartDate()));
        } else if (condition.getEndDate() != null) {
            spec = spec.and(ReservationSpecification.dateBefore(condition.getEndDate()));
        }
        return spec;
    }

    private static Specification<Reservation> businessSpecification(
            QueryReservationCondition condition,
            Specification<Reservation> spec) {
        if (condition.getBusinessId() != null) {
            spec = spec.and(ReservationSpecification.businessIs(condition.getBusinessId()));
        }
        return spec;
    }

    private BusinessDTO toBusinessDTO(BusinessData data) {
        return BusinessDTO.builder()
                .id(data.getId())
                .name(data.getName())
                .category(data.getCategory())
                .phone(data.getPhone())
                .address(data.getAddress())
                .build();
    }
}
