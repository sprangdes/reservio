package org.machi.reservio.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@Schema(description = "新增服務項目DTO")
public class CreateServiceDTO {

    @Schema(description = "服務項目名稱")
    @NotBlank(message = "服務項目名稱不可為空")
    private String name;

    @Schema(description = "服務項目描述")
    private String description;

    @Schema(description = "服務項目價格")
    @NotNull(message = "服務項目價格不可為空")
    private BigDecimal price;

    @Schema(description = "服務項目服務時間")
    @NotNull(message = "服務項目服務時間不可為空")
    private Integer serviceTime;

    @Schema(description = "服務項目狀態")
    private Boolean active;

    @Schema(description = "服務項目提供者")
    private List<Long> providers;
}
