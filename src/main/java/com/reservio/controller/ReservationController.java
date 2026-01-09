package com.reservio.controller;

import com.reservio.entity.ServiceItem;
import com.reservio.service.ReservationTimeService;
import com.reservio.service.ServiceItemService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Controller
public class ReservationController {

    private static final Logger log = LoggerFactory.getLogger(ReservationController.class);

    private static final String RESERVATION_FORM = "reservation-form";

    private static final String SERVICE_ITEMS = "serviceItems";
    private static final String DISABLED_DATES = "disabledDates";
    private static final String TIME_SLOTS = "timeSlots";

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

        // 不開放預約日期 yyyy-MM-dd
        List<String> disabledDates = reservationTimeService.getDisabledDates();

        // 產生可以預約的時間
        List<String> timeSlots = reservationTimeService.getTimeSlots();

        model.addAttribute(SERVICE_ITEMS, serviceItems);
        model.addAttribute(DISABLED_DATES, disabledDates);
        model.addAttribute(TIME_SLOTS, timeSlots);
        return RESERVATION_FORM;
    }
}
