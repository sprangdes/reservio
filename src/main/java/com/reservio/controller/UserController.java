package com.reservio.controller;

import com.reservio.controller.request.SetPreferredBusinessesRequest;
import com.reservio.controller.request.UpdateProfileRequest;
import com.reservio.controller.response.ApiResponse;
import com.reservio.controller.response.BusinessResponse;
import com.reservio.controller.response.UserResponse;
import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import com.reservio.exception.UserNotFoundException;
import com.reservio.service.BusinessDataService;
import com.reservio.service.UserDataService;
import com.reservio.service.UserProfileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;

import java.util.List;

import static com.reservio.enums.ApiResponseMessageEnum.*;
import static com.reservio.util.UserUtil.toUserResponse;

@RestController
@RequestMapping("/api")
public class UserController {

    private final UserDataService userDataService;
    private final BusinessDataService businessDataService;
    private final UserProfileService userProfileService;
    private final SecurityContextRepository securityContextRepository;

    public UserController(
            UserDataService userDataService,
            BusinessDataService businessDataService,
            UserProfileService userProfileService,
            SecurityContextRepository securityContextRepository) {
        this.userDataService = userDataService;
        this.businessDataService = businessDataService;
        this.userProfileService = userProfileService;
        this.securityContextRepository = securityContextRepository;
    }

    @PutMapping("/me/profile")
    public ResponseEntity<ApiResponse<UserResponse>> updateProfile(
            @RequestBody UpdateProfileRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserData updated = userProfileService.update(
                userDataService.getCurrentUser(),
                request
        );
        UsernamePasswordAuthenticationToken refreshed =
                new UsernamePasswordAuthenticationToken(
                        updated.getUsername(),
                        null,
                        authentication.getAuthorities()
                );
        refreshed.setDetails(authentication.getDetails());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(refreshed);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, servletRequest, servletResponse);
        return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                .success(true)
                .message("個人資料已更新")
                .data(toUserResponse(updated))
                .build());
    }

    /**
     * Retrieves the currently authenticated user's details.
     * This method returns the information of the currently logged-in user by invoking
     * the userDataService to fetch the user's data. If the user is not found,
     * it responds with a 404 status and an appropriate message. In case of other
     * unexpected errors, it returns a 500 status with a generic error message.
     *
     * @return a ResponseEntity containing an ApiResponse with a UserResponse object
     *         if the user exists, or an error message if the user is not found or
     *         in case of other errors.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me() {
        try {
            // 正常流程
            UserData user = userDataService.getCurrentUser();
            return ResponseEntity.ok(ApiResponse.<UserResponse>builder()
                    .success(true)
                    .message("OK")
                    .data(toUserResponse(user))
                    .build()
            );
        } catch (UserNotFoundException e) {
            // 找不到用戶
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<UserResponse>builder()
                        .success(false)
                        .message(e.getMessage())
                        .build()
                    );
        } catch (Exception e) {
            // 系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<UserResponse>builder()
                        .success(false)
                        .message(ERROR.getMessage())
                        .build()
                    );
        }
    }

    @GetMapping("/businesses/{category}")
    public ResponseEntity<ApiResponse<List<BusinessResponse>>> fetchBusinessByCategory(
            @PathVariable String category) {
        try {
            // 正常流程
            List<BusinessResponse> businessList = businessDataService.getBusinessByCategory(category).stream()
                .map(this::toBusinessResponse)
                .toList();
            return ResponseEntity.ok(ApiResponse.<List<BusinessResponse>>builder()
                .success(true)
                .message(OK.getMessage())
                .data(businessList)
                .build()
            );
        } catch (Exception e) {
            // 系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<List<BusinessResponse>>builder()
                    .success(false)
                    .message(ERROR.getMessage())
                    .build()
                );
        }
    }

    @PostMapping("/preferred-businesses")
    public ResponseEntity<ApiResponse<Void>> setPreferredBusinesses(
            @RequestBody SetPreferredBusinessesRequest request) {
        try {
            // 正常流程
            userDataService.setPreferredBusinesses(request.getPreferredBusinesses());
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                .success(true)
                .message(OK.getMessage())
                .build()
            );
        } catch (Exception e) {
            // 系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<Void>builder()
                    .success(false)
                    .message(ERROR.getMessage())
                    .build()
                );
        }
    }

    @GetMapping("/preferred-businesses")
    public ResponseEntity<ApiResponse<List<BusinessResponse>>> getPreferredBusinesses() {
        try {
            // 正常流程
            List<BusinessData> businessDataList = userDataService.getPreferredBusinesses();
            List<BusinessResponse> result = businessDataList.stream()
                .map(this::toBusinessResponse)
                .toList();
            return ResponseEntity.ok(ApiResponse.<List<BusinessResponse>>builder()
                .success(true)
                .message(OK.getMessage())
                .data(result)
                .build()
            );
        } catch (Exception e) {
            // 系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.<List<BusinessResponse>>builder()
                    .success(false)
                    .message(ERROR.getMessage())
                    .build()
                );
        }
    }

    private BusinessResponse toBusinessResponse(BusinessData data) {
        return BusinessResponse.builder()
            .id(data.getId())
            .name(data.getName())
            .category(data.getCategory())
            .phone(data.getPhone())
            .address(data.getAddress())
            .slotInterval(data.getSlotInterval())
            .build();
    }
}
