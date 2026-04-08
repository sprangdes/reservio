package com.reservio.controller;

import com.reservio.dto.ApiResponse;
import com.reservio.dto.UserDTO;
import com.reservio.entity.UserData;
import com.reservio.exception.UserNotFoundException;
import com.reservio.service.UserDataService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.reservio.enums.ApiResponseMessageEnum.ERROR;
import static com.reservio.util.UserUtil.toUserDTO;

@RestController
@RequestMapping("/api")
public class UserController {

    private final UserDataService userDataService;

    public UserController(UserDataService userDataService) {
        this.userDataService = userDataService;
    }

    /**
     * Retrieves the currently authenticated user's details.
     * This method returns the information of the currently logged-in user by invoking
     * the userDataService to fetch the user's data. If the user is not found,
     * it responds with a 404 status and an appropriate message. In case of other
     * unexpected errors, it returns a 500 status with a generic error message.
     *
     * @return a ResponseEntity containing an ApiResponse with a UserDTO object
     *         if the user exists, or an error message if the user is not found or
     *         in case of other errors.
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDTO>> me() {
        try {
            // 正常流程
            UserData user = userDataService.getCurrentUser();
            return ResponseEntity.ok(ApiResponse.<UserDTO>builder()
                    .success(true)
                    .message("OK")
                    .data(toUserDTO(user))
                    .build()
            );
        } catch (UserNotFoundException e) {
            // 找不到用戶
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
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
}
