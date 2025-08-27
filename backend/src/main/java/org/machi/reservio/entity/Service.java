package org.machi.reservio.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "service")
public class Service { // 服務項目

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "name", nullable = false, length = 50)
    private String name; // 服務名稱

    @Column(name = "description", nullable = false)
    private String description; // 服務說明

    @Column(name = "price", nullable = false)
    private BigDecimal price; // 價格

    @Column(name = "service_time", nullable = false)
    private Integer serviceTime; // 服務時長

    @Column(name= "active", nullable = false)
    private Boolean active; // 是否提供

    @OneToMany(mappedBy = "service", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ProviderService> providerServices; // 提供該服務的人員清單
}
