package com.reservio.service;

import com.reservio.controller.request.UpdateProfileRequest;
import com.reservio.entity.UserData;
import com.reservio.exception.UserAlreadyExistsException;
import com.reservio.repo.UserDataRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    @Mock private UserDataRepo userRepo;

    private UserProfileService service;
    private UserData user;

    @BeforeEach
    void setUp() {
        service = new UserProfileService(userRepo);
        user = UserData.builder()
                .id(40L)
                .username("old-name")
                .email("old@example.com")
                .emailVerified(true)
                .role("ROLE_USER")
                .build();
    }

    @Test
    void normalizesProfileAndResetsVerificationWhenEmailChanges() {
        when(userRepo.save(user)).thenReturn(user);

        UserData result = service.update(
                user,
                new UpdateProfileRequest(" New Name ", " NEW@Example.COM ")
        );

        assertThat(result).isSameAs(user);
        assertThat(user.getUsername()).isEqualTo("New Name");
        assertThat(user.getEmail()).isEqualTo("new@example.com");
        assertThat(user.getEmailVerified()).isFalse();
        verify(userRepo).save(user);
    }

    @Test
    void unchangedEmailKeepsVerification() {
        when(userRepo.save(user)).thenReturn(user);

        service.update(
                user,
                new UpdateProfileRequest("old-name", " OLD@example.com ")
        );

        assertThat(user.getEmailVerified()).isTrue();
    }

    @Test
    void rejectsBusinessAccount() {
        user.setRole("ROLE_BUSINESS");
        UpdateProfileRequest request = new UpdateProfileRequest(
                "business", "business@example.com");

        assertThatThrownBy(() -> service.update(user, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("客戶");

        verify(userRepo, never()).save(user);
    }

    @Test
    void rejectsInvalidUsernameAndEmail() {
        UpdateProfileRequest invalidUsername = new UpdateProfileRequest(
                " ", "valid@example.com");
        UpdateProfileRequest invalidEmail = new UpdateProfileRequest(
                "valid-name", "not-an-email");

        assertThatThrownBy(() -> service.update(user, invalidUsername))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("使用者名稱");
        assertThatThrownBy(() -> service.update(user, invalidEmail))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email");
    }

    @Test
    void rejectsDuplicateUsernameAndEmail() {
        UpdateProfileRequest duplicateUsername = new UpdateProfileRequest(
                "taken", "valid@example.com");
        UpdateProfileRequest duplicateEmail = new UpdateProfileRequest(
                "available", "taken@example.com");
        when(userRepo.existsByUsernameAndIdNot("taken", 40L)).thenReturn(true);

        assertThatThrownBy(() -> service.update(user, duplicateUsername))
                .isInstanceOf(UserAlreadyExistsException.class)
                .hasMessageContaining("使用者名稱");

        when(userRepo.existsByUsernameAndIdNot("available", 40L)).thenReturn(false);
        when(userRepo.existsByEmailAndIdNot("taken@example.com", 40L)).thenReturn(true);

        assertThatThrownBy(() -> service.update(user, duplicateEmail))
                .isInstanceOf(UserAlreadyExistsException.class)
                .hasMessageContaining("電子郵件");
    }
}
