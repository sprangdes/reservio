package com.reservio.controller;

import com.reservio.dto.*;
import com.reservio.entity.BusinessData;
import com.reservio.entity.ServiceItem;
import com.reservio.entity.UserData;
import com.reservio.exception.ServiceNotEditableException;
import com.reservio.service.BusinessDataService;
import com.reservio.service.ServiceItemService;
import com.reservio.service.UserDataService;
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
    private final UserDataService userDataService;

    public BusinessApiController(
            BusinessDataService businessDataService,
            ServiceItemService serviceItemService,
            UserDataService userDataService) {
        this.businessDataService = businessDataService;
        this.serviceItemService = serviceItemService;
        this.userDataService = userDataService;
    }

    @GetMapping("/businesses")
    public ResponseEntity<ApiResponse<List<BusinessDTO>>> getBusinesses() {
        List<BusinessDTO> items = businessDataService.getAllBusinesses().stream()
                .map(this::toBusinessDTO)
                .toList();
        return ResponseEntity.ok(ApiResponse.<List<BusinessDTO>>builder()
                .success(true)
                .message(OK.getMessage())
                .data(items)
                .build());
    }

    @GetMapping("/businesses/{businessId}/services")
    public ResponseEntity<ApiResponse<List<ServiceItemDTO>>> getBusinessServices(@PathVariable Long businessId) {
        List<ServiceItemDTO> services = serviceItemService.getServicesByBusinessId(businessId).stream()
                .map(this::toServiceItemDTO)
                .toList();
        return ResponseEntity.ok(ApiResponse.<List<ServiceItemDTO>>builder()
                .success(true)
                .message(OK.getMessage())
                .data(services)
                .build());
    }

    @GetMapping("/businesses/{businessId}/services/active")
    public ResponseEntity<ApiResponse<List<ActiveServiceItemDTO>>> getActiveServices(@PathVariable Long businessId) {
        List<ActiveServiceItemDTO> activeServices = serviceItemService.getActiveServicesByBusinessId(businessId).stream()
                .map(this::toActiveServiceItemDTO)
                .toList();
        return ResponseEntity.ok(ApiResponse.<List<ActiveServiceItemDTO>>builder()
                .success(true)
                .message(OK.getMessage())
                .data(activeServices)
                .build());
    }

    @PostMapping("/businesses/services")
    public ResponseEntity<ApiResponse<ServiceItemDTO>> addServiceItem(@RequestBody ServiceItemRequest request) {
        UserData currentUser = userDataService.getCurrentUser();
        if (currentUser.getBusinessData() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<ServiceItemDTO>builder()
                            .success(false)
                            .message(NOT_BUSINESS_ACCOUNT_CANT_ADD_SERVICE.getMessage())
                            .build());
        }
        ServiceItem item = serviceItemService.saveServiceItem(
                currentUser.getBusinessData(),
                request.getName(),
                request.getDuration()
        );
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<ServiceItemDTO>builder()
                        .success(true)
                        .message(ADD_SERVICE.getMessage())
                        .data(toServiceItemDTO(item))
                        .build());
    }

    @PostMapping("/businesses/services/{id}/on")
    public ResponseEntity<ApiResponse<Void>> serviceItemOn(@PathVariable Long id) {
        try {
            serviceItemService.switchServiceItem(id, true);
            return ResponseEntity.status(HttpStatus.OK)
                    .body(ApiResponse.<Void>builder()
                            .success(true)
                            .message(SERVICE_ON.getMessage())
                            .build());
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(SERVICE_NOT_EXIST.getMessage())
                            .build());
        }
    }

    @PostMapping("/businesses/services/{id}/off")
    public ResponseEntity<ApiResponse<Void>> serviceItemOff(@PathVariable Long id) {
        try {
            serviceItemService.switchServiceItem(id, false);
            return ResponseEntity.status(HttpStatus.OK)
                    .body(ApiResponse.<Void>builder()
                            .success(true)
                            .message(SERVICE_OFF.getMessage())
                            .build());
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(SERVICE_NOT_EXIST.getMessage())
                            .build());
        }
    }

    @PostMapping("/businesses/services/{id}/delete")
    public ResponseEntity<ApiResponse<Void>> deleteServiceItem(@PathVariable Long id) {
        try {
            serviceItemService.deleteServiceItem(id);
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(SERVICE_NOT_EXIST.getMessage())
                            .build());
        } catch (ServiceNotEditableException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(CANT_DELETE_SERVICE.getMessage())
                            .build());
        }
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.<Void>builder()
                        .success(true)
                        .message(SERVICE_DELETE.getMessage())
                        .build());
    }

    @PostMapping("/businesses/services/{id}/modify")
    public ResponseEntity<ApiResponse<Void>> modifyServiceItem(
            @PathVariable Long id,
            @RequestBody ServiceItemRequest request) {
        try {
            serviceItemService.modifyServiceItem(id, request.getName(), request.getDuration());
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(SERVICE_NOT_EXIST.getMessage())
                            .build());
        } catch (ServiceNotEditableException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(ApiResponse.<Void>builder()
                            .success(false)
                            .message(CANT_UPDATE_SERVICE.getMessage())
                            .build());
        }
        return ResponseEntity.status(HttpStatus.OK)
                .body(ApiResponse.<Void>builder()
                        .success(true)
                        .message(SERVICE_UPDATE.getMessage())
                        .build());
    }

    private BusinessDTO toBusinessDTO(BusinessData data) {
        return BusinessDTO.builder()
                .id(data.getId())
                .name(data.getName())
                .category(data.getCategory())
                .phone(data.getPhone())
                .address(data.getAddress())
                .build();
    }

    private ServiceItemDTO toServiceItemDTO(ServiceItem item) {
        return ServiceItemDTO.builder()
                .id(item.getId())
                .name(item.getName())
                .duration(item.getDuration())
                .active(item.getActive())
                .build();
    }

    private ActiveServiceItemDTO toActiveServiceItemDTO(ServiceItem item) {
        return ActiveServiceItemDTO.builder()
                .id(item.getId())
                .name(item.getName())
                .build();
    }
}
