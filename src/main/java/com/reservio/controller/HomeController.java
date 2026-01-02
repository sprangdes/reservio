package com.reservio.controller;

import com.reservio.entity.UserData;
import com.reservio.exception.UserAlreadyExistsException;
import com.reservio.service.UserDataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class HomeController {

    private static final Logger log = LoggerFactory.getLogger(HomeController.class);

    private static final String INDEX = "index";
    private static final String REGISTER = "register";
    private static final String LOGIN = "login";

    private final UserDataService userDataService;

    public HomeController(UserDataService userDataService) {
        this.userDataService = userDataService;
    }

    @GetMapping("/")
    public String index(Model model) {
        model.addAttribute("message", "歡迎來到 Reservio");
        return INDEX;
    }

    @GetMapping("/register")
    public String showRegistrationForm() {
        return REGISTER;
    }

    @PostMapping("/register")
    public String processRegistration(
            @RequestParam("username") String username,
            @RequestParam("email") String email,
            @RequestParam("password") String password,
            RedirectAttributes redirectAttributes,
            Model model) {
        try {
            UserData user = userDataService.registerUser(username, email, password);
            log.info("註冊: user=> {}, email=> {}", user.getUsername(), user.getEmail());
            redirectAttributes.addFlashAttribute("successMessage", "註冊成功，歡迎您，" + user.getUsername() + "。請登入您的帳號。");
            return "redirect:/login";
        } catch (UserAlreadyExistsException e) {
            log.error("註冊失敗: {}", e.getMessage());
            model.addAttribute("errorMessage", e.getMessage());
            model.addAttribute("username", username);
            model.addAttribute("email", email);
            return REGISTER;
        } catch (Exception e) {
            log.error("註冊發生預料之外的錯誤", e);
            model.addAttribute("errorMessage", "系統繁忙，請稍後再試");
            return REGISTER;
        }
    }

    @GetMapping("/login")
    public String showLoginForm() {
        return LOGIN;
    }

    @PostMapping("/login")
    public String processLogin(
            @RequestParam("username") String username,
            @RequestParam("password") String password,
            Model model) {
        return INDEX;
    }
}
