package com.reservio.line.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.line.repo.LineAccountLinkRepo;
import com.reservio.line.repo.LineCustomerRepo;
import com.reservio.line.repo.BusinessLineChannelRepo;
import com.reservio.line.security.LineAccountLinkTokenService;
import com.reservio.line.security.LineCredentialCipher;
import com.reservio.repo.ReservationRepo;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.web.client.RestClient;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class LineAccountLinkServiceSpringTest {

    @Test
    void springCanConstructServiceWithProductionDependencies() {
        try (AnnotationConfigApplicationContext context =
                     new AnnotationConfigApplicationContext()) {
            context.registerBean(LineAccountLinkRepo.class, () -> mock(LineAccountLinkRepo.class));
            context.registerBean(LineCustomerRepo.class, () -> mock(LineCustomerRepo.class));
            context.registerBean(ReservationRepo.class, () -> mock(ReservationRepo.class));
            context.registerBean(BusinessLineChannelRepo.class,
                    () -> mock(BusinessLineChannelRepo.class));
            context.registerBean(LineRichMenuService.class,
                    () -> mock(LineRichMenuService.class));
            context.registerBean(LineCredentialCipher.class, () -> new LineCredentialCipher(
                    Base64.getEncoder().encodeToString(new byte[32])));
            context.registerBean(LineAccountLinkTokenService.class);
            context.registerBean(LineMessagingClient.class, () -> new LineMessagingClient(
                    RestClient.builder(),
                    context.getBean(LineCredentialCipher.class),
                    new ObjectMapper()));
            context.register(LineAccountLinkService.class);

            context.refresh();

            assertThat(context.getBean(LineAccountLinkService.class)).isNotNull();
        }
    }
}
