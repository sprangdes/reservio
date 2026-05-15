package com.reservio.service;

import com.reservio.dto.RequestOtpRequest;
import com.reservio.dto.VerifyOtpRequest;
import com.reservio.entity.Otp;
import com.reservio.entity.UserData;
import com.reservio.repo.OtpRepo;
import com.reservio.repo.UserDataRepo;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.security.SecureRandom;

@Slf4j
@Service
public class OtpService {

    private static final int OTP_EXPIRE_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 5;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final UserDataRepo userDataRepo;
    private final OtpRepo otpRepo;
    private final PasswordEncoder passwordEncoder;

    public OtpService(
            UserDataRepo userDataRepo,
            OtpRepo otpRepo,
            PasswordEncoder passwordEncoder) {
        this.userDataRepo = userDataRepo;
        this.otpRepo = otpRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void requestForgotPasswordOtp(RequestOtpRequest request) {
        if (request == null || request.getEmailOrUsername() == null || request.getEmailOrUsername().isBlank()) {
            return;
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
        log.info("Generated OTP: {}", otpPlain); // TODO: 之後要移除
        Otp otp = Otp.builder()
                .user(user)
                .otpHash(passwordEncoder.encode(otpPlain))
                .expiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRE_MINUTES))
                .build();
        otpRepo.save(otp);

        // TODO: send otpPlain via email provider
    }

    @Transactional
    public OtpVerificationResult verifyForgotPasswordOtp(VerifyOtpRequest request) {
        if (request == null || request.getEmailOrUsername() == null || request.getOtp() == null
                || request.getEmailOrUsername().isBlank() || request.getOtp().isBlank()) {
            throw new IllegalArgumentException("OTP 驗證失敗");
        }

        String account = request.getEmailOrUsername().trim();
        String otpPlain = request.getOtp().trim();

        UserData user = userDataRepo.findByUsername(account);
        if (user == null) {
            user = userDataRepo.findByEmail(account);
        }
        if (user == null) {
            throw new IllegalArgumentException("OTP 驗證失敗");
        }

        Otp otp = otpRepo.findTopByUserIdOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new IllegalArgumentException("OTP 驗證失敗"));

        LocalDateTime now = LocalDateTime.now();
        if (otp.getUsedAt() != null || now.isAfter(otp.getExpiresAt())) {
            throw new IllegalArgumentException("OTP 驗證失敗");
        }
        if (otp.getAttemptCount() != null && otp.getAttemptCount() >= MAX_ATTEMPTS) {
            throw new IllegalArgumentException("OTP 驗證失敗");
        }

        boolean matched = passwordEncoder.matches(otpPlain, otp.getOtpHash());
        if (!matched) {
            otp.setAttemptCount((otp.getAttemptCount() == null ? 0 : otp.getAttemptCount()) + 1);
            otpRepo.save(otp);
            throw new IllegalArgumentException("OTP 驗證失敗");
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
