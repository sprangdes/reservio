package com.reservio.repo;

import com.reservio.entity.ServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceItemRepo extends JpaRepository<ServiceItem, Long> {
    List<ServiceItem> findAllByBusinessId(Long businessId);
    List<ServiceItem> findAllByBusinessIdAndActiveTrue(Long businessId);
    Optional<ServiceItem> findByBusinessIdAndName(Long businessId, String name);
}
