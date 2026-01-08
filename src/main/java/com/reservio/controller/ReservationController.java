package com.reservio.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

@Controller
public class ReservationController {

    private static final Logger log = LoggerFactory.getLogger(ReservationController.class);

    @GetMapping("/reservation/new")
    public String showReservationForm(Model model) {

        // 預約項目
        List<String> serviceItems = Arrays.asList("精油 SPA 按摩(全身)", "精油 SPA 按摩(半身)", "臉部保養");

        // 不開放預約日期 yyyy-MM-dd
        List<String> disabledDates = Arrays.asList("2026-01-20", "2026-01-27", "2026-01-28");
        // 計算日期範圍 (今天 ~ 三個月後)
        LocalDate minDate = LocalDate.now();
        LocalDate maxDate = minDate.plusMonths(3);

        model.addAttribute("serviceItems", serviceItems);
        model.addAttribute("disabledDates", disabledDates);
        model.addAttribute("minDate", minDate);
        model.addAttribute("maxDate", maxDate);
        return "reservation-form";
    }

}
