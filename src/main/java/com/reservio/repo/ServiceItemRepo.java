package com.reservio.repo;

import com.reservio.entity.ServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ServiceItemRepo extends JpaRepository<ServiceItem, Long> {
    List<ServiceItem> findAllByBusinessId(Long businessId);
}
