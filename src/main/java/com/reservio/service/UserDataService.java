package com.reservio.service;

import com.reservio.entity.UserData;
import com.reservio.exception.UserAlreadyExistsException;
import com.reservio.exception.UserNotFoundException;
import com.reservio.repo.UserDataRepo;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.reservio.enums.Role.ROLE_USER;

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
            throw new UserAlreadyExistsException("此電子郵件已被註冊");
        }
        // 2. 檢查帳號是否已被註冊
        if (userDataRepo.existsByUsername(username)) {
            throw new UserAlreadyExistsException("此使用者名稱已被使用");
        }

        UserData user = UserData.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(ROLE_USER.name())
                .build();
        return userDataRepo.save(user);
    }

    @Transactional
    public void registerBusinessUser(String username, String email, String password) {

    }

    public UserData getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username;

        if (principal instanceof UserDetails userDetails) {
            username = userDetails.getUsername();
        } else {
            username = principal.toString();
        }

        UserData user = userDataRepo.findByUsername(username);
        if (user == null) {
            throw new UserNotFoundException("找不到當前登入的使用者: " + username);
        }
        return user;
    }
}
