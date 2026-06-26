package com.reservio.line.conversation;

import com.reservio.controller.response.TimeSlotResponse;
import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.ServiceItem;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationSource;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.entity.LineConversation;
import com.reservio.line.enums.LineConversationState;
import com.reservio.line.message.LineMessageFactory;
import com.reservio.line.message.LineReplyMessage;
import com.reservio.line.repo.LineConversationRepo;
import com.reservio.line.service.LineCustomerService;
import com.reservio.line.service.LineCustomerResolution;
import com.reservio.line.service.LineAccountLinkService;
import com.reservio.line.config.LineMessagingProperties;
import com.reservio.line.entity.LineCustomer;
import com.reservio.repo.ServiceItemRepo;
import com.reservio.service.ReservationCommandService;
import com.reservio.service.ReservationTimeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LineReservationConversationTest {

    @Mock private LineConversationRepo conversationRepo;
    @Mock private ServiceItemRepo serviceItemRepo;
    @Mock private ReservationTimeService reservationTimeService;
    @Mock private ReservationCommandService reservationCommandService;
    @Mock private LineCustomerService lineCustomerService;
    @Mock private LineAccountLinkService accountLinkService;

    private final Clock clock = Clock.fixed(
            Instant.parse("2026-06-25T01:00:00Z"),
            ZoneId.of("Asia/Taipei")
    );
    private LineReservationConversation conversationService;
    private BusinessData business;
    private BusinessLineChannel channel;
    private ServiceItem haircut;

    @BeforeEach
    void setUp() {
        conversationService = new LineReservationConversation(
                conversationRepo,
                serviceItemRepo,
                reservationTimeService,
                reservationCommandService,
                lineCustomerService,
                accountLinkService,
                new LineMessagingProperties("ignored", "https://www.reserv-io.com"),
                new LineDateParser(clock),
                new LineMessageFactory(),
                clock
        );
        business = BusinessData.builder().id(8L).name("Reservio Salon").build();
        channel = BusinessLineChannel.builder().id(4L).business(business).build();
        haircut = ServiceItem.builder()
                .id(20L)
                .business(business)
                .name("剪髮")
                .duration(60)
                .active(true)
                .build();
    }

    @Test
    void immediateReservationStartsOrResetsConversationWithServices() {
        LineConversation existing = conversation(LineConversationState.ENTERING_PHONE);
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findAllByBusinessIdAndActiveTrue(8L)).thenReturn(List.of(haircut));
        when(conversationRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "立即預約");

        assertThat(existing.getState()).isEqualTo(LineConversationState.SELECTING_SERVICE);
        assertThat(existing.getServiceItemId()).isNull();
        assertThat(reply.text()).isEqualTo("想預約什麼項目？");
        assertThat(reply.options()).containsExactly("剪髮", "取消");
    }

    @Test
    void serviceQuickRepliesKeepCancelActionWithinLineLimit() {
        LineConversation existing = conversation(LineConversationState.IDLE);
        List<ServiceItem> services = IntStream.rangeClosed(1, 15)
                .mapToObj(index -> ServiceItem.builder()
                        .id((long) index)
                        .business(business)
                        .name("服務" + index)
                        .duration(30)
                        .active(true)
                        .build())
                .toList();
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findAllByBusinessIdAndActiveTrue(8L)).thenReturn(services);

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "立即預約");

        assertThat(reply.options()).hasSize(13);
        assertThat(reply.options()).endsWith("取消");
    }

    @Test
    void selectedServiceMovesToDateInput() {
        LineConversation existing = conversation(LineConversationState.SELECTING_SERVICE);
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findByBusinessIdAndNameAndActiveTrue(8L, "剪髮")).thenReturn(Optional.of(haircut));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "剪髮");

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_DATE);
        assertThat(existing.getServiceItemId()).isEqualTo(20L);
        assertThat(reply.text()).contains("想預約哪一天");
    }

    @Test
    void closedDateStaysInDateState() {
        LineConversation existing = conversation(LineConversationState.ENTERING_DATE);
        existing.setServiceItemId(20L);
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        when(reservationTimeService.isBusinessOpen(LocalDate.of(2026, 6, 29), 8L)).thenReturn(false);

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "6/29");

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_DATE);
        assertThat(reply.text()).isEqualTo("當日不營業，請選擇其他日期。");
    }

    @Test
    void availableDateShowsAvailableTimes() {
        LineConversation existing = conversation(LineConversationState.ENTERING_DATE);
        existing.setServiceItemId(20L);
        LocalDate date = LocalDate.of(2026, 6, 29);
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        when(reservationTimeService.isBusinessOpen(date, 8L)).thenReturn(true);
        when(reservationTimeService.getTimeSlotsForDate(date, 60, 8L))
                .thenReturn(List.of(
                        new TimeSlotResponse("10:00", true),
                        new TimeSlotResponse("10:30", false)
                ));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "6/29");

        assertThat(existing.getState()).isEqualTo(LineConversationState.SELECTING_TIME);
        assertThat(existing.getReservationDate()).isEqualTo(date);
        assertThat(reply.options()).containsExactly("10:00", "重新開始", "取消");
    }

    @Test
    void timeQuickRepliesKeepRestartAndCancelActionsWithinLineLimit() {
        LineConversation existing = conversation(LineConversationState.ENTERING_DATE);
        existing.setServiceItemId(20L);
        LocalDate date = LocalDate.of(2026, 6, 29);
        List<TimeSlotResponse> slots = IntStream.range(0, 15)
                .mapToObj(index -> new TimeSlotResponse(
                        LocalTime.of(9, 0).plusMinutes(index * 30L).toString(),
                        true))
                .toList();
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        when(reservationTimeService.isBusinessOpen(date, 8L)).thenReturn(true);
        when(reservationTimeService.getTimeSlotsForDate(date, 60, 8L)).thenReturn(slots);

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "6/29");

        assertThat(reply.options()).hasSize(13);
        assertThat(reply.options()).endsWith("重新開始", "取消");
    }

    @Test
    void openDateWithoutAvailableTimesStaysInDateState() {
        LineConversation existing = conversation(LineConversationState.ENTERING_DATE);
        existing.setServiceItemId(20L);
        LocalDate date = LocalDate.of(2026, 6, 29);
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        when(reservationTimeService.isBusinessOpen(date, 8L)).thenReturn(true);
        when(reservationTimeService.getTimeSlotsForDate(date, 60, 8L)).thenReturn(List.of());

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "6/29");

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_DATE);
        assertThat(reply.text()).isEqualTo("當日已無可預約時段，請選擇其他日期。");
    }

    @Test
    void timeNameAndPhoneProgressToConfirmation() {
        LineConversation existing = conversation(LineConversationState.SELECTING_TIME);
        existing.setServiceItemId(20L);
        existing.setReservationDate(LocalDate.of(2026, 6, 29));
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        when(reservationTimeService.getTimeSlotsForDate(existing.getReservationDate(), 60, 8L))
                .thenReturn(List.of(new TimeSlotResponse("10:00", true)));

        LineReplyMessage timeReply = conversationService.handle(channel, "line-user", "10:00");
        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_NAME);
        assertThat(timeReply.text()).isEqualTo("請輸入預約人姓名。");

        LineReplyMessage nameReply = conversationService.handle(channel, "line-user", "王小明");
        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_PHONE);
        assertThat(nameReply.text()).isEqualTo("請輸入聯絡電話。");

        LineReplyMessage phoneReply = conversationService.handle(channel, "line-user", "0912-345-678");
        assertThat(existing.getState()).isEqualTo(LineConversationState.CONFIRMING);
        assertThat(phoneReply.text()).contains("Reservio Salon", "剪髮", "2026-06-29", "10:00", "王小明", "0912-345-678");
        assertThat(phoneReply.options()).containsExactly("確認", "重新開始", "取消");
    }

    @Test
    void confirmCreatesLineReservationWithoutLogin() {
        LineConversation existing = completedInputConversation();
        UserData customer = UserData.builder().id(30L).build();
        LineCustomer lineCustomer = LineCustomer.builder()
                .id(3L)
                .business(business)
                .user(customer)
                .lineUserId("line-user")
                .build();
        Reservation saved = Reservation.builder().id(99L).build();
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        when(lineCustomerService.resolveCustomer(
                business, "line-user", "王小明", "0912-345-678"))
                .thenReturn(new LineCustomerResolution(lineCustomer, customer, false));
        when(accountLinkService.create(channel, lineCustomer)).thenReturn("request-token");
        when(reservationCommandService.createReservation(
                customer, business, haircut, existing.getReservationDate(), existing.getStartTime(),
                ReservationSource.LINE, null, "LINE 預約", "王小明", "0912-345-678"
        )).thenReturn(saved);

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "確認");

        assertThat(existing.getState()).isEqualTo(LineConversationState.COMPLETED);
        assertThat(reply.text()).isEqualTo("預約已送出。");
        assertThat(reply.text()).doesNotContain("預約編號", "99");
        assertThat(reply.actionLabel()).isEqualTo("綁定 Reservio 帳號");
        assertThat(reply.actionUri()).isEqualTo(
                "https://www.reserv-io.com/line/account-link?request=request-token");
    }

    @Test
    void linkedCustomerDoesNotReceiveAccountLinkPrompt() {
        LineConversation existing = completedInputConversation();
        UserData customer = UserData.builder().id(40L).build();
        LineCustomer lineCustomer = LineCustomer.builder()
                .id(3L)
                .business(business)
                .user(UserData.builder().id(30L).build())
                .linkedUser(customer)
                .lineUserId("line-user")
                .build();
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
                .thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        when(lineCustomerService.resolveCustomer(
                business, "line-user", "王小明", "0912-345-678"))
                .thenReturn(new LineCustomerResolution(lineCustomer, customer, true));
        when(reservationCommandService.createReservation(
                customer, business, haircut, existing.getReservationDate(), existing.getStartTime(),
                ReservationSource.LINE, null, "LINE 預約", "王小明", "0912-345-678"
        )).thenReturn(Reservation.builder().id(100L).build());

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "確認");

        assertThat(reply.text()).isEqualTo("預約已送出。");
        assertThat(reply.text()).doesNotContain("預約編號", "100");
        assertThat(reply.actionUri()).isNull();
        verify(accountLinkService, never()).create(any(), any());
    }

    @Test
    void invalidPhoneDoesNotAdvanceState() {
        LineConversation existing = conversation(LineConversationState.ENTERING_PHONE);
        existing.setServiceItemId(20L);
        existing.setReservationDate(LocalDate.of(2026, 6, 29));
        existing.setStartTime(LocalTime.of(10, 0));
        existing.setCustomerName("王小明");
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "abc");

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_PHONE);
        assertThat(reply.text()).contains("電話格式錯誤");
    }

    @Test
    void occupiedSlotAtConfirmationReturnsToDateSelection() {
        LineConversation existing = completedInputConversation();
        UserData customer = UserData.builder().id(30L).build();
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        when(lineCustomerService.resolveCustomer(any(), any(), any(), any()))
                .thenReturn(new LineCustomerResolution(
                        LineCustomer.builder().user(customer).build(),
                        customer,
                        false
                ));
        when(reservationCommandService.createReservation(
                any(), any(), any(), any(), any(), any(), any(), any(), any(), any()
        )).thenThrow(new IllegalStateException("該時段已被預約"));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "確認");

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_DATE);
        assertThat(existing.getStartTime()).isNull();
        assertThat(reply.text()).contains("時段剛被預約");
    }

    @Test
    void cancelAndExpiredConversationDoNotContinueOldState() {
        LineConversation existing = conversation(LineConversationState.ENTERING_PHONE);
        existing.setExpiresAt(LocalDateTime.now(clock).minusSeconds(1));
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));

        LineReplyMessage expired = conversationService.handle(channel, "line-user", "0912345678");
        assertThat(existing.getState()).isEqualTo(LineConversationState.IDLE);
        assertThat(expired.text()).isEqualTo("預約流程已逾時，請點選「立即預約」重新開始。");

        LineReplyMessage cancelled = conversationService.handle(channel, "line-user", "取消");
        assertThat(existing.getState()).isEqualTo(LineConversationState.IDLE);
        assertThat(cancelled.text()).isEqualTo("已取消目前的預約流程。");
        verify(reservationCommandService, never()).createReservation(
                any(), any(), any(), any(), any(), any(), any(), any(), any(), any()
        );
    }

    private LineConversation conversation(LineConversationState state) {
        return LineConversation.builder()
                .id(1L)
                .business(business)
                .lineUserId("line-user")
                .state(state)
                .updatedAt(LocalDateTime.now(clock))
                .expiresAt(LocalDateTime.now(clock).plusMinutes(30))
                .build();
    }

    private LineConversation completedInputConversation() {
        LineConversation existing = conversation(LineConversationState.CONFIRMING);
        existing.setServiceItemId(20L);
        existing.setReservationDate(LocalDate.of(2026, 6, 29));
        existing.setStartTime(LocalTime.of(10, 0));
        existing.setCustomerName("王小明");
        existing.setPhone("0912-345-678");
        return existing;
    }
}
