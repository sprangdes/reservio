package com.reservio.line.repo;

import com.reservio.line.entity.LineCustomer;
import com.reservio.entity.UserData;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LineCustomerRepo extends JpaRepository<LineCustomer, Long> {
    Optional<LineCustomer> findByBusinessIdAndLineUserId(Long businessId, String lineUserId);
    Optional<LineCustomer> findByIdAndLinkedUser(Long id, UserData linkedUser);
    List<LineCustomer> findAllByLinkedUser(UserData linkedUser);
}
