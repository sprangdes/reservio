package com.reservio.controller;

import com.reservio.entity.ServiceItem;
import com.reservio.repo.ServiceItemRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Controller
public class ReservationController {

    private static final Logger log = LoggerFactory.getLogger(ReservationController.class);

    private final ServiceItemRepo serviceItemRepo;

    public ReservationController(ServiceItemRepo serviceItemRepo) {
        this.serviceItemRepo = serviceItemRepo;
    }

    @GetMapping("/reservation/new")
    public String showReservationForm(Model model) {
        // 從資料庫取得所有服務項目
        List<ServiceItem> serviceItems = serviceItemRepo.findAll();

        // 不開放預約日期 yyyy-MM-dd
        List<String> disabledDates = Arrays.asList("2026-01-20", "2026-01-27", "2026-01-28");
        // 計算日期範圍 (今天 ~ 三個月後)
        LocalDate minDate = LocalDate.now();
        LocalDate maxDate = minDate.plusMonths(3);

        // 產生全天的整點與半點清單 (00:00 - 23:30)
        List<String> allTimeSlots = new ArrayList<>();
        LocalTime time = LocalTime.MIDNIGHT;
        for (int i = 0; i < 48; i++) {
            allTimeSlots.add(time.toString());
            time = time.plusMinutes(30);
        }

        model.addAttribute("serviceItems", serviceItems);
        model.addAttribute("disabledDates", disabledDates);
        model.addAttribute("minDate", minDate);
        model.addAttribute("maxDate", maxDate);
        model.addAttribute("allTimeSlots", allTimeSlots);
        return "reservation-form";
    }

}
