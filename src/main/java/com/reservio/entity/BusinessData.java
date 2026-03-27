package com.reservio.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "business_data")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BusinessData {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private String address;

    // 時間槽間隔 (分鐘, 預設 30)
    @Column(nullable = false)
    private int slotInterval = 30;

    @JsonIgnore
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private UserData user;
}
