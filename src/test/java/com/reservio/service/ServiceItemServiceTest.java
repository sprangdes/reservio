package com.reservio.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.ServiceItem;
import com.reservio.entity.UserData;
import com.reservio.repo.ReservationRepo;
import com.reservio.repo.ServiceItemRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceItemServiceTest {

    @Mock
    private ServiceItemRepo serviceItemRepo;

    @Mock
    private ReservationRepo reservationRepo;

    @Mock
    private UserDataService userDataService;

    @Test
    void newServiceIsPersistedAsInactive() throws Exception {
        BusinessData business = BusinessData.builder().id(1L).build();
        UserData user = UserData.builder().businessData(business).build();
        ServiceItemService service = new ServiceItemService(serviceItemRepo, reservationRepo, userDataService);
        when(userDataService.getCurrentUser()).thenReturn(user);
        when(serviceItemRepo.save(any(ServiceItem.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.saveServiceItem("剪髮", 30);

        ArgumentCaptor<ServiceItem> itemCaptor = ArgumentCaptor.forClass(ServiceItem.class);
        verify(serviceItemRepo).save(itemCaptor.capture());
        assertThat(itemCaptor.getValue().getActive()).isFalse();
    }
}
