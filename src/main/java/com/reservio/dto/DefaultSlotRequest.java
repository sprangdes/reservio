package com.reservio.dto;

import jakarta.annotation.Nullable;
import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DefaultSlotRequest {
    @Nullable
    private Integer defaultInterval;

    @Nullable
    private List<DefaultWeekSlot> defaultWeekSlots;
}
