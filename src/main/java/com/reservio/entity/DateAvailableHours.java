package com.reservio.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Table(name = "date_available_hours")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DateAvailableHours {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 調整的日期
    @Column(nullable = false, unique = true) // 確保 per date 唯一
    private LocalDate date;

    // 調整後的起始時間 (如果非關閉)
    private LocalTime startTime;

    // 調整後的結束時間 (如果非關閉)
    private LocalTime endTime;

    // 是否完全關閉該日 (true 則忽略 start/end)
    @Column(nullable = false)
    private boolean isClosed = false;

    // 時間槽間隔 (可繼承預設或自訂)
    private int slotInterval = 30;

    // 關聯到預設時段
    @ManyToOne
    @JoinColumn(name = "default_hours_id", nullable = false)
    private DefaultAvailableHours defaultHours;
}
