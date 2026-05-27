package com.reservio.repo;

import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BusinessDataRepo extends JpaRepository<BusinessData, Long> {
    BusinessData findByUser(UserData user);

    List<BusinessData> findByCategory(String category);
}
