package com.reservio.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.Arrays;
import java.util.List;

@Controller
public class ReservationController {

    private static final Logger log = LoggerFactory.getLogger(ReservationController.class);

    @GetMapping("/reservation/new")
    public String showReservationForm(Model model) {

        List<String> serviceItems = Arrays.asList(
                "精油 SPA 按摩(全身)",
                "精油 SPA 按摩(半身)",
                "臉部保養"
        );

        model.addAttribute("serviceItems", serviceItems);
        return "reservation-form";
    }

}
