package com.reservio.controller;

import com.reservio.dto.*;
import com.reservio.entity.UserData;
import com.reservio.exception.UserAlreadyExistsException;
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

    /**
     * Handles user registration by processing the provided registration request, creating a new user,
     * and returning a response indicating the success or failure of the operation.
     *
     * @param request the registration request containing the user's details such as username, email, and password
     * @return a {@link ResponseEntity} containing an {@link ApiResponse} with a {@link UserDTO}
     *         if registration is successful, or an error message if the registration fails
     */
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDTO>> register(@RequestBody RegisterRequest request) {
        try {
            // 正常流程
            UserData user = userDataService.registerUser(
                    request.getUsername(),
                    request.getEmail(),
                    request.getPassword()
            );
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.<UserDTO>builder()
                            .success(true)
                            .message(REGISTER.getMessage())
                            .data(toUserDTO(user))
                            .build()
                    );
        } catch (UserAlreadyExistsException e) {
            // 帳號已被註冊
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<UserDTO>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build()
                    );
        } catch (Exception e) {
            // 系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<UserDTO>builder()
                            .success(false)
                            .message(ERROR.getMessage())
                            .build()
                    );
        }
    }

    /**
     * Registers a new business account by processing the provided request data.
     *
     * @param request the {@link RegisterBusinessRequest} object containing
     *                the necessary registration details such as username, email,
     *                password, business name, category, phone number, and address
     * @return a {@link ResponseEntity} containing an {@link ApiResponse} with a {@link UserDTO}
     *         object if registration is successful, or an error message if the user
     *         already exists or a system error occurs
     */
    @PostMapping("/register-business")
    public ResponseEntity<ApiResponse<UserDTO>> registerBusiness(@RequestBody RegisterBusinessRequest request) {
        try {
            // 正常流程
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
                            .build()
                    );
        } catch (UserAlreadyExistsException e) {
            // 帳號已被註冊
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<UserDTO>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build()
                    );
        } catch (Exception e) {
            // 系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<UserDTO>builder()
                            .success(false)
                            .message(ERROR.getMessage())
                            .build()
                    );
        }
    }

    /**
     * Authenticates a user based on the provided login credentials and returns the user's details
     * along with a success message if authentication is successful.
     *
     * @param request       The login request containing the username and password.
     * @param httpRequest   The HTTP servlet request used for managing the session and security context.
     * @param httpResponse  The HTTP servlet response used for managing the session and security context.
     * @return A ResponseEntity containing an ApiResponse object with the user's details,
     *         a success flag, and a confirmation message.
     */
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
                .build()
        );
    }

    /**
     * Logs out the currently authenticated user by clearing the security context and invalidating the session.
     *
     * @param request  the HttpServletRequest object containing the client's request
     * @param response the HttpServletResponse object to assist in returning the response
     * @return a ResponseEntity with no content indicating a successful logout
     */
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null) {
            new SecurityContextLogoutHandler().logout(request, response, authentication);
        }
        return ResponseEntity.noContent().build();
    }
}
