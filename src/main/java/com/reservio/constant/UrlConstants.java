package com.reservio.constant;

/**
 * 系統路由與頁面模板路徑常數
 */
public final class UrlConstants {
    private UrlConstants() {}

    // 頁面模板名稱 (View Names)
    public static final String HOME = "home";
    public static final String REGISTER = "register";
    public static final String REGISTER_BUSINESS = "register-business";
    public static final String LOGIN = "login";
    public static final String RESERVATION_FORM = "reservation-form";
    public static final String RESERVATION_MANAGEMENT = "reservation-management";

    // 重導向路徑 (Redirects)
    public static final String REDIRECT_HOME = "redirect:/";
    public static final String REDIRECT_LOGIN = "redirect:/login";
    public static final String REDIRECT_REGISTER = "redirect:/register";
    public static final String REDIRECT_REGISTER_BUSINESS = "redirect:/register/business";
}
