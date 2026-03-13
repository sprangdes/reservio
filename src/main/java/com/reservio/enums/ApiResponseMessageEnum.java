package com.reservio.enums;

import lombok.Getter;

@Getter
public enum ApiResponseMessageEnum {

    OK("OK"),

    // 服務項目
    NOT_BUSINESS_ACCOUNT_CANT_ADD_SERVICE("非商家帳號無法新增服務"),
    ADD_SERVICE("服務項目新增成功"),
    SERVICE_ON("服務項目啟用成功"),
    SERVICE_OFF("服務項目停用成功"),
    SERVICE_UPDATE("服務項目更新成功"),
    SERVICE_DELETE("服務項目刪除成功"),
    CANT_UPDATE_SERVICE("服務項目目前無法編輯"),
    CANT_DELETE_SERVICE("服務項目目前無法刪除"),
    SERVICE_NOT_EXIST("服務項目不存在");

    private final String message;

    ApiResponseMessageEnum(String message) {
        this.message = message;
    }

}
