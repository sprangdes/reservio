package com.reservio.service;

import com.reservio.config.OtpProperties;
import com.reservio.controller.request.OtpVerificationResult;
import com.reservio.controller.request.RequestOtpRequest;
import com.reservio.controller.request.VerifyOtpRequest;
import com.reservio.entity.Otp;
import com.reservio.entity.UserData;
import com.reservio.exception.OtpVerificationException;
import com.reservio.repo.OtpRepo;
import com.reservio.repo.UserDataRepo;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.ZoneId;

@Service
public class OtpService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserDataRepo userDataRepo;
    private final OtpRepo otpRepo;
    private final PasswordEncoder passwordEncoder;
    private final OtpProperties otpProperties;
    private final PasswordResetMailService passwordResetMailService;

    public OtpService(
            UserDataRepo userDataRepo,
            OtpRepo otpRepo,
            PasswordEncoder passwordEncoder,
            OtpProperties otpProperties,
            PasswordResetMailService passwordResetMailService) {
        this.userDataRepo = userDataRepo;
        this.otpRepo = otpRepo;
        this.passwordEncoder = passwordEncoder;
        this.otpProperties = otpProperties;
        this.passwordResetMailService = passwordResetMailService;
    }

    @Transactional
    public void requestForgotPasswordOtp(RequestOtpRequest request) {
        if (request == null || request.getEmailOrUsername() == null || request.getEmailOrUsername().isBlank()) {
            throw new IllegalArgumentException("請求參數無效");
        }

        String account = request.getEmailOrUsername().trim();
        UserData user = userDataRepo.findByUsername(account);
        if (user == null) {
            user = userDataRepo.findByEmail(account);
        }

        if (user == null) {
            // Security: do not reveal account existence
            return;
        }

        String otpPlain = generateSixDigitOtp();
        Otp otp = Otp.builder()
                .user(user)
                .otpHash(passwordEncoder.encode(otpPlain))
                .expiresAt(LocalDateTime.now(ZoneId.of("Asia/Taipei")).plusMinutes(otpProperties.getExpireMinute()))
                .build();
        otpRepo.save(otp);

        passwordResetMailService.sendPasswordResetOtp(user.getEmail(), otpPlain, otpProperties.getExpireMinute());
    }

    @Transactional
    public OtpVerificationResult verifyForgotPasswordOtp(VerifyOtpRequest request) {
        if (request == null || request.getEmailOrUsername() == null || request.getOtp() == null
                || request.getEmailOrUsername().isBlank() || request.getOtp().isBlank()) {
            throw new OtpVerificationException("OTP 驗證失敗");
        }

        String account = request.getEmailOrUsername().trim();
        String otpPlain = request.getOtp().trim();

        UserData user = userDataRepo.findByUsername(account);
        if (user == null) {
            user = userDataRepo.findByEmail(account);
        }
        if (user == null) {
            throw new OtpVerificationException("OTP 驗證失敗");
        }

        Otp otp = otpRepo.findTopByUserIdOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new OtpVerificationException("OTP 驗證失敗"));

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Taipei"));
        if (otp.getUsedAt() != null || now.isAfter(otp.getExpiresAt())) {
            throw new OtpVerificationException("OTP 驗證失敗");
        }
        if (otp.getAttemptCount() != null && otp.getAttemptCount() >= otpProperties.getMaxAttempts()) {
            throw new OtpVerificationException("OTP 驗證失敗");
        }

        boolean matched = passwordEncoder.matches(otpPlain, otp.getOtpHash());
        if (!matched) {
            otp.setAttemptCount((otp.getAttemptCount() == null ? 0 : otp.getAttemptCount()) + 1);
            otpRepo.save(otp);
            throw new OtpVerificationException("OTP 驗證失敗");
        }

        otp.setUsedAt(now);
        otpRepo.save(otp);
        user.setMustChangePassword(true);
        userDataRepo.save(user);

        return new OtpVerificationResult(user, true);
    }

    private String generateSixDigitOtp() {
        int n = SECURE_RANDOM.nextInt(900_000) + 100_000;
        return String.valueOf(n);
    }
}
