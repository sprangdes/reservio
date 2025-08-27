package org.machi.reservio.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "更新使用者DTO")
public class UpdateAccountDTO {

    @Schema(description = "使用者ID")
    @NotNull(message = "使用者ID不可為空")
    private Long id;

    @Schema(description = "角色ID")
    private Long roleId;
}
