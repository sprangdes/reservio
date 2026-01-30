package com.reservio.constant;

/**
 * Model 屬性、請求參數與系統設定常數
 */
public final class SystemConstants {
    private SystemConstants() {}

    // Model 屬性與參數名稱
    public static final String USER = "user";
    public static final String SUCCESS_MESSAGE = "successMessage";
    public static final String ERROR_MESSAGE = "errorMessage";
    public static final String USERNAME = "username";
    public static final String EMAIL = "email";
    public static final String PASSWORD = "password";
    public static final String TODAY_COUNT = "todayCount";
    public static final String PENDING_COUNT = "pendingCount";
    public static final String ANONYMOUS_USER = "anonymousUser";
    public static final String IS_BUSINESS = "isBusiness";
    public static final String BUSINESS_NAME = "businessName";
    public static final String CATEGORY = "category";
    public static final String PHONE = "phone";
    public static final String ADDRESS = "address";
    public static final String ID = "id";
    public static final String ACTION = "action";
    public static final String CONFIRM = "confirm";
    public static final String SERVICE_ITEMS = "serviceItems";
    public static final String SERVICE_NAME = "name";
    public static final String DISABLED_DATES = "disabledDates";
    public static final String DATE = "date";
    public static final String DURATION = "duration";
    public static final String BUSINESSES = "businesses";
    public static final String RESERVATIONS = "reservations";
    public static final String SERVICES = "services";
    public static final String REDIRECT_TO = "redirectTo";

    // 通知訊息
    public static final String DEFAULT_ERROR_MSG = "系統繁忙，請稍後再試";
    public static final String REGISTER_SUCCESS_MSG = "註冊成功。歡迎您，%s。請登入您的帳號。";
    public static final String BUSINESS_REGISTER_SUCCESS_MSG = "商家帳號註冊成功。歡迎您，%s。請登入您的帳號。";
    public static final String RESERVATION_SUCCESS_MSG = "預約成功";
    public static final String RESERVATION_ERROR_MSG = "預約失敗";
    public static final String RESERVATION_CONFIRMED = "預約已確認";
    public static final String RESERVATION_CANCELLED = "預約已取消";
    public static final String RESERVATION_STATUS_UPDATE_ERROR_MSG = "更新失敗";
    public static final String SERVICE_ITEM_ADD_SUCCESS_MSG = "服務項目新增成功";
    public static final String SERVICE_ITEM_ADD_ERROR_MSG = "服務項目新增失敗";
}
