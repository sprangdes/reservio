package com.reservio.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(
        name = "date_available_hours",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"business_id", "date"})
        }
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DateAvailableHours {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "business_id", nullable = false)
    private Long businessId;

    // 調整的日期
    @Column(nullable = false)
    private LocalDate date;

    // 調整後的起始時間 (如果非關閉)
    private LocalTime startTime;

    // 調整後的結束時間 (如果非關閉)
    private LocalTime endTime;

    // 是否完全關閉該日 (true 則忽略 start/end)
    @Column(nullable = false)
    private boolean isClosed = false;
}
