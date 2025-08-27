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
@Table(name = "appointment")
public class Appointment { // 預約

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account; // 使用者

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_id", nullable = false)
    private Provider provider; // 服務人員

    @ManyToOne
    @JoinColumn(name = "service_id", nullable = false)
    private Service service; // 服務項目

    @Column(name = "date", nullable = false)
    private LocalDate date; // 預約日期

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime; // 預約開始時間

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime; // 預約結束時間

    @Column(name = "accept")
    private Boolean accept = false; // 是否接受預約
}
