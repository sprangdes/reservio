package com.reservio.controller;

import com.reservio.controller.request.NotificationPreferenceRequest;
import com.reservio.controller.response.*;
import com.reservio.entity.UserData;
import com.reservio.service.NotificationService;
import com.reservio.service.UserDataService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {
    private final NotificationService notificationService;
    private final UserDataService userDataService;

    public NotificationController(NotificationService notificationService, UserDataService userDataService) {
        this.notificationService = notificationService;
        this.userDataService = userDataService;
    }

    @GetMapping
    public ApiResponse<PageResponse<NotificationResponse>> list(
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        Page<NotificationResponse> result = notificationService.list(currentUser(), page, size);
        return ApiResponse.<PageResponse<NotificationResponse>>builder().success(true).message("OK")
                .data(PageResponse.<NotificationResponse>builder()
                        .content(result.getContent()).page(result.getNumber()).size(result.getSize())
                        .totalElements(result.getTotalElements()).totalPages(result.getTotalPages())
                        .sortBy("createdAt").sortDir("desc").build()).build();
    }

    @GetMapping("/unread-count")
    public ApiResponse<Map<String, Long>> unreadCount() {
        return ApiResponse.<Map<String, Long>>builder().success(true).message("OK")
                .data(Map.of("count", notificationService.unreadCount(currentUser()))).build();
    }

    @PostMapping("/{id}/read")
    public ResponseEntity<Void> markRead(@PathVariable Long id) {
        notificationService.markRead(currentUser(), id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllRead() {
        notificationService.markAllRead(currentUser());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/preferences")
    public ApiResponse<NotificationPreferenceResponse> preferences() {
        return ApiResponse.<NotificationPreferenceResponse>builder().success(true).message("OK")
                .data(notificationService.preferenceResponse(currentUser())).build();
    }

    @PutMapping("/preferences")
    public ApiResponse<NotificationPreferenceResponse> updatePreferences(
            @RequestBody NotificationPreferenceRequest request) {
        return ApiResponse.<NotificationPreferenceResponse>builder().success(true).message("OK")
                .data(notificationService.updatePreference(currentUser(), request)).build();
    }

    private UserData currentUser() {
        return userDataService.getCurrentUser();
    }
}
