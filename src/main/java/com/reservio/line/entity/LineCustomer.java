package com.reservio.line.entity;

import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "line_customer", uniqueConstraints = {
        @UniqueConstraint(
                name = "uk_line_customer_business_user",
                columnNames = {"business_id", "line_user_id"}
        )
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LineCustomer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "business_id", nullable = false)
    private BusinessData business;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserData user;

    @Column(name = "line_user_id", nullable = false, length = 100)
    private String lineUserId;

    @Column(name = "display_name", length = 255)
    private String displayName;

    @Column(length = 50)
    private String phone;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
