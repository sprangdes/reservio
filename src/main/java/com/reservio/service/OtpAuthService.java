package com.reservio.service;

import com.reservio.dto.ForceChangePasswordRequest;
import com.reservio.entity.UserData;
import com.reservio.exception.UserNotFoundException;
import com.reservio.repo.UserDataRepo;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OtpAuthService {

    private final UserDataRepo userDataRepo;
    private final PasswordEncoder passwordEncoder;

    public OtpAuthService(UserDataRepo userDataRepo, PasswordEncoder passwordEncoder) {
        this.userDataRepo = userDataRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserData forceChangePassword(ForceChangePasswordRequest request) {
        if (request == null || request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new IllegalArgumentException("新密碼不可為空");
        }

        UserData user = getCurrentUser();
        if (!Boolean.TRUE.equals(user.getMustChangePassword())) {
            throw new IllegalStateException("目前不需要強制更新密碼");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword().trim()));
        user.setMustChangePassword(false);
        return userDataRepo.save(user);
    }

    private UserData getCurrentUser() {
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
