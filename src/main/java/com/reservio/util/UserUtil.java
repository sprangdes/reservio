package com.reservio.util;

import com.reservio.controller.response.BusinessResponse;
import com.reservio.controller.response.UserResponse;
import com.reservio.entity.UserData;

public class UserUtil {

    private UserUtil() {}

    public static UserResponse toUserResponse(UserData user) {
        if (user == null) {
            return null;
        }
        BusinessResponse businessResponse = null;
        if (user.getBusinessData() != null) {
            businessResponse = BusinessResponse.builder()
                    .id(user.getBusinessData().getId())
                    .name(user.getBusinessData().getName())
                    .category(user.getBusinessData().getCategory())
                    .phone(user.getBusinessData().getPhone())
                    .address(user.getBusinessData().getAddress())
                    .slotInterval(user.getBusinessData().getSlotInterval())
                    .build();
        }
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .emailVerified(user.getEmailVerified())
                .role(user.getRole())
                .mustChangePassword(user.getMustChangePassword())
                .lineLoginLinked(user.getLineUserId() != null
                        && !user.getLineUserId().isBlank())
                .business(businessResponse)
                .build();
    }
}
