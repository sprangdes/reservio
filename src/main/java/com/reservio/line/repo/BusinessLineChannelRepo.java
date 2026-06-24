package com.reservio.line.repo;

import com.reservio.line.entity.BusinessLineChannel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BusinessLineChannelRepo extends JpaRepository<BusinessLineChannel, Long> {
    Optional<BusinessLineChannel> findByBusinessId(Long businessId);

    Optional<BusinessLineChannel> findByWebhookKey(String webhookKey);
}
