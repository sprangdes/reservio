package com.reservio.constant;

/**
 * 系統路由與頁面模板路徑常數
 */
public final class URLConstants {
    private URLConstants() {}

    // 頁面模板名稱 (View Names)
    public static final String HOME = "home/index";
    public static final String LOGIN = "auth/login";
    public static final String REGISTER = "auth/register";
    public static final String REGISTER_BUSINESS = "auth/register-business";
    public static final String RESERVATION_FORM = "reservation/new";
    public static final String RESERVATION_MANAGEMENT = "reservation/manage-today";
    public static final String RESERVATION_ALL_MANAGEMENT = "reservation/manage-all";
    public static final String RESERVATION_PENDING_MANAGEMENT = "reservation/manage-pending";
    public static final String SERVICE_MANAGEMENT = "business/service-management";
    public static final String MY_RESERVATIONS = "reservation/my";

    // 重導向路徑 (Redirects) - URL，不依賴模板資料夾，維持不變
    public static final String REDIRECT_HOME = "redirect:/";
    public static final String REDIRECT_LOGIN = "redirect:/login";
    public static final String REDIRECT_REGISTER = "redirect:/register";
    public static final String REDIRECT_REGISTER_BUSINESS = "redirect:/register/business";
    public static final String REDIRECT_RESERVATION_MANAGEMENT = "redirect:/reservation/today/manage";
    public static final String REDIRECT_SERVICE_MANAGEMENT = "redirect:/service/manage";
    public static final String REDIRECT_RESERVATION_ALL_MANAGEMENT = "redirect:/reservation/manage";
    public static final String REDIRECT_RESERVATION_PENDING_MANAGEMENT = "redirect:/reservation/pending/manage";
    public static final String REDIRECT_MY_RESERVATIONS = "redirect:/my/reservations";
}
