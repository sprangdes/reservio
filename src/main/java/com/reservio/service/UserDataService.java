package com.reservio.service;

import com.reservio.entity.UserData;
import com.reservio.repo.UserDataRepo;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDataService {

    private final UserDataRepo userDataRepo;
    private final PasswordEncoder passwordEncoder;

    public UserDataService(UserDataRepo userDataRepo, PasswordEncoder passwordEncoder) {
        this.userDataRepo = userDataRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserData registerUser(String username, String email, String password) {
        // 1. 檢查 Email 是否已被註冊
        if (userDataRepo.existsByEmail(email)) {
            throw new RuntimeException("此電子郵件已被註冊");
        }
        // 2. 檢查帳號是否已被註冊
        if (userDataRepo.existsByUsername(username)) {
            throw new RuntimeException("此使用者名稱已被佔用");
        }

        UserData user = UserData.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .build();
        return userDataRepo.save(user);
    }
}
