package com.reservio.line.controller;

import com.reservio.entity.UserData;
import com.reservio.line.controller.response.LineAccountLinkStatusResponse;
import com.reservio.line.controller.response.LinkedLineBusinessResponse;
import com.reservio.line.service.LineAccountLinkService;
import com.reservio.service.UserDataService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LineAccountLinkControllerTest {

    @Mock private LineAccountLinkService service;
    @Mock private UserDataService userDataService;

    @Test
    void exposesStatusAndUsesAuthenticatedUserForConfirmationAndUnlink() {
        LineAccountLinkController controller =
                new LineAccountLinkController(service, userDataService);
        UserData user = UserData.builder().id(40L).role("ROLE_USER").build();
        LineAccountLinkStatusResponse status = new LineAccountLinkStatusResponse(
                "Reservio Salon", "CREATED", LocalDateTime.now().plusMinutes(5));
        LinkedLineBusinessResponse linked = new LinkedLineBusinessResponse(
                3L, 8L, "Reservio Salon", LocalDateTime.now());
        when(service.status("request-token")).thenReturn(status);
        when(userDataService.getCurrentUser()).thenReturn(user);
        when(service.confirm("request-token", user)).thenReturn("https://access.line.me/link");
        when(service.linkedBusinesses(user)).thenReturn(List.of(linked));
        UsernamePasswordAuthenticationToken lineAuthentication =
                new UsernamePasswordAuthenticationToken(
                        user.getUsername(),
                        null,
                        List.of(
                                new SimpleGrantedAuthority("ROLE_USER"),
                                new SimpleGrantedAuthority("LINE_LOGIN")
                        ));

        assertThat(controller.status("request-token").getBody().getData()).isEqualTo(status);
        assertThat(controller.confirm("request-token", lineAuthentication)
                .getBody().getData().redirectUrl())
                .isEqualTo("https://access.line.me/link");
        assertThat(controller.list().getBody().getData()).containsExactly(linked);
        controller.unlink(3L);

        verify(service).unlink(3L, user);
    }

    @Test
    void rejectsConfirmationFromPasswordSession() {
        LineAccountLinkController controller =
                new LineAccountLinkController(service, userDataService);
        UsernamePasswordAuthenticationToken passwordAuthentication =
                new UsernamePasswordAuthenticationToken(
                        "customer", null, List.of(new SimpleGrantedAuthority("ROLE_USER")));

        assertThatThrownBy(() -> controller.confirm("request-token", passwordAuthentication))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("必須使用 LINE 登入進行綁定");
    }
}
