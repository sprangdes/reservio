package com.reservio.service;

import com.reservio.controller.request.UpdateProfileRequest;
import com.reservio.entity.UserData;
import com.reservio.exception.UserAlreadyExistsException;
import com.reservio.repo.UserDataRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class UserProfileService {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
    );

    private final UserDataRepo userRepo;

    public UserProfileService(UserDataRepo userRepo) {
        this.userRepo = userRepo;
    }

    @Transactional
    public UserData update(UserData user, UpdateProfileRequest request) {
        if (user == null || !"ROLE_USER".equals(user.getRole())) {
            throw new IllegalArgumentException("只有 Reservio 客戶可以修改個人資料");
        }
        if (request == null) {
            throw new IllegalArgumentException("缺少個人資料");
        }
        String username = normalizeUsername(request.username());
        String email = normalizeEmail(request.email());
        if (userRepo.existsByUsernameAndIdNot(username, user.getId())) {
            throw new UserAlreadyExistsException("此使用者名稱已被使用");
        }
        if (userRepo.existsByEmailAndIdNot(email, user.getId())) {
            throw new UserAlreadyExistsException("此電子郵件已被註冊");
        }
        boolean emailChanged = !email.equalsIgnoreCase(user.getEmail());
        user.setUsername(username);
        user.setEmail(email);
        if (emailChanged) {
            user.setEmailVerified(false);
        }
        return userRepo.save(user);
    }

    private String normalizeUsername(String value) {
        String username = value == null ? "" : value.trim();
        if (username.isEmpty() || username.length() > 100) {
            throw new IllegalArgumentException("使用者名稱長度必須為 1 至 100 個字元");
        }
        return username;
    }

    private String normalizeEmail(String value) {
        String email = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 255 || !EMAIL_PATTERN.matcher(email).matches()) {
            throw new IllegalArgumentException("Email 格式不正確");
        }
        return email;
    }
}
