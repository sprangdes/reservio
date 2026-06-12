package com.reservio.controller.request;

import lombok.Data;

@Data
public class NotificationPreferenceRequest {
    private boolean emailNewReservation;
    private boolean emailStatusChanged;
    private boolean emailUpcomingReminder;
}
