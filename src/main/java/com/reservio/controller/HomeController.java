package com.reservio.controller;

import com.reservio.entity.UserData;
import com.reservio.service.UserDataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class HomeController {

    private static final Logger log = LoggerFactory.getLogger(HomeController.class);

    private final UserDataService userDataService;

    public HomeController(UserDataService userDataService) {
        this.userDataService = userDataService;
    }

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("message", "歡迎來到 Reservio");
        return "index";
    }

    @GetMapping("/register")
    public String showRegistrationForm() {
        return "register";
    }

    @PostMapping("register")
    public String processRegistration(
            @RequestParam("username") String username,
            @RequestParam("email") String email,
            @RequestParam("password") String password,
            Model model) {

        UserData user = userDataService.registerUser(username, email, password);
        log.info("收到註冊請求: username={}, email={}", user.getUsername(), user.getEmail());

        model.addAttribute("message", "註冊成功，歡迎你，" + user.getUsername());
        return "index";
    }
}
