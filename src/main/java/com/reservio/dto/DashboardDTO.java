package com.reservio.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardDTO {
    private UserDTO user;
    private long todayCount;
    private long pendingCount;
}
