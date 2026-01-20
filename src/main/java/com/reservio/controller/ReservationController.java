package com.reservio.controller;

import com.reservio.entity.Reservation;
import com.reservio.entity.ServiceItem;
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
import static com.reservio.constant.UrlConstants.*;

@Controller
public class ReservationController {

    private static final Logger log = LoggerFactory.getLogger(ReservationController.class);

    private final ServiceItemService serviceItemService;
    private final ReservationTimeService reservationTimeService;
    private final ReservationService reservationService;

    public ReservationController(
            ServiceItemService serviceItemService,
            ReservationTimeService reservationTimeService,
            ReservationService reservationService) {
        this.serviceItemService = serviceItemService;
        this.reservationTimeService = reservationTimeService;
        this.reservationService = reservationService;
    }

    @GetMapping("/reservation/new")
    public String showReservationForm(Model model) {
        // 從資料庫取得所有服務項目
        List<ServiceItem> serviceItems = serviceItemService.getServiceItems();

        // 不開放預約日期 yyyy-MM-dd
        List<String> disabledDates = reservationTimeService.getDisabledDates();

        model.addAttribute(SERVICE_ITEMS, serviceItems);
        model.addAttribute(DISABLED_DATES, disabledDates);
        return RESERVATION_FORM;
    }

    @GetMapping("/reservation/slots")
    @ResponseBody
    public List<TimeSlotDTO> getTimeSlotsForDate(
            @RequestParam("date") String dateStr,
            @RequestParam("duration") int duration) {
        try {
            LocalDate date = LocalDate.parse(dateStr);
            return reservationTimeService.getTimeSlotsForDate(date, duration);
        } catch (Exception e) {
            log.error("解析日期失敗: {}", dateStr);
            return Collections.emptyList();
        }
    }

    @PostMapping("/reservation/new")
    public String sendReservation(@ModelAttribute Reservation reservation, RedirectAttributes redirectAttributes) {
        try {
            reservationService.saveReservation(reservation);
            redirectAttributes.addFlashAttribute("successMessage", "預約成功");
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "預約失敗" + e.getMessage());
        }
        return REDIRECT_HOME;
    }
}
