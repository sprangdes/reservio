package com.reservio.controller.request;

import com.reservio.dto.DefaultWeekSlot;
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
