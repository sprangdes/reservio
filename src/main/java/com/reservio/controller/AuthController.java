package com.reservio.controller;

import com.reservio.dto.*;
import com.reservio.entity.UserData;
import com.reservio.service.UserDataService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.web.bind.annotation.*;

import static com.reservio.enums.ApiResponseMessageEnum.*;
import static com.reservio.util.UserUtil.toUserDTO;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserDataService userDataService;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;

    public AuthController(
            UserDataService userDataService,
            AuthenticationManager authenticationManager,
            SecurityContextRepository securityContextRepository) {
        this.userDataService = userDataService;
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDTO>> register(@RequestBody RegisterRequest request) {
        UserData user = userDataService.registerUser(request.getUsername(), request.getEmail(), request.getPassword());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<UserDTO>builder()
                        .success(true)
                        .message(REGISTER.getMessage())
                        .data(toUserDTO(user))
                        .build());
    }

    @PostMapping("/register-business")
    public ResponseEntity<ApiResponse<UserDTO>> registerBusiness(@RequestBody RegisterBusinessRequest request) {
        UserData user = userDataService.registerBusinessUser(
                request.getUsername(),
                request.getEmail(),
                request.getPassword(),
                request.getBusinessName(),
                request.getCategory(),
                request.getPhone(),
                request.getAddress()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<UserDTO>builder()
                        .success(true)
                        .message(BUSINESS_REGISTER.getMessage())
                        .data(toUserDTO(user))
                        .build());
    }

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<UserDTO>> login(
            @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, httpRequest, httpResponse);

        UserData user = userDataService.getCurrentUser();
        return ResponseEntity.ok(ApiResponse.<UserDTO>builder()
                .success(true)
                .message(LOGIN.getMessage())
                .data(toUserDTO(user))
                .build());
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null) {
            new SecurityContextLogoutHandler().logout(request, response, authentication);
        }
        return ResponseEntity.noContent().build();
    }
}
