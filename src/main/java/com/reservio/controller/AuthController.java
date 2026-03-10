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
                        .message("註冊成功")
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
                        .message("商家註冊成功")
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
                .message("登入成功")
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

    private UserDTO toUserDTO(UserData user) {
        if (user == null) {
            return null;
        }
        BusinessDTO businessDTO = null;
        if (user.getBusinessData() != null) {
            businessDTO = BusinessDTO.builder()
                    .id(user.getBusinessData().getId())
                    .name(user.getBusinessData().getName())
                    .category(user.getBusinessData().getCategory())
                    .phone(user.getBusinessData().getPhone())
                    .address(user.getBusinessData().getAddress())
                    .build();
        }
        return UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .business(businessDTO)
                .build();
    }
}
