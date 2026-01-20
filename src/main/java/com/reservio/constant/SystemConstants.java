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
    
    // 註冊相關參數
    public static final String IS_BUSINESS = "isBusiness";
    public static final String BUSINESS_NAME = "businessName";
    public static final String CATEGORY = "category";
    public static final String PHONE = "phone";
    public static final String ADDRESS = "address";

    // 預約相關屬性
    public static final String SERVICE_ITEMS = "serviceItems";
    public static final String DISABLED_DATES = "disabledDates";
}
