package com.reservio.line;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.controller.response.TimeSlotResponse;
import com.reservio.entity.BusinessData;
import com.reservio.entity.ServiceItem;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationSource;
import com.reservio.line.conversation.LineReservationConversation;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.message.LineMessageFactory;
import com.reservio.line.config.LineMessagingProperties;
import com.reservio.line.enums.LineConversationState;
import com.reservio.line.repo.BusinessLineChannelRepo;
import com.reservio.line.repo.LineConversationRepo;
import com.reservio.line.repo.LineCustomerRepo;
import com.reservio.line.repo.LineWebhookEventRepo;
import com.reservio.line.security.LineCredentialCipher;
import com.reservio.line.service.LineAccountLinkService;
import com.reservio.line.service.LineCustomerService;
import com.reservio.line.service.LineMessageRateLimiter;
import com.reservio.line.service.LineMessagingClient;
import com.reservio.line.service.LineRichMenuService;
import com.reservio.line.service.LineSignatureVerifier;
import com.reservio.line.service.LineWebhookIngestionService;
import com.reservio.line.service.LineWebhookWorker;
import com.reservio.repo.BusinessDataRepo;
import com.reservio.repo.ReservationRepo;
import com.reservio.repo.ServiceItemRepo;
import com.reservio.repo.UserDataRepo;
import com.reservio.service.ReservationCommandService;
import com.reservio.service.ReservationNotificationService;
import com.reservio.service.ReservationService;
import com.reservio.service.ReservationTimeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DataJpaTest(showSql = false, properties = {
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
        "spring.jpa.show-sql=false",
        "logging.level.org.hibernate.SQL=OFF"
})
@Transactional
class LineReservationIntegrationTest {

    @Autowired private BusinessDataRepo businessRepo;
    @Autowired private UserDataRepo userRepo;
    @Autowired private ServiceItemRepo serviceRepo;
    @Autowired private ReservationRepo reservationRepo;
    @Autowired private BusinessLineChannelRepo channelRepo;
    @Autowired private LineWebhookEventRepo eventRepo;
    @Autowired private LineConversationRepo conversationRepo;
    @Autowired private LineCustomerRepo customerRepo;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String channelSecret = "integration-secret";
    private BusinessLineChannel channel;
    private LineWebhookIngestionService ingestionService;
    private LineWebhookWorker worker;
    private ReservationTimeService reservationTimeService;
    private int eventSequence;

    @BeforeEach
    void setUp() {
        String encryptionKey = Base64.getEncoder().encodeToString(new byte[32]);
        LineCredentialCipher cipher = new LineCredentialCipher(encryptionKey);
        UserData owner = userRepo.save(UserData.builder()
                .username("integration-owner")
                .email("integration-owner@example.com")
                .password("encoded")
                .role("ROLE_BUSINESS")
                .mustChangePassword(false)
                .build());
        BusinessData business = businessRepo.save(BusinessData.builder()
                .name("Integration Salon")
                .category("美容美髮")
                .phone("0200000000")
                .address("Test Address")
                .slotInterval(30)
                .user(owner)
                .build());
        owner.setBusinessData(business);
        serviceRepo.save(ServiceItem.builder()
                .name("剪髮")
                .duration(60)
                .active(true)
                .business(business)
                .build());
        channel = channelRepo.save(BusinessLineChannel.builder()
                .business(business)
                .channelId("integration-channel")
                .channelSecretCiphertext(cipher.encrypt(channelSecret))
                .accessTokenCiphertext(cipher.encrypt("integration-token"))
                .webhookKey("integration-webhook")
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .build());

        reservationTimeService = mock(ReservationTimeService.class);
        ReservationCommandService reservationCommandService = new ReservationCommandService(
                businessRepo,
                serviceRepo,
                reservationRepo,
                mock(ReservationNotificationService.class),
                reservationTimeService
        );
        LineCustomerService customerService = new LineCustomerService(
                customerRepo,
                userRepo,
                new BCryptPasswordEncoder()
        );
        LineReservationConversation conversation = new LineReservationConversation(
                conversationRepo,
                serviceRepo,
                reservationRepo,
                reservationTimeService,
                reservationCommandService,
                mock(ReservationService.class),
                customerService,
                mock(LineAccountLinkService.class),
                mock(LineRichMenuService.class),
                new LineMessagingProperties(encryptionKey, "https://www.reserv-io.com"),
                new LineMessageFactory()
        );
        ingestionService = new LineWebhookIngestionService(
                channelRepo,
                eventRepo,
                new LineSignatureVerifier(),
                cipher,
                objectMapper
        );
        worker = new LineWebhookWorker(
                eventRepo,
                mock(LineMessagingClient.class),
                conversation,
                new LineMessageRateLimiter(100, 60),
                mock(LineAccountLinkService.class),
                objectMapper
        );
    }

    @Test
    void webhookConversationCreatesLineReservationAndIgnoresRedelivery() throws Exception {
        LocalDate date = LocalDate.now().plusDays(7);
        when(reservationTimeService.isBusinessOpen(date, channel.getBusiness().getId()))
                .thenReturn(true);
        when(reservationTimeService.getTimeSlotsForDate(
                date,
                60,
                channel.getBusiness().getId()
        )).thenReturn(List.of(new TimeSlotResponse("10:00", true)));

        send("立即預約");
        selectService();
        selectDate(date);
        selectTime("10:00");
        send("王小明");
        send("0912345678");
        String confirmationEvent = postbackBody("event-confirm", "reservio.action=confirm_reservation");
        ingestAndProcess(confirmationEvent);
        long eventCount = eventRepo.count();

        ingestionService.ingest(
                channel.getWebhookKey(),
                signature(confirmationEvent),
                confirmationEvent
        );
        worker.processPendingEvents();

        assertThat(reservationRepo.findAll()).singleElement().satisfies(reservation -> {
            assertThat(reservation.getBusiness().getId()).isEqualTo(channel.getBusiness().getId());
            assertThat(reservation.getSource()).isEqualTo(ReservationSource.LINE);
            assertThat(reservation.getReservationDate()).isEqualTo(date);
            assertThat(reservation.getStartTime()).isEqualTo(LocalTime.of(10, 0));
        });
        assertThat(customerRepo.findByBusinessIdAndLineUserId(
                channel.getBusiness().getId(),
                "integration-line-user"
        )).isPresent();
        assertThat(eventRepo.count()).isEqualTo(eventCount);
    }

    @Test
    void closedDateNoSlotsAndRestartKeepConversationConsistent() throws Exception {
        LocalDate closedDate = LocalDate.now().plusDays(8);
        LocalDate fullDate = LocalDate.now().plusDays(9);
        when(reservationTimeService.isBusinessOpen(
                closedDate,
                channel.getBusiness().getId()
        )).thenReturn(false);
        when(reservationTimeService.isBusinessOpen(
                fullDate,
                channel.getBusiness().getId()
        )).thenReturn(true);
        when(reservationTimeService.getTimeSlotsForDate(
                fullDate,
                60,
                channel.getBusiness().getId()
        )).thenReturn(List.of());

        send("立即預約");
        selectService();
        selectDate(closedDate);
        assertThat(currentState()).isEqualTo(LineConversationState.ENTERING_DATE);

        selectDate(fullDate);
        assertThat(currentState()).isEqualTo(LineConversationState.ENTERING_DATE);

        send("重新開始");
        assertThat(currentState()).isEqualTo(LineConversationState.SELECTING_SERVICE);
        assertThat(conversationRepo.findByBusinessIdAndLineUserId(
                channel.getBusiness().getId(),
                "integration-line-user"
        ).orElseThrow().getServiceItemId()).isNull();
        assertThat(reservationRepo.count()).isZero();
    }

    @Test
    void slotCompetitionReturnsConversationToDateSelection() throws Exception {
        LocalDate date = LocalDate.now().plusDays(10);
        when(reservationTimeService.isBusinessOpen(date, channel.getBusiness().getId()))
                .thenReturn(true);
        when(reservationTimeService.getTimeSlotsForDate(
                date,
                60,
                channel.getBusiness().getId()
        )).thenReturn(List.of(new TimeSlotResponse("10:00", true)));

        send("立即預約");
        selectService();
        selectDate(date);
        selectTime("10:00");
        send("王小明");
        send("0912345678");

        when(reservationTimeService.getTimeSlotsForDate(
                date,
                60,
                channel.getBusiness().getId()
        )).thenReturn(List.of(new TimeSlotResponse("10:00", false)));
        postback("reservio.action=confirm_reservation");

        assertThat(currentState()).isEqualTo(LineConversationState.ENTERING_DATE);
        assertThat(reservationRepo.count()).isZero();
    }

    private void send(String text) throws Exception {
        ingestAndProcess(eventBody("event-" + (++eventSequence), text));
    }

    private void postback(String data) throws Exception {
        ingestAndProcess(postbackBody("event-" + (++eventSequence), data));
    }

    private void selectService() throws Exception {
        Long serviceId = serviceRepo
                .findByBusinessIdAndNameAndActiveTrue(channel.getBusiness().getId(), "剪髮")
                .orElseThrow()
                .getId();
        postback("reservio.action=select_service&serviceItemId=" + serviceId);
    }

    private void selectDate(LocalDate date) throws Exception {
        postback("reservio.action=select_date&date=" + date);
    }

    private void selectTime(String time) throws Exception {
        postback("reservio.action=select_time&time=" + time);
    }

    private LineConversationState currentState() {
        return conversationRepo.findByBusinessIdAndLineUserId(
                channel.getBusiness().getId(),
                "integration-line-user"
        ).orElseThrow().getState();
    }

    private void ingestAndProcess(String body) throws Exception {
        ingestionService.ingest(channel.getWebhookKey(), signature(body), body);
        worker.processPendingEvents();
    }

    private String eventBody(String eventId, String text) {
        return """
                {
                  "events":[{
                    "type":"message",
                    "webhookEventId":"%s",
                    "replyToken":"reply-%s",
                    "source":{"type":"user","userId":"integration-line-user"},
                    "message":{"type":"text","text":"%s"}
                  }]
                }
                """.formatted(eventId, eventId, text);
    }

    private String postbackBody(String eventId, String data) {
        return """
                {
                  "events":[{
                    "type":"postback",
                    "webhookEventId":"%s",
                    "replyToken":"reply-%s",
                    "source":{"type":"user","userId":"integration-line-user"},
                    "postback":{"data":"%s"}
                  }]
                }
                """.formatted(eventId, eventId, data);
    }

    private String signature(String body) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(
                channelSecret.getBytes(StandardCharsets.UTF_8),
                "HmacSHA256"
        ));
        return Base64.getEncoder().encodeToString(
                mac.doFinal(body.getBytes(StandardCharsets.UTF_8))
        );
    }
}
