package com.reservio.controller;

import com.reservio.entity.ServiceItem;
import com.reservio.repo.ServiceItemRepo;
import com.reservio.service.ReservationTimeService;
import com.reservio.service.ServiceItemService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import static com.reservio.service.ReservationTimeService.*;

@Controller
public class ReservationController {

    private static final Logger log = LoggerFactory.getLogger(ReservationController.class);

    private final ServiceItemService serviceItemService;
    private final ReservationTimeService reservationTimeService;

    public ReservationController(
            ServiceItemService serviceItemService,
            ReservationTimeService reservationTimeService) {
        this.serviceItemService = serviceItemService;
        this.reservationTimeService = reservationTimeService;
    }

    @GetMapping("/reservation/new")
    public String showReservationForm(Model model) {
        // 從資料庫取得所有服務項目
        List<ServiceItem> serviceItems = serviceItemService.getServiceItems();

        // 計算日期範圍 (今天 ~ 三個月後)
        LocalDate minDate = LocalDate.now();
        LocalDate maxDate = minDate.plusMonths(3);

        // 不開放預約日期 yyyy-MM-dd
        List<String> disabledDates = reservationTimeService.getDisabledDates();

        // 產生可以預約的時間
        List<String> timeSlots = reservationTimeService.getTimeSlots();

        model.addAttribute("serviceItems", serviceItems);
        model.addAttribute("disabledDates", disabledDates);
        model.addAttribute("minDate", minDate);
        model.addAttribute("maxDate", maxDate);
        model.addAttribute("timeSlots", timeSlots);
        return "reservation-form";
    }
}
