package com.reservio.util;

import com.reservio.dto.BusinessDTO;
import com.reservio.dto.UserDTO;
import com.reservio.entity.UserData;

public class UserUtil {

    private UserUtil() {}

    public static UserDTO toUserDTO(UserData user) {
        if (user == null) {
            return null;
        }
        BusinessDTO businessDTO = null;
        if (user.getBusinessData() != null) {
            businessDTO = BusinessDTO.builder()
                    .id(user.getBusinessData().getId())
                    .name(user.getBusinessData().getName())
                    .category(user.getBusinessData().getCategory())
                    .phone(user.getBusinessData().getPhone())
                    .address(user.getBusinessData().getAddress())
                    .build();
        }
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .business(businessDTO)
                .build();
    }
}
