package com.reservio.dto;

import com.reservio.enums.ReservationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReservationDTO {
    private Long id;
    private Long userId;
    private String username;
    private Long businessId;
    private String businessName;
    private LocalDate reservationDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private ReservationStatus status;
    private String title;
    private String description;
    private String remark;
    private String cancelReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
