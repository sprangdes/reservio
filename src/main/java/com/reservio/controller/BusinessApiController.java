package com.reservio.controller;

import com.reservio.controller.request.*;
import com.reservio.controller.response.*;
import com.reservio.entity.BusinessData;
import com.reservio.entity.ServiceItem;
import com.reservio.exception.DateSlotNotFoundException;
import com.reservio.exception.NotBusinessAccountException;
import com.reservio.exception.ServiceNotEditableException;
import com.reservio.service.BusinessCategoryService;
import com.reservio.service.BusinessDataService;
import com.reservio.service.ServiceItemService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.NoSuchElementException;

import static com.reservio.enums.ApiResponseMessageEnum.*;

@RestController
@RequestMapping("/api")
public class BusinessApiController {

    private final BusinessDataService businessDataService;
    private final ServiceItemService serviceItemService;
    private final BusinessCategoryService businessCategoryService;

    public BusinessApiController(
            BusinessDataService businessDataService,
            ServiceItemService serviceItemService,
            BusinessCategoryService businessCategoryService) {
        this.businessDataService = businessDataService;
        this.serviceItemService = serviceItemService;
        this.businessCategoryService = businessCategoryService;
    }

    /**
     * Retrieves a list of businesses and transforms the data into BusinessResponse objects.
     * Provides a response indicating the success or failure of the operation.
     *
     * @return ResponseEntity containing ApiResponse with a List of BusinessResponse objects if the operation is successful.
     *         In case of an error, ResponseEntity will contain ApiResponse with success set to false and an error message.
     */
    @GetMapping("/businesses")
    public ResponseEntity<ApiResponse<List<BusinessResponse>>> getBusinesses() {
        try {
            // 正常流程
            List<BusinessResponse> allBusinesses = businessDataService.getAllBusinesses().stream()
                    .map(this::toBusinessResponse)
                    .toList();
            return ResponseEntity.ok(ApiResponse.<List<BusinessResponse>>builder()
                    .success(true)
                    .message(OK.getMessage())
                    .data(allBusinesses)
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

    /**
     * Retrieves a list of business categories.
     *
     * @return a ResponseEntity containing an ApiResponse with a list of category names.
     *         The ApiResponse includes the success status, a message, and the data payload.
     *         On successful execution, it returns a 200 OK response with the list of categories.
     *         In case of an error, it returns a 500 Internal Server Error response.
     */
    @GetMapping("/businesses/category")
    public ResponseEntity<ApiResponse<List<String>>> getCategories() {
        try {
            // 正常流程
            List<String> categories = businessCategoryService.getCategories();
            return ResponseEntity.ok(ApiResponse.<List<String>>builder()
                    .success(true)
                    .message(OK.getMessage())
                    .data(categories)
                    .build()
            );
        } catch (Exception e) {
            // 系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<List<String>>builder()
                            .success(false)
                            .message(ERROR.getMessage())
                            .build()
                    );
        }
    }

    @PostMapping("/businesses/setup")
    public ResponseEntity<ApiResponse<BusinessResponse>> setupBusiness(@RequestBody SetupBusinessRequest request) {
        try {
            BusinessData businessData = businessDataService.setupCurrentBusiness(request);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.<BusinessResponse>builder()
                            .success(true)
                            .message("商家資訊建立成功")
                            .data(toBusinessResponse(businessData))
                            .build());
        } catch (NotBusinessAccountException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<BusinessResponse>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(ApiResponse.<BusinessResponse>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<BusinessResponse>builder()
                            .success(false)
                            .message(e.getMessage())
                            .build());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<BusinessResponse>builder()
                            .success(false)
                            .message(ERROR.getMessage())
                            .build());
        }
    }

    /**
     * Retrieves a list of services associated with a specific business.
     *
     * @param businessId the unique identifier of the business whose services are to be retrieved
     * @return a ResponseEntity containing an ApiResponse with a list of ServiceItemResponse objects if successful,
     *         or an error message if an exception occurs
     */
    @GetMapping("/businesses/{businessId}/services")
    public ResponseEntity<ApiResponse<List<ServiceItemResponse>>> getBusinessServices(@PathVariable Long businessId) {
        try {
            // 正常流程
            List<ServiceItemResponse> services = serviceItemService.getServicesByBusinessId(businessId).stream()
                    .map(this::toServiceItemResponse)
                    .toList();
            return ResponseEntity.ok(ApiResponse.<List<ServiceItemResponse>>builder()
                    .success(true)
                    .message(OK.getMessage())
                    .data(services)
                    .build()
            );
        } catch (Exception e) {
            // 系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<List<ServiceItemResponse>>builder()
                            .success(false)
                            .message(ERROR.getMessage())
                            .build()
                    );
        }
    }

    /**
     * Retrieves a list of active services associated with a business.
     *
     * @param businessId the unique identifier of the business whose active services are to be retrieved
     * @return a {@code ResponseEntity} containing an {@code ApiResponse} with a list of {@code ActiveServiceItemResponse} objects if the operation is successful;
     *         otherwise, an {@code ApiResponse} indicating an error status
     */
    @GetMapping("/businesses/{businessId}/services/active")
    public ResponseEntity<ApiResponse<List<ActiveServiceItemResponse>>> getActiveServices(@PathVariable Long businessId) {
        try {
            // 正常流程
            List<ActiveServiceItemResponse> activeServices = serviceItemService.getActiveServicesByBusinessId(businessId).stream()
                    .map(this::toActiveServiceItemResponse)
                    .toList();
            return ResponseEntity.ok(ApiResponse.<List<ActiveServiceItemResponse>>builder()
                    .success(true)
                    .message(OK.getMessage())
                    .data(activeServices)
                    .build()
            );
        } catch (Exception e) {
            // 系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<List<ActiveServiceItemResponse>>builder()
                            .success(false)
                            .message(ERROR.getMessage())
                            .build()
                    );
        }
    }

    /**
     * Adds a new service item for a business account based on the provided request data.
     *
     * @param request the ServiceItemRequest containing the name and duration of the service item to be added
     * @return a ResponseEntity containing an ApiResponse object with the details of the added service item,
     *         or an error message if the request fails
     */
    @PostMapping("/businesses/services")
    public ResponseEntity<ApiResponse<ServiceItemResponse>> addServiceItem(@RequestBody ServiceItemRequest request) {
        try {
            // 正常流程
            ServiceItem item = serviceItemService.saveServiceItem(request.getName(), request.getDuration());
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.<ServiceItemResponse>builder()
                            .success(true)
                            .message(ADD_SERVICE.getMessage())
                            .data(toServiceItemResponse(item))
                            .build()
                    );
        } catch (NotBusinessAccountException e) {
            // 非商家帳戶無法新增服務
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<ServiceItemResponse>builder()
                            .success(false)
                            .message(NOT_BUSINESS_ACCOUNT_CANT_ADD_SERVICE.getMessage())
                            .build()
                    );
        } catch (Exception e) {
            //系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<ServiceItemResponse>builder()
                            .success(false)
                            .message(ERROR.getMessage())
                            .build()
                    );
        }
    }

    /**
     * Activates a service item specified by its ID. This method allows switching a service item
     * to the "on" status for business accounts while handling possible exceptions such as
     * unauthorized access, missing service items, or internal server errors.
     *
     * @param id the ID of the service item to be activated
     * @return a ResponseEntity containing an ApiResponse. The ApiResponse includes a success flag
     *         and a message indicating the operation result. Possible HTTP response statuses:
     *         200 OK if successful, 403 FORBIDDEN if the account is not a business account,
     *         404 NOT FOUND if the service item does not exist, and
     *         500 INTERNAL SERVER ERROR for other system errors.
     */
    @PostMapping("/businesses/services/{id}/on")
    public ResponseEntity<ApiResponse<Void>> serviceItemOn(@PathVariable Long id) {
        try {
            // 正常流程
            serviceItemService.switchServiceItem(id, true);
            return ResponseEntity.status(HttpStatus.OK)
                    .body(ApiResponse.<Void>builder()
                            .success(true)
                            .message(SERVICE_ON.getMessage())
                            .build()
                     );
        } catch (NotBusinessAccountException e) {
            // 非商家帳號無法修改服務
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(NOT_BUSINESS_ACCOUNT_CANT_EDIT_SERVICE.getMessage())
                            .build()
                    );
        } catch (NoSuchElementException e) {
            // 找不到服務項目
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(SERVICE_NOT_EXIST.getMessage())
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

    /**
     * Deactivates a service item by its ID. This operation is restricted to business accounts.
     * If the specified service item is found and successfully deactivated, it returns a response
     * indicating success. Otherwise, returns an appropriate error response based on the
     * encountered exception.
     *
     * @param id the unique identifier of the service item to be deactivated
     * @return a {@code ResponseEntity} containing an {@code ApiResponse} indicating the outcome
     *         of the operation. Possible statuses include:
     *         - 200 OK if the operation is successful
     *         - 403 FORBIDDEN if the caller is not a business account
     *         - 404 NOT FOUND if the service item does not exist
     *         - 500 INTERNAL SERVER ERROR for any general server-related errors
     */
    @PostMapping("/businesses/services/{id}/off")
    public ResponseEntity<ApiResponse<Void>> serviceItemOff(@PathVariable Long id) {
        try {
            serviceItemService.switchServiceItem(id, false);
            return ResponseEntity.status(HttpStatus.OK)
                    .body(ApiResponse.<Void>builder()
                            .success(true)
                            .message(SERVICE_OFF.getMessage())
                            .build()
                    );
        } catch (NotBusinessAccountException e) {
            // 非商家帳號無法修改服務
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(NOT_BUSINESS_ACCOUNT_CANT_EDIT_SERVICE.getMessage())
                            .build()
                    );
        } catch (NoSuchElementException e) {
            // 找不到服務項目
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(SERVICE_NOT_EXIST.getMessage())
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

    /**
     * Deletes a service item identified by its ID.
     *
     * @param id the ID of the service item to be deleted
     * @return a {@code ResponseEntity} containing an {@code ApiResponse}
     *         indicating the success or failure of the operation
     */
    @PostMapping("/businesses/services/{id}/delete")
    public ResponseEntity<ApiResponse<Void>> deleteServiceItem(@PathVariable Long id) {
        try {
            // 正常流程
            serviceItemService.deleteServiceItem(id);
            return ResponseEntity.status(HttpStatus.OK)
                    .body(ApiResponse.<Void>builder()
                            .success(true)
                            .message(SERVICE_DELETE.getMessage())
                            .build()
                    );
        } catch (NoSuchElementException e) {
            // 服務項目不存在
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(SERVICE_NOT_EXIST.getMessage())
                            .build()
                    );
        } catch (ServiceNotEditableException e) {
            // 服務項目不可編輯
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(CANT_DELETE_SERVICE.getMessage())
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

    /**
     * Modifies an existing service item based on the given ID and request details.
     *
     * @param id The ID of the service item to be modified.
     * @param request The details of the service item modification, including the name and duration.
     * @return A ResponseEntity containing an ApiResponse object.
     *         If the operation is successful, the response has a success status of true and an HTTP status code of 200.
     *         If the service item is not found, the response has a success status of false and an HTTP status code of 404.
     *         If the service item is not editable, the response has a success status of false and an HTTP status code of 400.
     *         If an unexpected error occurs, the response has a success status of false and an HTTP status code of 500.
     */
    @PostMapping("/businesses/services/{id}/modify")
    public ResponseEntity<ApiResponse<Void>> modifyServiceItem(
            @PathVariable Long id,
            @RequestBody ServiceItemRequest request) {
        try {
            // 正常流程
            serviceItemService.modifyServiceItem(id, request.getName(), request.getDuration());
            return ResponseEntity.status(HttpStatus.OK)
                    .body(ApiResponse.<Void>builder()
                            .success(true)
                            .message(SERVICE_UPDATE.getMessage())
                            .build()
                    );
        } catch (NoSuchElementException e) {
            // 服務項目不存在
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(SERVICE_NOT_EXIST.getMessage())
                            .build()
                    );
        } catch (ServiceNotEditableException e) {
            // 服務項目不可編輯
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(CANT_UPDATE_SERVICE.getMessage())
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

    /**
     * Updates the business information based on the provided request.
     *
     * @param request an {@link UpdateBusinessInfoRequest} object containing the new business information to be updated.
     * @return a {@link ResponseEntity} containing an {@link ApiResponse} with a {@link BusinessResponse} object if the update is successful.
     *         The response includes the updated business information, a success flag, and a message.
     *         If the requester is not a business account, a response with an error message and forbidden status is returned.
     *         For any other exceptions, a response with an error message and internal server error status is returned.
     */
    @PostMapping("/businesses/info/update")
    public ResponseEntity<ApiResponse<BusinessResponse>> updateBusinessInfo(@RequestBody UpdateBusinessInfoRequest request) {
        try {
            // 正常流程
            BusinessData businessData = businessDataService.updateBusinessInfo(request);
            return ResponseEntity.status(HttpStatus.OK)
                    .body(ApiResponse.<BusinessResponse>builder()
                            .success(true)
                            .message(UPDATE_BUSINESS_INFO.getMessage())
                            .data(toBusinessResponse(businessData))
                            .build()
                    );
        } catch (NotBusinessAccountException e) {
            // 非商家帳號無法修改商家資訊
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<BusinessResponse>builder()
                            .success(false)
                            .message(UPDATE_BUSINESS_INFO_ERROR.getMessage())
                            .build()
                    );
        } catch (Exception e) {
            // 系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<BusinessResponse>builder()
                            .success(false)
                            .message(ERROR.getMessage())
                            .build()
                    );
        }
    }

    /**
     * Sets the default slot for a business account based on the provided request data.
     *
     * @param request the {@link DefaultSlotRequest} object containing the details required to set the default slot
     * @return a {@link ResponseEntity} containing an {@link ApiResponse} object with the operation's success status
     *         and an appropriate message
     */
    @PostMapping("/businesses/slot/default")
    public ResponseEntity<ApiResponse<Void>> setDefaultSlot(@RequestBody DefaultSlotRequest request) {
        try {
            // 正常流程
            businessDataService.setDefaultSlot(request);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message(UPDATE_BUSINESS_INFO.getMessage())
                    .build()
            );
        } catch (NotBusinessAccountException e) {
            // 非商家帳號無法修改商家資訊
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(UPDATE_BUSINESS_INFO_ERROR.getMessage())
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

    /**
     * Handles the HTTP GET request to retrieve the default slot information for a business.
     * This method fetches the default slot details based on the account and returns the
     * information wrapped in an ApiResponse object.
     * <p>
     * The method handles the following scenarios:
     * - Successfully fetches the default slot information if the account is valid.
     * - Returns a FORBIDDEN status if the account is not a business account.
     * - Handles any unexpected errors with an INTERNAL_SERVER_ERROR status.
     *
     * @return ResponseEntity containing an ApiResponse object. The ApiResponse includes:
     *         - success: Indicates whether the operation was successful.
     *         - message: A message providing context or status regarding the request.
     *         - data: The default slot details, wrapped in a DefaultSlotResponse object
     *           if the request is successful.
     */
    @GetMapping("/businesses/slot/default")
    public ResponseEntity<ApiResponse<DefaultSlotResponse>> getDefaultSlot() {
        try {
            // 正常流程
            DefaultSlotResponse response = businessDataService.getDefaultSlot();
            return ResponseEntity.ok(ApiResponse.<DefaultSlotResponse>builder()
                    .success(true)
                    .message(UPDATE_BUSINESS_INFO.getMessage())
                    .data(response)
                    .build()
            );
        } catch (NotBusinessAccountException e) {
            // 非商家帳號無法取得商家資訊
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<DefaultSlotResponse>builder()
                            .success(false)
                            .message(NOT_BUSINESS_ACCOUNT_CANT_FETCH_INFO.getMessage())
                            .build()
                    );
        } catch (Exception e) {
            // 系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<DefaultSlotResponse>builder()
                            .success(false)
                            .message(ERROR.getMessage())
                            .build()
                    );
        }
    }

    /**
     * Retrieves the date slot information for a business based on the provided request.
     *
     * @param request the {@link DateSlotRequest} containing the details needed to fetch the date slot.
     * @return a {@link ResponseEntity} containing an {@link ApiResponse} with {@link DateSlotResponse}
     *         data if successful, or an error message in case of failure.
     */
    @PostMapping("/businesses/slot/date")
    public ResponseEntity<ApiResponse<DateSlotResponse>> getDateSlot(@RequestBody DateSlotRequest request) {
        try {
            // 正常流程
            DateSlotResponse response = businessDataService.getDateSlot(request.getDate());
            return ResponseEntity.status(HttpStatus.OK)
                    .body(ApiResponse.<DateSlotResponse>builder()
                            .success(true)
                            .message(null)
                            .data(response)
                            .build()
                    );
        } catch (NotBusinessAccountException e) {
            // 非商家帳號不可更新商家資訊
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<DateSlotResponse>builder()
                            .success(false)
                            .message(NOT_BUSINESS_ACCOUNT_CANT_ADJUST_INFO.getMessage())
                            .build()
                    );
        } catch (Exception e) {
            // 系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<DateSlotResponse>builder()
                            .success(false)
                            .message(ERROR.getMessage())
                            .build()
                    );
        }
    }

    /**
     * Retrieves a list of adjusted date slots for businesses.
     * The method processes the request and provides appropriate responses based
     * on the execution flow, including successful processing, forbidden access for
     * non-business accounts, and unexpected system errors.
     *
     * @return ResponseEntity containing an ApiResponse object. In a successful scenario,
     *         the ApiResponse will include a list of DateSlotResponse objects representing
     *         the adjusted date slots. In case of failures, the ApiResponse will include
     *         the appropriate status and error message.
     */
    @GetMapping("/businesses/slot/adjusted")
    public ResponseEntity<ApiResponse<List<DateSlotResponse>>> getDateSlots() {
        try {
            // 正常流程
            List<DateSlotResponse> response = businessDataService.getDateSlots();
            return ResponseEntity.status(HttpStatus.OK)
                    .body(ApiResponse.<List<DateSlotResponse>>builder()
                            .success(true)
                            .message(null)
                            .data(response)
                            .build()
                    );
        } catch (NotBusinessAccountException e) {
            // 非商家帳號不可更新商家資訊
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<List<DateSlotResponse>>builder()
                            .success(false)
                            .message(null)
                            .build()
                    );
        } catch (Exception e) {
            // 系統錯誤
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ApiResponse.<List<DateSlotResponse>>builder()
                            .success(false)
                            .message(ERROR.getMessage())
                            .build()
                    );
        }
    }

    /**
     * Adjusts and saves the date slot for a business based on the provided request.
     *
     * @param request The details of the date slot to be adjusted, wrapped in a {@link SaveDateSlotRequest} object.
     * @return A {@link ResponseEntity} containing an {@link ApiResponse} indicating the success or failure of the operation.
     *         - On success, returns an HTTP 200 response with a success message.
     *         - On failure due to a non-business account, returns an HTTP 403 response with a failure message.
     *         - On system error, returns an HTTP 500 response with an error message.
     */
    @PostMapping("/businesses/slot/date/adjust")
    public ResponseEntity<ApiResponse<Void>> saveDateSlot(@RequestBody SaveDateSlotRequest request) {
        try {
            // 正常流程
            businessDataService.saveDateSlot(request);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message(UPDATE_BUSINESS_INFO.getMessage())
                    .build()
            );
        } catch (NotBusinessAccountException e) {
            // 非商家帳號不可更新商家資訊
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(NOT_BUSINESS_ACCOUNT_CANT_ADJUST_INFO.getMessage())
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

    /**
     * Deletes an adjusted date slot for a business.
     * This method processes the removal request and handles exceptions appropriately,
     * returning a response indicating the outcome.
     *
     * @param request the request object containing details for the adjusted date slot to be deleted
     * @return a {@code ResponseEntity} containing an {@code ApiResponse} with the operation result.
     *         Possible outcomes include success, a forbidden response when the user is not a business account,
     *         a not-found response if the date slot does not exist, or an internal server error in case of unexpected issues.
     */
    @PostMapping("/businesses/slot/date/delete")
    public ResponseEntity<ApiResponse<Void>> deleteAdjustedDateSlot(@RequestBody DeleteAdjustedDateSlotRequest request) {
        try {
            // 正常流程
            businessDataService.deleteAdjustedDateSlot(request);
            return ResponseEntity.ok(ApiResponse.<Void>builder()
                    .success(true)
                    .message(DELETE_ADJUSTED_DATE_SLOT.getMessage())
                    .build()
            );
        } catch (NotBusinessAccountException e) {
            // 非商家帳號不可更新商家資訊
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(NOT_BUSINESS_ACCOUNT_CANT_ADJUST_INFO.getMessage())
                            .build()
                    );
        } catch (DateSlotNotFoundException e) {
            // 找不到營業時段
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(e.getMessage())
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

    private ServiceItemResponse toServiceItemResponse(ServiceItem item) {
        return ServiceItemResponse.builder()
                .id(item.getId())
                .name(item.getName())
                .duration(item.getDuration())
                .active(item.getActive())
                .build();
    }

    private ActiveServiceItemResponse toActiveServiceItemResponse(ServiceItem item) {
        return ActiveServiceItemResponse.builder()
                .id(item.getId())
                .name(item.getName())
                .build();
    }
}
