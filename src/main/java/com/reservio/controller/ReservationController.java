package com.reservio.controller;

import com.reservio.entity.Reservation;
import com.reservio.entity.ServiceItem;
import com.reservio.enums.ReservationStatus;
import com.reservio.service.BusinessDataService;
import com.reservio.service.ReservationService;
import com.reservio.service.ReservationTimeService;
import com.reservio.service.ServiceItemService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import com.reservio.dto.TimeSlotDTO;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

import static com.reservio.constant.SystemConstants.*;
import static com.reservio.constant.URLConstants.*;
import static com.reservio.enums.ReservationStatus.CANCELLED;
import static com.reservio.enums.ReservationStatus.CONFIRMED;

@Controller
public class ReservationController {

    private static final Logger log = LoggerFactory.getLogger(ReservationController.class);

    private final ServiceItemService serviceItemService;
    private final ReservationTimeService reservationTimeService;
    private final ReservationService reservationService;
    private final BusinessDataService businessDataService;

    public ReservationController(
            ServiceItemService serviceItemService,
            ReservationTimeService reservationTimeService,
            ReservationService reservationService,
            BusinessDataService businessDataService) {
        this.serviceItemService = serviceItemService;
        this.reservationTimeService = reservationTimeService;
        this.reservationService = reservationService;
        this.businessDataService = businessDataService;
    }

    @GetMapping("/reservation/new")
    public String showReservationForm(Model model) {
        model.addAttribute("businesses", businessDataService.getAllBusinesses());

        List<String> disabledDates = reservationTimeService.getDisabledDates();
        model.addAttribute(DISABLED_DATES, disabledDates);
        return RESERVATION_FORM;
    }

    @GetMapping("/reservation/business/{businessId}/services")
    @ResponseBody
    public List<ServiceItem> getBusinessServices(@PathVariable Long businessId) {
        return serviceItemService.getServicesByBusinessId(businessId);
    }

    @GetMapping("/reservation/slots")
    @ResponseBody
    public List<TimeSlotDTO> getTimeSlotsForDate(
            @RequestParam(DATE) String dateStr,
            @RequestParam(DURATION) int duration) {
        try {
            LocalDate date = LocalDate.parse(dateStr);
            log.debug("查詢可用時段: date={}, duration={}min", dateStr, duration);
            return reservationTimeService.getTimeSlotsForDate(date, duration);
        } catch (Exception e) {
            log.error("查詢可用時段失敗, 日期格式錯誤: date={}, error={}", dateStr, e.getMessage());
            return Collections.emptyList();
        }
    }

    @GetMapping("/reservation/today")
    @ResponseBody
    public List<Reservation> getTodayReservations() {
        log.debug("店家請求取得今日預約清單");
        return reservationService.getTodayReservations();
    }

    @GetMapping("reservation/today/manage")
    public String showTodayManagementPage(Model model) {
        log.info("店長進入今日預約管理頁面");
        model.addAttribute("reservations", reservationService.getTodayReservations());
        return RESERVATION_MANAGEMENT;
    }

    @PostMapping("/reservation/update-status")
    public String updateStatus(
            @RequestParam(ID) Long id,
            @RequestParam(ACTION) String action,
            RedirectAttributes redirectAttributes) {
        try {
            ReservationStatus status = CONFIRM.equals(action) ? CONFIRMED : CANCELLED;
            reservationService.updateReservationStatus(id, status);

            String msg = status == CONFIRMED ? RESERVATION_CONFIRMED : RESERVATION_CANCELLED;
            redirectAttributes.addFlashAttribute(SUCCESS_MESSAGE, msg);
            log.info("預約狀態變更成功: id={}, action={}, newStatus={}", id, action, status);
        } catch (Exception e) {
            log.error("更新預約狀態失敗: id={}, error={}", id, e.getMessage());
            redirectAttributes.addFlashAttribute(ERROR_MESSAGE, RESERVATION_STATUS_UPDATE_ERROR_MSG + e.getMessage());
        }
        return REDIRECT_RESERVATION_MANAGEMENT;
    }

    @PostMapping("/reservation/new")
    public String sendReservation(
            @ModelAttribute Reservation reservation,
            RedirectAttributes redirectAttributes) {
        try {
            reservationService.saveReservation(reservation);
            log.info("預約送出成功: user={}, item={}, date={}, time={}",
                    reservation.getUser().getUsername(), reservation.getTitle(),
                    reservation.getReservationDate(), reservation.getStartTime());
            redirectAttributes.addFlashAttribute(SUCCESS_MESSAGE, RESERVATION_SUCCESS_MSG);
        } catch (Exception e) {
            log.error("預約送出失敗: reservationData={}, error={}", reservation, e.getMessage(), e);
            redirectAttributes.addFlashAttribute(ERROR_MESSAGE, RESERVATION_ERROR_MSG + e.getMessage());
        }
        return REDIRECT_HOME;
    }
}
