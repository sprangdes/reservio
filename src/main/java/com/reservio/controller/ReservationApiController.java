package com.reservio.controller;

import com.reservio.dto.*;
import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationStatus;
import com.reservio.service.BusinessDataService;
import com.reservio.service.ReservationService;
import com.reservio.service.ReservationTimeService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import static com.reservio.enums.ApiResponseMessageEnum.*;
import static com.reservio.enums.ReservationStatus.*;

@RestController
@RequestMapping("/api")
public class ReservationApiController {

    private final ReservationService reservationService;
    private final ReservationTimeService reservationTimeService;
    private final BusinessDataService businessDataService;

    public ReservationApiController(
            ReservationService reservationService,
            ReservationTimeService reservationTimeService,
            BusinessDataService businessDataService) {
        this.reservationService = reservationService;
        this.reservationTimeService = reservationTimeService;
        this.businessDataService = businessDataService;
    }

    @PostMapping("/reservations/customer/query")
    public ResponseEntity<ApiResponse<PageResponse<ReservationDTO>>> queryReservationForCustomer(
            @RequestBody QueryReservationCondition condition,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "reservationDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Page<ReservationDTO> items = reservationService.queryReservationsForCustomerPage(
                condition,
                page,
                size,
                sortBy,
                sortDir)
                .map(this::toReservationDTO);
        return ResponseEntity.ok(ApiResponse.<PageResponse<ReservationDTO>>builder()
                .success(true)
                .message(OK.getMessage())
                .data(toPageResponse(items, sortBy, sortDir))
                .build());
    }

    @PostMapping("/reservations/business/query")
    public ResponseEntity<ApiResponse<PageResponse<ReservationDTO>>> queryReservationsForBusiness(
            @RequestBody QueryReservationCondition condition,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "reservationDate") String sortBy,
            @RequestParam(defaultValue = "desc") String sortDir) {
        Page<ReservationDTO> items = reservationService.queryReservationsForBusinessPage(
                condition,
                page,
                size,
                sortBy,
                sortDir)
                .map(this::toReservationDTO);
        return ResponseEntity.ok(ApiResponse.<PageResponse<ReservationDTO>>builder()
                .success(true)
                .message(OK.getMessage())
                .data(toPageResponse(items, sortBy, sortDir))
                .build());
    }

    @PostMapping("/reservations")
    public ResponseEntity<ApiResponse<ReservationDTO>> createReservation(@RequestBody ReservationCreateRequest request) {
        BusinessData business = businessDataService.getBusinessById(request.getBusinessId());
        Reservation reservation = Reservation.builder()
                .business(business)
                .reservationDate(request.getReservationDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .title(request.getTitle())
                .description(request.getDescription())
                .remark(request.getRemark())
                .status(PENDING)
                .build();

        Reservation saved = reservationService.saveReservation(reservation);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<ReservationDTO>builder()
                        .success(true)
                        .message(NEW_RESERVATION.getMessage())
                        .data(toReservationDTO(saved))
                        .build());
    }

    @PostMapping("/reservations/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelReservation(
            @PathVariable Long id,
            @RequestBody(required = false) ReservationCancelRequest request) {
        String reason = request == null ? null : request.getCancelReason();
        reservationService.customerCancel(id, reason);
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message(RESERVATION_CANCEL.getMessage())
                .build());
    }

    @PostMapping("/reservations/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateStatus(
            @PathVariable Long id,
            @RequestBody ReservationStatusUpdateRequest request) {
        String action = request.getAction();
        if (action == null || action.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message("缺少 action")
                            .build());
        }
        if ("approveCancel".equals(action)) {
            reservationService.handleCancelRequestForBusiness(id, true);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message(CONFIRM_CANCEL.getMessage())
                    .build());
        }
        if ("rejectCancel".equals(action)) {
            reservationService.handleCancelRequestForBusiness(id, false);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message(REJECT_CANCEL.getMessage())
                    .build());
        }

        ReservationStatus status = "confirm".equals(action) ? CONFIRMED : CANCELLED;
        reservationService.updateReservationStatus(id, status);

        String msg = status == CONFIRMED ? RESERVATION_CONFIRMED.getMessage() : RESERVATION_CANCELED.getMessage();
        return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message(msg)
                .build());
    }

    @GetMapping("/reservations/slots")
    public ResponseEntity<ApiResponse<List<TimeSlotDTO>>> getTimeSlotsForDate(
            @RequestParam("date") String dateStr,
            @RequestParam("duration") int duration) {
        try {
            LocalDate date = LocalDate.parse(dateStr);
            List<TimeSlotDTO> slots = reservationTimeService.getTimeSlotsForDate(date, duration);
            return ResponseEntity.ok(ApiResponse.<List<TimeSlotDTO>>builder()
                    .success(true)
                    .message(OK.getMessage())
                    .data(slots)
                    .build());
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.<List<TimeSlotDTO>>builder()
                            .success(false)
                            .message(DATE_FORMAT_ERROR.getMessage())
                            .data(Collections.emptyList())
                            .build());
        }
    }

    @GetMapping("/reservations/disabled-dates")
    public ResponseEntity<ApiResponse<List<String>>> getDisabledDates() {
        return ResponseEntity.ok(ApiResponse.<List<String>>builder()
                .success(true)
                .message(OK.getMessage())
                .data(reservationTimeService.getDisabledDates())
                .build());
    }

    @GetMapping("/reservations/customer/reserved-businesses")
    public ResponseEntity<ApiResponse<List<BusinessDTO>>> getReservedBusinesses() {
        List<BusinessDTO> reservedBusinesses = reservationService.getReservedBusinesses();
        return ResponseEntity.ok(ApiResponse.<List<BusinessDTO>>builder()
                .success(true)
                .message(OK.getMessage())
                .data(reservedBusinesses)
                .build());
    }

    @GetMapping("/reservations/today")
    public ResponseEntity<ApiResponse<CalendarDTO>> getTodayReservations() {
        List<ReservationDTO> reservations = reservationService.getTodayReservations()
                .stream()
                .map(this::toReservationDTO)
                .toList();
        CalendarDTO calendar = reservationService.buildCalendarDTO(reservations);
        return ResponseEntity.ok(ApiResponse.<CalendarDTO>builder()
                .success(true)
                .message(OK.getMessage())
                .data(calendar)
                .build());
    }

    @GetMapping("reservations/week")
    public ResponseEntity<ApiResponse<CalendarDTO>> getWeekReservations() {
        List<ReservationDTO> reservations = reservationService.getWeekReservations()
                .stream()
                .map(this::toReservationDTO)
                .toList();
        CalendarDTO calendar = reservationService.buildCalendarDTO(reservations);
        return ResponseEntity.ok(ApiResponse.<CalendarDTO>builder()
                .success(true)
                .message(OK.getMessage())
                .data(calendar)
                .build());
    }

    @GetMapping("reservations/month")
    public ResponseEntity<ApiResponse<CalendarDTO>> getMonthReservations() {
        List<ReservationDTO> reservations = reservationService.getMonthReservations()
                .stream()
                .map(this::toReservationDTO)
                .toList();
        CalendarDTO calendar = reservationService.buildCalendarDTO(reservations);
        return ResponseEntity.ok(ApiResponse.<CalendarDTO>builder()
                .success(true)
                .message(OK.getMessage())
                .data(calendar)
                .build());
    }

    private ReservationDTO toReservationDTO(Reservation reservation) {
        UserData user = reservation.getUser();
        BusinessData business = reservation.getBusiness();
        return ReservationDTO.builder()
                .id(reservation.getId())
                .userId(user != null ? user.getId() : null)
                .username(user != null ? user.getUsername() : null)
                .businessId(business != null ? business.getId() : null)
                .businessName(business != null ? business.getName() : null)
                .reservationDate(reservation.getReservationDate())
                .startTime(reservation.getStartTime())
                .endTime(reservation.getEndTime())
                .status(reservation.getStatus())
                .title(reservation.getTitle())
                .description(reservation.getDescription())
                .remark(reservation.getRemark())
                .cancelReason(reservation.getCancelReason())
                .createdAt(reservation.getCreatedAt())
                .updatedAt(reservation.getUpdatedAt())
                .build();
    }

    private PageResponse<ReservationDTO> toPageResponse(Page<ReservationDTO> page, String sortBy, String sortDir) {
        return PageResponse.<ReservationDTO>builder()
                .content(page.getContent())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .sortBy(sortBy)
                .sortDir(sortDir)
                .build();
    }
}
