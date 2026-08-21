package com.reservio.service;

import com.reservio.controller.request.SetupBusinessRequest;
import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import com.reservio.exception.NotBusinessAccountException;
import com.reservio.repo.BusinessDataRepo;
import com.reservio.repo.DateAvailableHoursRepo;
import com.reservio.repo.DefaultAvailableHoursRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BusinessDataServiceTest {

    @Mock
    private BusinessDataRepo businessDataRepo;

    @Mock
    private UserDataService userDataService;

    @Mock
    private DefaultAvailableHoursRepo defaultAvailableHoursRepo;

    @Mock
    private DateAvailableHoursRepo dateAvailableHoursRepo;

    private BusinessDataService businessDataService;

    @BeforeEach
    void setUp() {
        businessDataService = new BusinessDataService(
                businessDataRepo,
                userDataService,
                defaultAvailableHoursRepo,
                dateAvailableHoursRepo
        );
    }

    @Test
    void setupCurrentBusinessCreatesAndLinksBusinessData() {
        UserData user = UserData.builder()
                .id(1L)
                .username("line-business")
                .role("ROLE_BUSINESS")
                .build();
        SetupBusinessRequest request = setupRequest();
        when(userDataService.getCurrentUser()).thenReturn(user);
        when(businessDataRepo.save(org.mockito.ArgumentMatchers.any(BusinessData.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        BusinessData result = businessDataService.setupCurrentBusiness(request);

        ArgumentCaptor<BusinessData> captor = ArgumentCaptor.forClass(BusinessData.class);
        verify(businessDataRepo).save(captor.capture());
        BusinessData saved = captor.getValue();
        assertThat(saved.getName()).isEqualTo("Reservio Cafe");
        assertThat(saved.getCategory()).isEqualTo("餐飲服務");
        assertThat(saved.getPhone()).isEqualTo("02-12345678");
        assertThat(saved.getAddress()).isEqualTo("Taipei");
        assertThat(saved.getSlotInterval()).isEqualTo(30);
        assertThat(saved.getUser()).isSameAs(user);
        assertThat(user.getBusinessData()).isSameAs(saved);
        assertThat(result).isSameAs(saved);
    }

    @Test
    void setupCurrentBusinessRejectsNonBusinessAccount() {
        UserData user = UserData.builder()
                .id(2L)
                .username("customer")
                .role("ROLE_USER")
                .build();
        when(userDataService.getCurrentUser()).thenReturn(user);

        SetupBusinessRequest request = setupRequest();

        assertThatThrownBy(() -> businessDataService.setupCurrentBusiness(request))
                .isInstanceOf(NotBusinessAccountException.class);

        verify(businessDataRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void setupCurrentBusinessRejectsAccountThatAlreadyHasBusinessData() {
        BusinessData existing = BusinessData.builder().id(5L).build();
        UserData user = UserData.builder()
                .id(3L)
                .username("existing-business")
                .role("ROLE_BUSINESS")
                .businessData(existing)
                .build();
        when(userDataService.getCurrentUser()).thenReturn(user);

        SetupBusinessRequest request = setupRequest();

        assertThatThrownBy(() -> businessDataService.setupCurrentBusiness(request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("商家資訊已建立");

        verify(businessDataRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    void setupCurrentBusinessRejectsBlankRequiredFields() {
        UserData user = UserData.builder()
                .id(4L)
                .username("line-business")
                .role("ROLE_BUSINESS")
                .build();
        SetupBusinessRequest request = setupRequest();
        request.setBusinessName(" ");
        when(userDataService.getCurrentUser()).thenReturn(user);

        assertThatThrownBy(() -> businessDataService.setupCurrentBusiness(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("商家名稱為必填");

        verify(businessDataRepo, never()).save(org.mockito.ArgumentMatchers.any());
    }

    private SetupBusinessRequest setupRequest() {
        SetupBusinessRequest request = new SetupBusinessRequest();
        request.setBusinessName("Reservio Cafe");
        request.setCategory("餐飲服務");
        request.setPhone("02-12345678");
        request.setAddress("Taipei");
        return request;
    }
}
