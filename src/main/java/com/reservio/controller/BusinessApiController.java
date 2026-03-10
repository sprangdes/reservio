package com.reservio.controller;

import com.reservio.dto.*;
import com.reservio.entity.BusinessData;
import com.reservio.entity.ServiceItem;
import com.reservio.entity.UserData;
import com.reservio.service.BusinessDataService;
import com.reservio.service.ServiceItemService;
import com.reservio.service.UserDataService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
                .message("OK")
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
                .message("OK")
                .data(services)
                .build());
    }

    @PostMapping("/businesses/services")
    public ResponseEntity<ApiResponse<ServiceItemDTO>> addServiceItem(@RequestBody ServiceItemCreateRequest request) {
        UserData currentUser = userDataService.getCurrentUser();
        if (currentUser.getBusinessData() == null) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(ApiResponse.<ServiceItemDTO>builder()
                            .success(false)
                            .message("非商家帳號無法新增服務")
                            .build());
        }
        ServiceItem item = serviceItemService.saveServiceItem(currentUser.getBusinessData(), request.getName(), request.getDuration());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.<ServiceItemDTO>builder()
                        .success(true)
                        .message("服務項目新增成功")
                        .data(toServiceItemDTO(item))
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
                .build();
    }
}
