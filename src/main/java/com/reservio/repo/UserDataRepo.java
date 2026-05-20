package com.reservio.repo;

import com.reservio.entity.UserData;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserDataRepo extends JpaRepository<UserData, Long> {
    boolean existsByEmail(String email);
    boolean existsByUsername(String username);
    UserData findByUsername(String username);
    UserData findByEmail(String email);
    Optional<UserData> findByLineUserIdAndRole(String lineUserId, String role);
}
