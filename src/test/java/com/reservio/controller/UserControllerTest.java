package com.reservio.controller;

import com.reservio.controller.request.UpdateProfileRequest;
import com.reservio.controller.response.ApiResponse;
import com.reservio.controller.response.UserResponse;
import com.reservio.entity.UserData;
import com.reservio.service.BusinessDataService;
import com.reservio.service.UserDataService;
import com.reservio.service.UserProfileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.http.ResponseEntity;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserControllerTest {

    @Mock private UserDataService userDataService;
    @Mock private BusinessDataService businessDataService;
    @Mock private UserProfileService profileService;
    @Mock private SecurityContextRepository securityContextRepository;
    @Mock private HttpServletRequest servletRequest;
    @Mock private HttpServletResponse servletResponse;

    private UserController controller;

    @BeforeEach
    void setUp() {
        controller = new UserController(
                userDataService,
                businessDataService,
                profileService,
                securityContextRepository
        );
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                "old-name",
                null,
                List.of(new SimpleGrantedAuthority("ROLE_USER"))
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void updatesProfileAndPersistsRefreshedPrincipal() {
        UserData current = UserData.builder()
                .id(40L)
                .username("old-name")
                .email("old@example.com")
                .role("ROLE_USER")
                .lineUserId("line-login-user")
                .build();
        UserData updated = UserData.builder()
                .id(40L)
                .username("new-name")
                .email("new@example.com")
                .role("ROLE_USER")
                .lineUserId("line-login-user")
                .build();
        UpdateProfileRequest request = new UpdateProfileRequest(
                "new-name",
                "new@example.com"
        );
        when(userDataService.getCurrentUser()).thenReturn(current);
        when(profileService.update(current, request)).thenReturn(updated);

        ResponseEntity<ApiResponse<UserResponse>> response = controller.updateProfile(
                request,
                servletRequest,
                servletResponse
        );

        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getData().getUsername()).isEqualTo("new-name");
        assertThat(response.getBody().getData().getLineLoginLinked()).isTrue();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getName())
                .isEqualTo("new-name");
        ArgumentCaptor<SecurityContext> contextCaptor =
                ArgumentCaptor.forClass(SecurityContext.class);
        verify(securityContextRepository).saveContext(
                contextCaptor.capture(),
                org.mockito.ArgumentMatchers.eq(servletRequest),
                org.mockito.ArgumentMatchers.eq(servletResponse)
        );
        assertThat(contextCaptor.getValue().getAuthentication().getName())
                .isEqualTo("new-name");
        assertThat(contextCaptor.getValue().getAuthentication().getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_USER");
    }
}
