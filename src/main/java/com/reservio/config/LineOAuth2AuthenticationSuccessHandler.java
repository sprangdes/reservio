package com.reservio.config;

import com.reservio.entity.UserData;
import com.reservio.service.LineAuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.util.List;

@Component
@Slf4j
public class LineOAuth2AuthenticationSuccessHandler implements AuthenticationSuccessHandler {

    private final LineAuthService lineAuthService;
    private final SecurityContextRepository securityContextRepository;
    private final LineOAuth2Properties lineOAuth2Properties;

    public LineOAuth2AuthenticationSuccessHandler(
            LineAuthService lineAuthService,
            SecurityContextRepository securityContextRepository,
            LineOAuth2Properties lineOAuth2Properties) {
        this.lineAuthService = lineAuthService;
        this.securityContextRepository = securityContextRepository;
        this.lineOAuth2Properties = lineOAuth2Properties;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        org.springframework.security.core.Authentication authentication)
            throws IOException, ServletException {

        OAuth2AuthenticationToken oauthToken = (OAuth2AuthenticationToken) authentication;
        OAuth2User oauth2User = oauthToken.getPrincipal();
        String lineUserId = oauth2User.getAttribute("userId");
        String registrationId = oauthToken.getAuthorizedClientRegistrationId();

        if (lineUserId == null || lineUserId.isBlank()) {
            log.warn("LINE oauth success callback without userId. registrationId={}", registrationId);
            response.sendRedirect(buildFailureRedirect());
            return;
        }

        log.info("LINE oauth callback received. registrationId={}, sub={}", registrationId, lineUserId);

        UserData user = lineAuthService.findOrCreateUserByLine(
                lineUserId,
                registrationId,
                oauth2User.getAttribute("displayName")
        );

        log.info("LINE user resolved. userId={}, username={}, role={}, lineUserId={}",
                user.getId(), user.getUsername(), user.getRole(), user.getLineUserId());

        UsernamePasswordAuthenticationToken appAuth = new UsernamePasswordAuthenticationToken(
                user.getUsername(),
                null,
                List.of(new SimpleGrantedAuthority(user.getRole()))
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(appAuth);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        log.info("Session authentication established for username={}", user.getUsername());

        response.sendRedirect(buildSuccessRedirect(user.getRole()));
    }

    private String buildSuccessRedirect(String role) {
        return redirectBuilder(lineOAuth2Properties.successRedirectPath())
                .queryParam("lineLogin", "success")
                .queryParam("role", role)
                .build()
                .toUriString();
    }

    private String buildFailureRedirect() {
        return redirectBuilder(lineOAuth2Properties.failureRedirectPath())
                .queryParam("lineLogin", "failed")
                .queryParam("reason", "missing_userId")
                .build()
                .toUriString();
    }

    private UriComponentsBuilder redirectBuilder(String target) {
        if (target != null && (target.startsWith("http://") || target.startsWith("https://"))) {
            return UriComponentsBuilder.fromUriString(target);
        }
        return UriComponentsBuilder.fromPath(target == null || target.isBlank() ? "/login" : target);
    }
}
