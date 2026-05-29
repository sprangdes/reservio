package com.reservio.service;

import com.reservio.controller.request.ForceChangePasswordRequest;
import com.reservio.entity.UserData;
import com.reservio.repo.UserDataRepo;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OtpAuthService {

    private final UserDataRepo userDataRepo;
    private final PasswordEncoder passwordEncoder;
    private final UserDataService userDataService;

    public OtpAuthService(
            UserDataRepo userDataRepo,
            PasswordEncoder passwordEncoder,
            UserDataService userDataService) {
        this.userDataRepo = userDataRepo;
        this.passwordEncoder = passwordEncoder;
        this.userDataService = userDataService;
    }

    @Transactional
    public UserData forceChangePassword(ForceChangePasswordRequest request) {
        if (request == null || request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            throw new IllegalArgumentException("新密碼不可為空");
        }

        UserData user = userDataService.getCurrentUser();
        if (!Boolean.TRUE.equals(user.getMustChangePassword())) {
            throw new IllegalStateException("目前不需要強制更新密碼");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword().trim()));
        user.setMustChangePassword(false);
        return userDataRepo.save(user);
    }
}
