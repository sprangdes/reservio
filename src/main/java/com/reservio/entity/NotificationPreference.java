package com.reservio.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "notification_preference")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationPreference {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserData user;

    @Column(name = "email_new_reservation", nullable = false)
    @Builder.Default
    private boolean emailNewReservation = true;

    @Column(name = "email_status_changed", nullable = false)
    @Builder.Default
    private boolean emailStatusChanged = true;

    @Column(name = "email_upcoming_reminder", nullable = false)
    @Builder.Default
    private boolean emailUpcomingReminder = true;

    public static NotificationPreference defaultsFor(UserData user) {
        return NotificationPreference.builder().user(user).build();
    }
}
