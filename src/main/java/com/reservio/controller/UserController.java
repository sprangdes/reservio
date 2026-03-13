package com.reservio.controller;

import com.reservio.dto.ApiResponse;
import com.reservio.dto.BusinessDTO;
import com.reservio.dto.UserDTO;
import com.reservio.entity.UserData;
import com.reservio.service.UserDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class UserController {

    private final UserDataService userDataService;

    public UserController(UserDataService userDataService) {
        this.userDataService = userDataService;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDTO>> me() {
        UserData user = userDataService.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.<UserDTO>builder()
                .success(true)
                .message("OK")
                .data(toUserDTO(user))
                .build());
    }

    private UserDTO toUserDTO(UserData user) {
        return getUserDTO(user);
    }
}
