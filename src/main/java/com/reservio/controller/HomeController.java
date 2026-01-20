package com.reservio.controller;

import com.reservio.entity.UserData;
import com.reservio.exception.UserAlreadyExistsException;
import com.reservio.service.ReservationService;
import com.reservio.service.UserDataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import static com.reservio.constant.SystemConstants.*;
import static com.reservio.constant.UrlConstants.*;

@Controller
public class HomeController {

    private static final Logger log = LoggerFactory.getLogger(HomeController.class);

    private final UserDataService userDataService;
    private final ReservationService reservationService;

    public HomeController(
            UserDataService userDataService,
            ReservationService reservationService) {
        this.userDataService = userDataService;
        this.reservationService = reservationService;
    }

    @GetMapping("/")
    public String home(Model model) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated() && !auth.getPrincipal().equals(ANONYMOUS_USER)) {
            model.addAttribute(USER, userDataService.getCurrentUser());
            model.addAttribute(TODAY_COUNT, reservationService.countTodayReservations());
            model.addAttribute(PENDING_COUNT, reservationService.countPendingReservations());
        }
        return HOME;
    }

    @GetMapping("/register")
    public String showRegistrationForm() {
        return REGISTER;
    }

    @GetMapping("/register/business")
    public String showBusinessRegistrationForm() {
        return REGISTER_BUSINESS;
    }

    @PostMapping("/register")
    public String processRegistration(
            @RequestParam(USERNAME) String username,
            @RequestParam(EMAIL) String email,
            @RequestParam(PASSWORD) String password,
            @RequestParam(name = IS_BUSINESS, required = false, defaultValue = "false") boolean isBusiness,
            RedirectAttributes redirectAttributes,
            Model model) {

        if (isBusiness) {
            log.info("使用者 [{}] 嘗試註冊為商家，正在導向商家資料填寫頁面", username);
            redirectAttributes.addFlashAttribute(USERNAME, username);
            redirectAttributes.addFlashAttribute(EMAIL, email);
            redirectAttributes.addFlashAttribute(PASSWORD, password);
            return REDIRECT_REGISTER_BUSINESS;
        }

        try {
            UserData user = userDataService.registerUser(username, email, password);
            log.info("一般使用者註冊成功: username={}, email={}", user.getUsername(), user.getEmail());
            redirectAttributes.addFlashAttribute(SUCCESS_MESSAGE, String.format(REGISTER_SUCCESS_MSG, user.getUsername()));
            return REDIRECT_LOGIN;
        } catch (UserAlreadyExistsException e) {
            log.warn("註冊失敗 (帳號已存在): username={}, email={}, reason={}", username, email, e.getMessage());
            model.addAttribute(ERROR_MESSAGE, e.getMessage());
            model.addAttribute(USERNAME, username);
            model.addAttribute(EMAIL, email);
            return REGISTER;
        } catch (Exception e) {
            log.error("註冊發生非預期錯誤: username={}, email={}", username, email, e);
            model.addAttribute(ERROR_MESSAGE, DEFAULT_ERROR_MSG);
            return REGISTER;
        }
    }

    @PostMapping("/register/business")
    public String processBusinessRegistration(
            @RequestParam(USERNAME) String username,
            @RequestParam(EMAIL) String email,
            @RequestParam(PASSWORD) String password,
            @RequestParam(BUSINESS_NAME) String businessName,
            @RequestParam(CATEGORY) String category,
            @RequestParam(PHONE) String phone,
            @RequestParam(ADDRESS) String address,
            RedirectAttributes redirectAttributes) {
        try {
            UserData user = userDataService.registerBusinessUser(username, email, password, businessName, category, phone, address);
            log.info("商家註冊成功: username={}, businessName={}, category={}", user.getUsername(), businessName, category);
            redirectAttributes.addFlashAttribute(SUCCESS_MESSAGE, String.format(BUSINESS_REGISTER_SUCCESS_MSG, user.getBusinessData().getName()));
            return REDIRECT_LOGIN;
        } catch (UserAlreadyExistsException e) {
            log.warn("商家註冊失敗 (帳號已存在): username={}, email={}, reason={}", username, email, e.getMessage());
            redirectAttributes.addFlashAttribute(ERROR_MESSAGE, e.getMessage());
            redirectAttributes.addFlashAttribute(USERNAME, username);
            redirectAttributes.addFlashAttribute(EMAIL, email);
            return REDIRECT_REGISTER;
        } catch (Exception e) {
            log.error("商家註冊發生非預期錯誤: username={}, businessName={}", username, businessName, e);
            redirectAttributes.addFlashAttribute(ERROR_MESSAGE, DEFAULT_ERROR_MSG);
            redirectAttributes.addFlashAttribute(USERNAME, username);
            redirectAttributes.addFlashAttribute(EMAIL, email);
            return REDIRECT_REGISTER;
        }
    }

    @GetMapping("/login")
    public String showLoginForm() {
        return LOGIN;
    }
}
