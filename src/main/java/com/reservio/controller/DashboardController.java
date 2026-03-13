package com.reservio.controller;

import com.reservio.dto.ApiResponse;
import com.reservio.dto.DashboardDTO;
import com.reservio.entity.UserData;
import com.reservio.service.ReservationService;
import com.reservio.service.UserDataService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.reservio.enums.ApiResponseMessageEnum.*;
import static com.reservio.util.UserUtil.toUserDTO;

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
                .message(OK.getMessage())
                .data(dashboard)
                .build());
    }
}
