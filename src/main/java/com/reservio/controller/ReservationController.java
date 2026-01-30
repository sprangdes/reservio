package com.reservio.controller;

import com.reservio.entity.Reservation;
import com.reservio.entity.ServiceItem;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationStatus;
import com.reservio.service.*;
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
    private final UserDataService userDataService;

    public ReservationController(
            ServiceItemService serviceItemService,
            ReservationTimeService reservationTimeService,
            ReservationService reservationService,
            BusinessDataService businessDataService, UserDataService userDataService) {
        this.serviceItemService = serviceItemService;
        this.reservationTimeService = reservationTimeService;
        this.reservationService = reservationService;
        this.businessDataService = businessDataService;
        this.userDataService = userDataService;
    }

    @GetMapping("/reservation/new")
    public String showReservationForm(Model model) {
        model.addAttribute(BUSINESSES, businessDataService.getAllBusinesses());

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
        model.addAttribute(RESERVATIONS, reservationService.getTodayReservations());
        return RESERVATION_MANAGEMENT;
    }

    @GetMapping("/service/manage")
    public String showServiceManagementPage(Model model) {
        UserData currentUser = userDataService.getCurrentUser();
        if (currentUser.getBusinessData() == null) {
            return REDIRECT_HOME;
        }
        log.info("店長進入服務項目管理頁面: {}", currentUser.getBusinessData().getName());
        model.addAttribute(SERVICES, serviceItemService.getServicesByBusinessId(currentUser.getBusinessData().getId()));
        return SERVICE_MANAGEMENT;
    }

    @PostMapping("/service/add")
    public String addServiceItem(
            @RequestParam(SERVICE_NAME) String name,
            @RequestParam(DURATION) Integer duration,
            RedirectAttributes redirectAttributes) {
        try {
            UserData currentUser = userDataService.getCurrentUser();
            serviceItemService.saveServiceItem(currentUser.getBusinessData(), name, duration);
            redirectAttributes.addFlashAttribute(SUCCESS_MESSAGE, SERVICE_ITEM_ADD_SUCCESS_MSG);
        } catch (Exception e) {
            log.error("新增服務項目失敗: {}", e.getMessage());
            redirectAttributes.addFlashAttribute(ERROR_MESSAGE, SERVICE_ITEM_ADD_ERROR_MSG);
        }
        return REDIRECT_SERVICE_MANAGEMENT;
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
            redirectAttributes.addFlashAttribute(ERROR_MESSAGE, RESERVATION_STATUS_UPDATE_ERROR_MSG);
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
            redirectAttributes.addFlashAttribute(ERROR_MESSAGE, RESERVATION_ERROR_MSG);
        }
        return REDIRECT_HOME;
    }
}
