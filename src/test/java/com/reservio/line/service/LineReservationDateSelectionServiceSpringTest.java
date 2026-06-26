package com.reservio.line.service;

import com.reservio.line.repo.LineConversationRepo;
import com.reservio.repo.ServiceItemRepo;
import com.reservio.service.ReservationTimeService;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class LineReservationDateSelectionServiceSpringTest {

    @Test
    void springCanConstructServiceWithProductionConstructor() {
        try (AnnotationConfigApplicationContext context =
                     new AnnotationConfigApplicationContext()) {
            context.registerBean(LineReservationDateTokenService.class,
                    () -> mock(LineReservationDateTokenService.class));
            context.registerBean(LineConversationRepo.class,
                    () -> mock(LineConversationRepo.class));
            context.registerBean(ServiceItemRepo.class,
                    () -> mock(ServiceItemRepo.class));
            context.registerBean(ReservationTimeService.class,
                    () -> mock(ReservationTimeService.class));
            context.register(LineReservationDateSelectionService.class);

            context.refresh();

            assertThat(context.getBean(LineReservationDateSelectionService.class)).isNotNull();
        }
    }
}
