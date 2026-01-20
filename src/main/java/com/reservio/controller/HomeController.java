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

@Controller
public class HomeController {

    private static final Logger log = LoggerFactory.getLogger(HomeController.class);

    private static final String HOME = "home";
    private static final String REGISTER = "register";
    private static final String REGISTER_BUSINESS = "register-business";
    private static final String LOGIN = "login";
    private static final String REDIRECT_LOGIN = "redirect:/login";
    private static final String REDIRECT_REGISTER = "redirect:/register";
    private static final String REDIRECT_REGISTER_BUSINESS = "redirect:/register/business";

    private static final String USER = "user";
    private static final String SUCCESS_MESSAGE = "successMessage";
    private static final String ERROR_MESSAGE = "errorMessage";
    private static final String USERNAME = "username";
    private static final String EMAIL = "email";
    private static final String PASSWORD = "password";
    private static final String TODAY_COUNT = "todayCount";
    private static final String PENDING_COUNT = "pendingCount";
    private static final String ANONYMOUS_USER = "anonymousUser";
    private static final String IS_BUSINESS = "isBusiness";
    private static final String BUSINESS_NAME = "businessName";
    private static final String CATEGORY = "category";
    private static final String PHONE = "phone";
    private static final String ADDRESS = "address";

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
            redirectAttributes.addFlashAttribute(USERNAME, username);
            redirectAttributes.addFlashAttribute(EMAIL, email);
            redirectAttributes.addFlashAttribute(PASSWORD, password);
            return REDIRECT_REGISTER_BUSINESS;
        }

        try {
            UserData user = userDataService.registerUser(username, email, password);
            log.info("註冊: user=> {}, email=> {}", user.getUsername(), user.getEmail());
            redirectAttributes.addFlashAttribute(SUCCESS_MESSAGE, "註冊成功，歡迎您，" + user.getUsername() + "。請登入您的帳號。");
            return REDIRECT_LOGIN;
        } catch (UserAlreadyExistsException e) {
            log.error("註冊失敗: {}", e.getMessage());
            model.addAttribute(ERROR_MESSAGE, e.getMessage());
            model.addAttribute(USERNAME, username);
            model.addAttribute(EMAIL, email);
            return REGISTER;
        } catch (Exception e) {
            log.error("註冊發生預料之外的錯誤", e);
            model.addAttribute(ERROR_MESSAGE, "系統繁忙，請稍後再試");
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
            log.info("註冊商家: user=> {}, businessName=> {}", user.getUsername(), user.getBusinessData().getName());
            redirectAttributes.addFlashAttribute(SUCCESS_MESSAGE, "商家帳號註冊成功！歡迎您，" + user.getBusinessData().getName() + "。請使用管理員帳號登入。");
            return REDIRECT_LOGIN;
        } catch (UserAlreadyExistsException e) {
            log.error("商家註冊失敗: {}", e.getMessage());
            redirectAttributes.addFlashAttribute(ERROR_MESSAGE, e.getMessage());
            redirectAttributes.addFlashAttribute(USERNAME, username);
            redirectAttributes.addFlashAttribute(EMAIL, email);
            return REDIRECT_REGISTER;
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute(ERROR_MESSAGE, "系統繁忙，請稍後再試");
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
