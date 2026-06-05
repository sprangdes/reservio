package com.reservio.controller;

import com.reservio.controller.request.SetupBusinessRequest;
import com.reservio.controller.response.ApiResponse;
import com.reservio.controller.response.BusinessResponse;
import com.reservio.entity.BusinessData;
import com.reservio.exception.NotBusinessAccountException;
import com.reservio.service.BusinessCategoryService;
import com.reservio.service.BusinessDataService;
import com.reservio.service.ServiceItemService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BusinessApiControllerTest {

    @Mock
    private BusinessDataService businessDataService;

    @Mock
    private ServiceItemService serviceItemService;

    @Mock
    private BusinessCategoryService businessCategoryService;

    private BusinessApiController controller;

    @BeforeEach
    void setUp() {
        controller = new BusinessApiController(
                businessDataService,
                serviceItemService,
                businessCategoryService
        );
    }

    @Test
    void setupBusinessReturnsCreatedBusiness() {
        SetupBusinessRequest request = new SetupBusinessRequest();
        BusinessData business = BusinessData.builder()
                .id(9L)
                .name("Reservio Cafe")
                .category("餐飲服務")
                .phone("02-12345678")
                .address("Taipei")
                .slotInterval(30)
                .build();
        when(businessDataService.setupCurrentBusiness(request)).thenReturn(business);

        ResponseEntity<ApiResponse<BusinessResponse>> response = controller.setupBusiness(request);

        assertThat(response.getStatusCode().value()).isEqualTo(201);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isTrue();
        assertThat(response.getBody().getData().getId()).isEqualTo(9L);
    }

    @Test
    void setupBusinessReturnsForbiddenForNonBusinessAccount() {
        SetupBusinessRequest request = new SetupBusinessRequest();
        when(businessDataService.setupCurrentBusiness(request))
                .thenThrow(new NotBusinessAccountException("用戶為非商家帳號"));

        ResponseEntity<ApiResponse<BusinessResponse>> response = controller.setupBusiness(request);

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().isSuccess()).isFalse();
    }

    @Test
    void setupBusinessReturnsConflictWhenBusinessAlreadyExists() {
        SetupBusinessRequest request = new SetupBusinessRequest();
        when(businessDataService.setupCurrentBusiness(request))
                .thenThrow(new IllegalStateException("商家資訊已建立"));

        ResponseEntity<ApiResponse<BusinessResponse>> response = controller.setupBusiness(request);

        assertThat(response.getStatusCode().value()).isEqualTo(409);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("商家資訊已建立");
    }

    @Test
    void setupBusinessReturnsBadRequestForInvalidInput() {
        SetupBusinessRequest request = new SetupBusinessRequest();
        when(businessDataService.setupCurrentBusiness(request))
                .thenThrow(new IllegalArgumentException("商家名稱為必填"));

        ResponseEntity<ApiResponse<BusinessResponse>> response = controller.setupBusiness(request);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getMessage()).isEqualTo("商家名稱為必填");
    }
}
