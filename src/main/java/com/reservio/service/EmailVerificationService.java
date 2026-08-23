package com.reservio.service;

import com.reservio.config.OtpProperties;
import com.reservio.controller.request.EmailVerificationRequest;
import com.reservio.entity.EmailVerificationToken;
import com.reservio.entity.UserData;
import com.reservio.exception.OtpVerificationException;
import com.reservio.repo.EmailVerificationTokenRepo;
import com.reservio.repo.UserDataRepo;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
public class EmailVerificationService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private final UserDataService userDataService;
    private final UserDataRepo userDataRepo;
    private final EmailVerificationTokenRepo tokenRepo;
    private final PasswordEncoder passwordEncoder;
    private final OtpProperties otpProperties;
    private final PasswordResetMailService mailService;

    public EmailVerificationService(UserDataService userDataService, UserDataRepo userDataRepo,
            EmailVerificationTokenRepo tokenRepo, PasswordEncoder passwordEncoder,
            OtpProperties otpProperties, PasswordResetMailService mailService) {
        this.userDataService = userDataService;
        this.userDataRepo = userDataRepo;
        this.tokenRepo = tokenRepo;
        this.passwordEncoder = passwordEncoder;
        this.otpProperties = otpProperties;
        this.mailService = mailService;
    }

    @Transactional
    public void request(EmailVerificationRequest request) {
        UserData user = userDataService.getCurrentUser();
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        if (email.isBlank() || (userDataRepo.existsByEmail(email) && !email.equalsIgnoreCase(user.getEmail()))) {
            throw new IllegalArgumentException("Email 無效或已被使用");
        }
        String otp = String.valueOf(RANDOM.nextInt(900_000) + 100_000);
        tokenRepo.save(EmailVerificationToken.builder().user(user).targetEmail(email)
                .otpHash(passwordEncoder.encode(otp))
                .expiresAt(LocalDateTime.now(ZoneId.of("Asia/Taipei")).plusMinutes(otpProperties.getExpireMinute())).build());
        mailService.sendEmailVerificationOtp(email, otp, otpProperties.getExpireMinute());
    }

    @Transactional
    public void verify(EmailVerificationRequest request) {
        UserData user = userDataService.getCurrentUser();
        EmailVerificationToken token = tokenRepo.findTopByUserIdOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new OtpVerificationException("Email 驗證失敗"));
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Taipei"));
        if (token.getUsedAt() != null || now.isAfter(token.getExpiresAt()) || token.getAttemptCount() >= otpProperties.getMaxAttempts()
                || request.getOtp() == null || !passwordEncoder.matches(request.getOtp().trim(), token.getOtpHash())) {
            token.setAttemptCount(token.getAttemptCount() + 1);
            tokenRepo.save(token);
            throw new OtpVerificationException("Email 驗證失敗");
        }
        token.setUsedAt(now);
        tokenRepo.save(token);
        user.setEmail(token.getTargetEmail());
        user.setEmailVerified(true);
        userDataRepo.save(user);
    }
}
