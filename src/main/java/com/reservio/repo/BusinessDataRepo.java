package com.reservio.repo;

import com.reservio.entity.BusinessData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BusinessDataRepo extends JpaRepository<BusinessData, Long> {
}
