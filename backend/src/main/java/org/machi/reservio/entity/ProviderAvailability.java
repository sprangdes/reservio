package org.machi.reservio.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "provider_availability")
public class ProviderAvailability { // 服務人員服務時段

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    private Provider provider; // 服務人員

    @Column(name = "date")
    private LocalDate date; // 日期

    @Column(name = "start_time")
    private LocalTime startTime; // 當天開始時間

    @Column(name = "end_time")
    private LocalTime endTime; // 當天結束時間
}
