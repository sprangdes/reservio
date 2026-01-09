package com.reservio.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalTime;

@Entity
@Table(name = "default_available_hours")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DefaultAvailableHours {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long shopId;

    // 起始時間
    @Column(nullable = false)
    private LocalTime startTime;

    // 結束時間
    @Column(nullable = false)
    private LocalTime endTime;

    // 時間槽間隔 (分鐘, 預設 30)
    @Column(nullable = false)
    private int slotInterval = 30;
}
