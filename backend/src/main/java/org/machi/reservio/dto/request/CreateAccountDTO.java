package org.machi.reservio.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
@Schema(description = "新增使用者DTO")
public class CreateAccountDTO {

    @Schema(description = "使用者Line ID")
    @NotBlank(message = "使用者Line ID 不能為空")
    private String lineUserId;

    @Schema(description = "使用者角色ID")
    @NotNull(message = "角色ID 不能為空")
    private Long roleId;
}
