package com.reservio.controller;

import com.reservio.dto.ApiResponse;
import com.reservio.dto.BusinessDTO;
import com.reservio.dto.DashboardDTO;
import com.reservio.dto.UserDTO;
import com.reservio.entity.UserData;
import com.reservio.service.ReservationService;
import com.reservio.service.UserDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DashboardController {

    private final UserDataService userDataService;
    private final ReservationService reservationService;

    public DashboardController(UserDataService userDataService, ReservationService reservationService) {
        this.userDataService = userDataService;
        this.reservationService = reservationService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<DashboardDTO>> dashboard() {
        UserData user = userDataService.getCurrentUser();
        DashboardDTO dashboard = DashboardDTO.builder()
                .user(toUserDTO(user))
                .todayCount(reservationService.countTodayReservations())
                .pendingCount(reservationService.countPendingReservations())
                .build();

        return ResponseEntity.ok(ApiResponse.<DashboardDTO>builder()
                .success(true)
                .message("OK")
                .data(dashboard)
                .build());
    }

    private UserDTO toUserDTO(UserData user) {
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
