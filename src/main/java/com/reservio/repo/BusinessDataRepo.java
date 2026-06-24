package com.reservio.repo;

import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusinessDataRepo extends JpaRepository<BusinessData, Long> {
    BusinessData findByUser(UserData user);

    List<BusinessData> findByCategory(String category);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select business from BusinessData business where business.id = :id")
    Optional<BusinessData> findByIdForUpdate(@Param("id") Long id);
}
