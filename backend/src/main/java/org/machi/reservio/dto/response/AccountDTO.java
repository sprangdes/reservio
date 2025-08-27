package org.machi.reservio.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
@Schema(description = "使用者DTO")
public class AccountDTO {

    @Schema(description = "使用者ID")
    private Long id;

    @Schema(description = "使用者Line ID")
    private String lineUserId;

    @Schema(description = "使用者角色ID")
    private Long roleId;
}
