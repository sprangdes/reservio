package org.machi.reservio.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import org.machi.reservio.entity.ProviderService;

import java.math.BigDecimal;
import java.util.List;

@Data
@Schema(description = "更新服務項目DTO")
public class UpdateServiceDTO {

    @Schema(description = "服務項目ID")
    private Long id;

    @Schema(description = "服務項目名稱")
    private String name;

    @Schema(description = "服務項目描述")
    private String description;

    @Schema(description = "服務項目價格")
    private BigDecimal price;

    @Schema(description = "服務項目服務時間")
    private Integer serviceTime;

    @Schema(description = "服務項目是否啟用")
    private Boolean active;

    @Schema(description = "服務項目提供者服務")
    private List<ProviderService> providerServices;
}
