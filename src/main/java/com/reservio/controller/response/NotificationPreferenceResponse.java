package com.reservio.controller.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationPreferenceResponse {
    private boolean emailVerified;
    private String email;
    private boolean emailNewReservation;
    private boolean emailStatusChanged;
    private boolean emailUpcomingReminder;
}
