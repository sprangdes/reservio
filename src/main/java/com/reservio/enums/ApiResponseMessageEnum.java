package com.reservio.enums;

import lombok.Getter;

@Getter
public enum ApiResponseMessageEnum {

    OK("OK"),
    ERROR("系統忙碌中，請稍後再嘗試"),

    // 註冊/登入
    REGISTER("註冊成功"),
    BUSINESS_REGISTER("商家註冊成功"),
    LOGIN("登入成功"),

    // 服務項目
    NOT_BUSINESS_ACCOUNT_CANT_ADD_SERVICE("非商家帳號無法新增服務"),
    ADD_SERVICE("服務項目新增成功"),
    SERVICE_ON("服務項目啟用成功"),
    SERVICE_OFF("服務項目停用成功"),
    SERVICE_UPDATE("服務項目更新成功"),
    SERVICE_DELETE("服務項目刪除成功"),
    CANT_UPDATE_SERVICE("服務項目目前無法編輯"),
    CANT_DELETE_SERVICE("服務項目目前無法刪除"),
    SERVICE_NOT_EXIST("服務項目不存在"),

    // 預約
    DATE_FORMAT_ERROR("日期格式錯誤"),
    NEW_RESERVATION("預約成功"),
    RESERVATION_CANCEL("預約取消成功"),
    CONFIRM_CANCEL("確認取消預約"),
    REJECT_CANCEL("駁回取消預約"),
    RESERVATION_CANCELED("預約已取消"),
    RESERVATION_CONFIRMED("預約已確認"),

    // 商家資訊
    UPDATE_BUSINESS_INFO("商家資訊更新成功"),
    UPDATE_BUSINESS_INFO_ERROR("商家資訊更新失敗"),
    NOT_BUSINESS_ACCOUNT_CANT_ADJUST_INFO("非商家帳號無法更新商家資料"),
    DELETE_ADJUSTED_DATE_SLOT("已刪除該日營業時間調整");

    private final String message;

    ApiResponseMessageEnum(String message) {
        this.message = message;
    }

}
