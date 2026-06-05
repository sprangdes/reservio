package com.reservio.service;

import com.reservio.config.OtpProperties;
import com.reservio.controller.request.RequestOtpRequest;
import com.reservio.entity.Otp;
import com.reservio.entity.UserData;
import com.reservio.repo.OtpRepo;
import com.reservio.repo.UserDataRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock
    private UserDataRepo userDataRepo;

    @Mock
    private OtpRepo otpRepo;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private PasswordResetMailService passwordResetMailService;

    private OtpProperties otpProperties;
    private OtpService otpService;

    @BeforeEach
    void setUp() {
        otpProperties = new OtpProperties();
        otpProperties.setExpireMinute(10);
        otpProperties.setMaxAttempts(5);
        otpService = new OtpService(userDataRepo, otpRepo, passwordEncoder, otpProperties, passwordResetMailService);
    }

    @Test
    void requestForgotPasswordOtpSavesHashAndSendsOtpToRegisteredEmail() {
        UserData user = UserData.builder()
                .id(1L)
                .username("machi")
                .email("machi@example.com")
                .password("old-password")
                .role("USER")
                .build();
        when(userDataRepo.findByUsername("machi")).thenReturn(user);
        when(passwordEncoder.encode(anyString())).thenReturn("encoded-otp");

        RequestOtpRequest request = new RequestOtpRequest();
        request.setEmailOrUsername("machi");

        otpService.requestForgotPasswordOtp(request);

        ArgumentCaptor<String> otpCaptor = ArgumentCaptor.forClass(String.class);
        verify(passwordResetMailService).sendPasswordResetOtp(eq("machi@example.com"), otpCaptor.capture(), eq(10));
        assertThat(otpCaptor.getValue()).matches("\\d{6}");

        ArgumentCaptor<Otp> savedOtp = ArgumentCaptor.forClass(Otp.class);
        verify(otpRepo).save(savedOtp.capture());
        assertThat(savedOtp.getValue().getUser()).isSameAs(user);
        assertThat(savedOtp.getValue().getOtpHash()).isEqualTo("encoded-otp");
        verify(passwordEncoder).encode(otpCaptor.getValue());
    }

    @Test
    void requestForgotPasswordOtpDoesNotSendMailWhenAccountDoesNotExist() {
        when(userDataRepo.findByUsername("missing")).thenReturn(null);
        when(userDataRepo.findByEmail("missing")).thenReturn(null);

        RequestOtpRequest request = new RequestOtpRequest();
        request.setEmailOrUsername("missing");

        otpService.requestForgotPasswordOtp(request);

        verify(passwordResetMailService, never()).sendPasswordResetOtp(anyString(), anyString(), anyInt());
        verify(otpRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }
}
