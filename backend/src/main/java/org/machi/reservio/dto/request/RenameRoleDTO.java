package org.machi.reservio.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "更新角色名稱DTO")
public class RenameRoleDTO {

    @Schema(description = "角色ID")
    @NotNull(message = "角色ID不可為空")
    private Long id;

    @NotBlank(message = "角色名稱不可為空")
    @Schema(description = "角色名稱")
    @Size(max = 50, message = "角色名稱長度不可超過50字元")
    private String name;
}
