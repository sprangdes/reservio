package org.machi.reservio.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "新增角色DTO")
public class CreateRoleDTO {

    @Schema(description = "角色名稱")
    @NotBlank(message = "角色名稱不可為空")
    @Size(max = 50, message = "角色名稱長度不可超過50字元")
    private String name;
}
