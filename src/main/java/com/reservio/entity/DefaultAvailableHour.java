package com.reservio.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.DayOfWeek;
import java.time.LocalTime;

@Entity
@Table(
        name = "default_available_hours",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"business_id", "day_of_week"})
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DefaultAvailableHour {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false, length = 10)
    private DayOfWeek dayOfWeek;

    @Column(nullable = false)
    private boolean isOpen = true;

    // 起始時間
    private LocalTime startTime;

    // 結束時間
    private LocalTime endTime;
}
