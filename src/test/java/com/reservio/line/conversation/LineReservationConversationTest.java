package com.reservio.line.conversation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.controller.response.TimeSlotResponse;
import com.reservio.entity.BusinessData;
import com.reservio.entity.Reservation;
import com.reservio.entity.ServiceItem;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationSource;
import com.reservio.enums.ReservationStatus;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.entity.LineConversation;
import com.reservio.line.enums.LineConversationState;
import com.reservio.line.message.LineMessageFactory;
import com.reservio.line.message.LineReplyMessage;
import com.reservio.line.repo.LineConversationRepo;
import com.reservio.line.service.LineCustomerService;
import com.reservio.line.service.LineCustomerResolution;
import com.reservio.line.service.LineCustomerPrefill;
import com.reservio.line.service.LineAccountLinkService;
import com.reservio.line.config.LineMessagingProperties;
import com.reservio.line.entity.LineCustomer;
import com.reservio.repo.ReservationRepo;
import com.reservio.repo.ServiceItemRepo;
import com.reservio.service.ReservationCommandService;
import com.reservio.service.ReservationService;
import com.reservio.service.ReservationTimeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LineReservationConversationTest {

    private static final List<String> CANCELLATION_REASONS_FOR_TEST = List.of(
            "時間無法配合", "臨時有事", "已不需要服務", "想改約其他時間");

    @Mock private LineConversationRepo conversationRepo;
    @Mock private ServiceItemRepo serviceItemRepo;
    @Mock private ReservationRepo reservationRepo;
    @Mock private ReservationTimeService reservationTimeService;
    @Mock private ReservationCommandService reservationCommandService;
    @Mock private ReservationService reservationService;
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
                reservationRepo,
                reservationTimeService,
                reservationCommandService,
                reservationService,
                lineCustomerService,
                accountLinkService,
                new LineMessagingProperties("ignored", "https://www.reserv-io.com"),
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
        assertThat(reply.flexContents()).isNotNull();
        assertThat(reply.flexContents().toString())
                .contains("剪髮", "reservio.action=select_service&serviceItemId=20");
    }

    @Test
    void serviceFlexMessageContainsAtMostTwelveServiceButtonsPlusCancel() {
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

        assertThat(reply.flexContents().toString()).contains("服務12", "取消");
        assertThat(reply.flexContents().toString()).doesNotContain("服務13");
    }

    @Test
    void serviceFlexKeepsOptionsSecondaryAndColorsCancelRed() {
        LineConversation existing = conversation(LineConversationState.IDLE);
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
                .thenReturn(Optional.of(existing));
        when(serviceItemRepo.findAllByBusinessIdAndActiveTrue(8L)).thenReturn(List.of(haircut));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "立即預約");

        assertThat(buttonFor(reply, "reservio.action=select_service&serviceItemId=20"))
                .containsEntry("style", "secondary")
                .doesNotContainKey("color");
        assertThat(buttonFor(reply, "reservio.action=cancel"))
                .containsEntry("style", "primary")
                .containsEntry("height", "sm")
                .containsEntry("color", "#9A5F5F");
    }

    @Test
    void selectedServiceMovesToDateInput() {
        LineConversation existing = conversation(LineConversationState.SELECTING_SERVICE);
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findByBusinessIdAndNameAndActiveTrue(8L, "剪髮")).thenReturn(Optional.of(haircut));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        LineReplyMessage reply = conversationService.handle(channel, "line-user", "剪髮");

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_DATE);
        assertThat(existing.getServiceItemId()).isEqualTo(20L);
        assertThat(reply.text()).isEqualTo("想預約哪一天？");
        assertThat(reply.flexContents()).isNotNull();
    }

    @Test
    void servicePostbackReturnsThreeMonthDateCalendar() {
        LineConversation existing = conversation(LineConversationState.SELECTING_SERVICE);
        LocalDate selectable = LocalDate.of(2026, 6, 26);
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        when(reservationTimeService.isBusinessOpen(any(LocalDate.class), eq(8L))).thenReturn(false);
        when(reservationTimeService.isBusinessOpen(selectable, 8L)).thenReturn(true);
        when(reservationTimeService.getTimeSlotsForDate(selectable, 60, 8L))
                .thenReturn(List.of(new TimeSlotResponse("10:00", true)));

        LineReplyMessage reply = conversationService.handlePostback(
                channel,
                "line-user",
                "reservio.action=select_service&serviceItemId=20"
        );

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_DATE);
        assertThat(existing.getServiceItemId()).isEqualTo(20L);
        assertThat(reply.text()).isEqualTo("想預約哪一天？");
        assertThat(reply.flexContents().toString())
                .contains("2026年6月", "2026年7月", "2026年8月", "2026年9月")
                .contains("reservio.action=select_date&date=2026-06-26")
                .doesNotContain("reservio.action=select_date&date=2026-06-25");
    }

    @Test
    void dateCalendarNormalizesFourFiveAndSixWeekMonthsToSixRows() {
        LineReplyMessage reply = calendarReply(Instant.parse("2026-01-31T16:00:00Z"));

        List<Map<String, Object>> bubbles = calendarBubbles(reply);
        assertThat(bubbles).hasSize(4);
        assertThat(bubbles).allSatisfy(bubble -> {
            List<Map<String, Object>> contents = bodyContents(bubble);
            assertThat(contents).hasSize(8);
            assertThat(contents.subList(1, 8)).allSatisfy(row ->
                    assertThat(rowCells(row)).hasSize(7));
        });

        List<Map<String, Object>> februaryContents = bodyContents(bubbles.get(0));
        assertThat(cellLabel(rowCells(februaryContents.get(2)).get(0)).get("text"))
                .isEqualTo("1");
        assertThat(cellLabel(rowCells(februaryContents.get(5)).get(6)).get("text"))
                .isEqualTo("28");
        assertThat(cellLabel(rowCells(februaryContents.get(6)).get(0)).get("text"))
                .isEqualTo(" ");
    }

    @Test
    @SuppressWarnings("unchecked")
    void dateCalendarUsesReadableEqualWidthCells() {
        LineReplyMessage reply = calendarReply(Instant.parse("2026-01-31T16:00:00Z"));
        Map<String, Object> bubble = calendarBubbles(reply).get(0);
        Map<String, Object> body = (Map<String, Object>) bubble.get("body");

        assertThat(bubble).containsEntry("size", "giga");
        assertThat(body)
                .containsEntry("paddingAll", "12px")
                .containsEntry("spacing", "xs");

        List<Map<String, Object>> rows = bodyContents(bubble).subList(1, 8);
        assertThat(rows).allSatisfy(row -> {
            assertThat(row).containsEntry("spacing", "2px");
            assertThat(rowCells(row)).allSatisfy(cell -> assertThat(cell)
                    .containsEntry("type", "box")
                    .containsEntry("layout", "vertical")
                    .containsEntry("paddingAll", "8px")
                    .containsEntry("flex", 1));
        });

        Map<String, Object> weekdayLabel = cellLabel(rowCells(rows.get(0)).get(0));
        assertThat(weekdayLabel)
                .containsEntry("size", "sm")
                .containsEntry("scaling", true)
                .containsEntry("adjustMode", "shrink-to-fit");

        assertThat(cellLabel(dateCellFor(bubble, "1")))
                .containsEntry("size", "md")
                .containsEntry("scaling", true)
                .containsEntry("adjustMode", "shrink-to-fit");
        assertThat(cellLabel(dateCellFor(bubble, "10")))
                .containsEntry("size", "md")
                .containsEntry("scaling", true)
                .containsEntry("adjustMode", "shrink-to-fit");
    }

    @Test
    @SuppressWarnings("unchecked")
    void dateCalendarPreservesPostbackAndStaysWithinLineCarouselLimit() throws Exception {
        when(reservationTimeService.isBusinessOpen(any(LocalDate.class), eq(8L))).thenReturn(true);
        when(reservationTimeService.getTimeSlotsForDate(any(LocalDate.class), eq(60), eq(8L)))
                .thenReturn(List.of(new TimeSlotResponse("10:00", true)));

        LineReplyMessage reply = calendarReply(Instant.parse("2026-01-31T16:00:00Z"));
        Map<String, Object> cell = dateCellFor(calendarBubbles(reply).get(0), "10");
        Map<String, Object> action = (Map<String, Object>) cell.get("action");
        ObjectMapper objectMapper = new ObjectMapper();

        assertThat(action)
                .containsEntry("type", "postback")
                .containsEntry("label", "10")
                .containsEntry("data", "reservio.action=select_date&date=2026-02-10")
                .containsEntry("displayText", "2026-02-10");
        assertThat(objectMapper.writeValueAsBytes(reply.flexContents()).length)
                .isLessThan(50 * 1024);
        Files.createDirectories(Path.of("target"));
        Files.writeString(
                Path.of("target/mac-6-calendar-flex.json"),
                objectMapper.writerWithDefaultPrettyPrinter()
                        .writeValueAsString(reply.flexContents())
        );
    }

    @Test
    void closedDateStaysInDateState() {
        LineConversation existing = conversation(LineConversationState.ENTERING_DATE);
        existing.setServiceItemId(20L);
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "6/29");

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_DATE);
        assertThat(reply.text()).isEqualTo("請從月曆點選日期。");
        assertThat(reply.flexContents()).isNotNull();
    }

    @Test
    void typedDateDoesNotAdvanceToTimeSelection() {
        LineConversation existing = conversation(LineConversationState.ENTERING_DATE);
        existing.setServiceItemId(20L);
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "6/29");

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_DATE);
        assertThat(existing.getReservationDate()).isNull();
        assertThat(reply.flexContents()).isNotNull();
    }

    @Test
    void datePostbackStoresDateAndReturnsTimeFlex() {
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

        LineReplyMessage reply = conversationService.handlePostback(
                channel,
                "line-user",
                "reservio.action=select_date&date=2026-06-29"
        );

        assertThat(existing.getState()).isEqualTo(LineConversationState.SELECTING_TIME);
        assertThat(existing.getReservationDate()).isEqualTo(date);
        assertThat(reply.text()).isEqualTo("請選擇可預約時段。");
        assertThat(reply.flexContents().toString())
                .contains("10:00", "reservio.action=select_time&time=10:00")
                .doesNotContain("10:30");
    }

    @Test
    void timePostbackStoresTimeAndAsksForName() {
        LineConversation existing = conversation(LineConversationState.SELECTING_TIME);
        existing.setServiceItemId(20L);
        existing.setReservationDate(LocalDate.of(2026, 6, 29));
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        when(reservationTimeService.getTimeSlotsForDate(existing.getReservationDate(), 60, 8L))
                .thenReturn(List.of(new TimeSlotResponse("10:00", true)));

        LineReplyMessage reply = conversationService.handlePostback(
                channel,
                "line-user",
                "reservio.action=select_time&time=10:00"
        );

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_NAME);
        assertThat(existing.getStartTime()).isEqualTo(LocalTime.of(10, 0));
        assertThat(reply.text()).isEqualTo("請輸入預約人姓名。");
    }

    @Test
    void timeFlexShowsRestartAndCancelActions() {
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

        LineReplyMessage reply = conversationService.handlePostback(
                channel,
                "line-user",
                "reservio.action=select_date&date=2026-06-29"
        );

        assertThat(reply.flexContents().toString()).contains("重新開始", "取消", "09:00");
        assertThat(buttonFor(reply, "reservio.action=select_time&time=09:00"))
                .containsEntry("style", "secondary")
                .doesNotContainKey("color");
        assertThat(buttonFor(reply, "reservio.action=restart"))
                .containsEntry("style", "primary")
                .containsEntry("color", "#5F7185");
        assertThat(buttonFor(reply, "reservio.action=cancel"))
                .containsEntry("style", "primary")
                .containsEntry("color", "#9A5F5F");
    }

    @Test
    void openDateWithoutAvailableTimesStaysInDateState() {
        LineConversation existing = conversation(LineConversationState.ENTERING_DATE);
        existing.setServiceItemId(20L);
        LocalDate date = LocalDate.of(2026, 6, 29);
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "6/29");

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_DATE);
        assertThat(reply.text()).isEqualTo("請從月曆點選日期。");
        assertThat(reply.flexContents()).isNotNull();
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
        assertThat(phoneReply.flexContents().toString())
                .contains("確認預約", "Reservio Salon", "剪髮", "2026-06-29", "10:00",
                        "王小明", "0912-345-678", "reservio.action=confirm_reservation",
                        "重新開始", "取消");
    }

    @Test
    void confirmationFlexUsesSemanticControlButtonColors() {
        LineConversation existing = completedInputConversation();
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
                .thenReturn(Optional.of(existing));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "無效操作");

        assertThat(buttonFor(reply, "reservio.action=confirm_reservation"))
                .containsEntry("style", "primary")
                .containsEntry("color", "#557A5C");
        assertThat(buttonFor(reply, "reservio.action=restart"))
                .containsEntry("style", "primary")
                .containsEntry("color", "#5F7185");
        assertThat(buttonFor(reply, "reservio.action=cancel"))
                .containsEntry("style", "primary")
                .containsEntry("color", "#9A5F5F");
    }

    @Test
    void linkedCustomerWithCompletePrefillSkipsNameAndPhone() {
        LineConversation existing = selectableTimeConversation();
        when(lineCustomerService.findLinkedPrefill(8L, "line-user"))
                .thenReturn(Optional.of(new LineCustomerPrefill("王小明", "0912345678")));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "10:00");

        assertThat(existing.getState()).isEqualTo(LineConversationState.CONFIRMING);
        assertThat(existing.getCustomerName()).isEqualTo("王小明");
        assertThat(existing.getPhone()).isEqualTo("0912345678");
        assertThat(reply.flexContents().toString())
                .contains("確認預約", "王小明", "0912345678");
    }

    @Test
    void linkedCustomerWithOnlyNameAsksOnlyForPhone() {
        LineConversation existing = selectableTimeConversation();
        when(lineCustomerService.findLinkedPrefill(8L, "line-user"))
                .thenReturn(Optional.of(new LineCustomerPrefill("王小明", null)));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "10:00");

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_PHONE);
        assertThat(existing.getCustomerName()).isEqualTo("王小明");
        assertThat(reply.text()).isEqualTo("請輸入聯絡電話。");
    }

    @Test
    void linkedCustomerWithOnlyPhoneAsksOnlyForNameThenConfirms() {
        LineConversation existing = selectableTimeConversation();
        when(lineCustomerService.findLinkedPrefill(8L, "line-user"))
                .thenReturn(Optional.of(new LineCustomerPrefill(null, "0912345678")));

        LineReplyMessage timeReply = conversationService.handle(channel, "line-user", "10:00");
        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_NAME);
        assertThat(timeReply.text()).isEqualTo("請輸入預約人姓名。");

        LineReplyMessage nameReply = conversationService.handle(channel, "line-user", "王小明");
        assertThat(existing.getState()).isEqualTo(LineConversationState.CONFIRMING);
        assertThat(nameReply.flexContents().toString())
                .contains("確認預約", "王小明", "0912345678");
    }

    @Test
    void linkedCustomerWithoutPrefillUsesOriginalNameThenPhoneFlow() {
        LineConversation existing = selectableTimeConversation();
        when(lineCustomerService.findLinkedPrefill(8L, "line-user"))
                .thenReturn(Optional.of(new LineCustomerPrefill(null, null)));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "10:00");

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_NAME);
        assertThat(reply.text()).isEqualTo("請輸入預約人姓名。");
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
    void confirmPostbackCreatesLineReservation() {
        LineConversation existing = completedInputConversation();
        UserData customer = UserData.builder().id(30L).build();
        LineCustomer lineCustomer = LineCustomer.builder()
                .id(3L)
                .business(business)
                .user(customer)
                .lineUserId("line-user")
                .build();
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        when(lineCustomerService.resolveCustomer(
                business, "line-user", "王小明", "0912-345-678"))
                .thenReturn(new LineCustomerResolution(lineCustomer, customer, false));
        when(accountLinkService.create(channel, lineCustomer)).thenReturn("request-token");
        when(reservationCommandService.createReservation(
                customer, business, haircut, existing.getReservationDate(), existing.getStartTime(),
                ReservationSource.LINE, null, "LINE 預約", "王小明", "0912-345-678"
        )).thenReturn(Reservation.builder().id(99L).build());

        LineReplyMessage reply = conversationService.handlePostback(
                channel,
                "line-user",
                "reservio.action=confirm_reservation"
        );

        assertThat(existing.getState()).isEqualTo(LineConversationState.COMPLETED);
        assertThat(reply.text()).isEqualTo("預約已送出。");
        assertThat(reply.actionLabel()).isEqualTo("綁定 Reservio 帳號");
    }

    @Test
    void myReservationsPostbackReturnsReservationCards() throws Exception {
        LineConversation existing = conversation(LineConversationState.IDLE);
        UserData customer = UserData.builder().id(30L).build();
        LineCustomer lineCustomer = LineCustomer.builder()
                .id(3L)
                .business(business)
                .user(customer)
                .lineUserId("line-user")
                .build();
        Reservation reservation = Reservation.builder()
                .id(99L)
                .business(business)
                .user(customer)
                .title("剪髮")
                .reservationDate(LocalDate.of(2026, 6, 29))
                .startTime(LocalTime.of(10, 0))
                .status(ReservationStatus.PENDING)
                .build();
        Reservation confirmed = Reservation.builder()
                .id(100L)
                .business(business)
                .user(customer)
                .title("染髮")
                .reservationDate(LocalDate.of(2026, 6, 30))
                .startTime(LocalTime.of(14, 5, 30))
                .status(ReservationStatus.CONFIRMED)
                .build();
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
                .thenReturn(Optional.of(existing));
        when(lineCustomerService.findExistingCustomer(business, "line-user"))
                .thenReturn(Optional.of(new LineCustomerResolution(lineCustomer, customer, false)));
        when(reservationRepo.findAllByBusinessAndUserAndReservationDateGreaterThanEqualAndStatusInOrderByReservationDateAscStartTimeAsc(
                eq(business), eq(customer), eq(LocalDate.of(2026, 6, 25)), any()
        )).thenReturn(List.of(reservation, confirmed));

        LineReplyMessage reply = conversationService.handlePostback(
                channel,
                "line-user",
                "reservio.action=my_reservations"
        );

        assertThat(reply.text()).isEqualTo("我的預約");
        assertThat(reply.flexContents().toString())
                .contains("剪髮", "日期：2026-06-29", "時間：10:00", "狀態：待確認")
                .contains("染髮", "日期：2026-06-30", "時間：14:05", "狀態：已確認")
                .doesNotContain("text=我的預約", "項目：");
        assertThat(buttonFor(reply, "reservio.action=cancel_reservation&reservationId=99"))
                .containsEntry("style", "primary")
                .containsEntry("height", "sm")
                .containsEntry("color", "#9A5F5F");
        Files.createDirectories(Path.of("target"));
        Files.writeString(
                Path.of("target/mac-7-reservation-cards-flex.json"),
                new ObjectMapper().writerWithDefaultPrettyPrinter()
                        .writeValueAsString(reply.flexContents()));
    }

    @Test
    void pendingReservationCancellationCompletesImmediately() {
        LineConversation existing = conversation(LineConversationState.IDLE);
        UserData customer = UserData.builder().id(30L).build();
        Reservation reservation = ownedReservation(customer, ReservationStatus.PENDING);
        stubOwnedReservation(existing, customer, reservation);

        LineReplyMessage reply = conversationService.handlePostback(
                channel, "line-user", "reservio.action=cancel_reservation&reservationId=99");

        verify(reservationService).customerCancel(reservation, null, "LINE");
        assertThat(existing.getState()).isEqualTo(LineConversationState.IDLE);
        assertThat(reply.text()).isEqualTo("您已取消「剪髮」的預約。");
    }

    @Test
    void confirmedReservationCancellationRequestsReasonWithFourQuickReplies() {
        LineConversation existing = conversation(LineConversationState.IDLE);
        UserData customer = UserData.builder().id(30L).build();
        Reservation reservation = ownedReservation(customer, ReservationStatus.CONFIRMED);
        stubOwnedReservation(existing, customer, reservation);

        LineReplyMessage reply = conversationService.handlePostback(
                channel, "line-user", "reservio.action=cancel_reservation&reservationId=99");

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_CANCEL_REASON);
        assertThat(existing.getPendingCancellationReservationId()).isEqualTo(99L);
        assertThat(reply.text()).isEqualTo("請問您取消「剪髮」預約的原因？");
        assertThat(reply.options()).containsExactlyElementsOf(CANCELLATION_REASONS_FOR_TEST);
        verify(reservationService, never()).customerCancel(any(), any(), any());
    }

    @Test
    void customReasonSubmitsConfirmedCancellationRequest() {
        LineConversation existing = conversation(LineConversationState.ENTERING_CANCEL_REASON);
        existing.setPendingCancellationReservationId(99L);
        UserData customer = UserData.builder().id(30L).build();
        Reservation reservation = ownedReservation(customer, ReservationStatus.CONFIRMED);
        stubOwnedReservation(existing, customer, reservation);

        LineReplyMessage reply = conversationService.handle(
                channel, "line-user", " 改由其他廠商處理 ");

        verify(reservationService).customerCancel(reservation, "改由其他廠商處理", "LINE");
        assertThat(existing.getState()).isEqualTo(LineConversationState.IDLE);
        assertThat(existing.getPendingCancellationReservationId()).isNull();
        assertThat(reply.text()).isEqualTo(
                "已收到您取消「剪髮」的申請。\n\n商家確認後，將完成取消並另行通知您。");
    }

    @Test
    void blankCancellationReasonKeepsConversationWaiting() {
        LineConversation existing = conversation(LineConversationState.ENTERING_CANCEL_REASON);
        existing.setPendingCancellationReservationId(99L);
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
                .thenReturn(Optional.of(existing));

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "   ");

        assertThat(existing.getState()).isEqualTo(LineConversationState.ENTERING_CANCEL_REASON);
        assertThat(existing.getPendingCancellationReservationId()).isEqualTo(99L);
        assertThat(reply.options()).containsExactlyElementsOf(CANCELLATION_REASONS_FOR_TEST);
        verify(reservationService, never()).customerCancel(any(), any(), any());
    }

    @Test
    void changedReservationStateClearsPendingCancellation() {
        LineConversation existing = conversation(LineConversationState.ENTERING_CANCEL_REASON);
        existing.setPendingCancellationReservationId(99L);
        UserData customer = UserData.builder().id(30L).build();
        Reservation reservation = ownedReservation(customer, ReservationStatus.CANCEL_REQUESTED);
        stubOwnedReservation(existing, customer, reservation);

        LineReplyMessage reply = conversationService.handle(channel, "line-user", "臨時有事");

        assertThat(existing.getState()).isEqualTo(LineConversationState.IDLE);
        assertThat(existing.getPendingCancellationReservationId()).isNull();
        assertThat(reply.text()).contains("預約狀態已變更");
        verify(reservationService, never()).customerCancel(any(), any(), any());
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
        existing.setPendingCancellationReservationId(99L);
        existing.setExpiresAt(LocalDateTime.now(clock).minusSeconds(1));
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.of(existing));

        LineReplyMessage expired = conversationService.handle(channel, "line-user", "0912345678");
        assertThat(existing.getState()).isEqualTo(LineConversationState.IDLE);
        assertThat(existing.getPendingCancellationReservationId()).isNull();
        assertThat(expired.text()).isEqualTo("預約流程已逾時，請點選「立即預約」重新開始。");

        existing.setPendingCancellationReservationId(99L);
        LineReplyMessage cancelled = conversationService.handle(channel, "line-user", "取消");
        assertThat(existing.getState()).isEqualTo(LineConversationState.IDLE);
        assertThat(existing.getPendingCancellationReservationId()).isNull();
        assertThat(cancelled.text()).isEqualTo("已取消目前的預約流程。");
        verify(reservationCommandService, never()).createReservation(
                any(), any(), any(), any(), any(), any(), any(), any(), any(), any()
        );
    }

    private LineReplyMessage calendarReply(Instant instant) {
        conversationService = new LineReservationConversation(
                conversationRepo,
                serviceItemRepo,
                reservationRepo,
                reservationTimeService,
                reservationCommandService,
                reservationService,
                lineCustomerService,
                accountLinkService,
                new LineMessagingProperties("ignored", "https://www.reserv-io.com"),
                new LineMessageFactory(),
                Clock.fixed(instant, ZoneId.of("Asia/Taipei"))
        );
        LineConversation existing = conversation(LineConversationState.SELECTING_SERVICE);
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
                .thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        return conversationService.handlePostback(
                channel,
                "line-user",
                "reservio.action=select_service&serviceItemId=20"
        );
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> calendarBubbles(LineReplyMessage reply) {
        return (List<Map<String, Object>>) reply.flexContents().get("contents");
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> bodyContents(Map<String, Object> bubble) {
        Map<String, Object> body = (Map<String, Object>) bubble.get("body");
        return (List<Map<String, Object>>) body.get("contents");
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> rowCells(Map<String, Object> row) {
        return (List<Map<String, Object>>) row.get("contents");
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> cellLabel(Map<String, Object> cell) {
        return ((List<Map<String, Object>>) cell.get("contents")).get(0);
    }

    private Map<String, Object> dateCellFor(Map<String, Object> bubble, String day) {
        return bodyContents(bubble).stream()
                .skip(2)
                .flatMap(row -> rowCells(row).stream())
                .filter(cell -> day.equals(cellLabel(cell).get("text")))
                .findFirst()
                .orElseThrow();
    }

    private Map<String, Object> buttonFor(LineReplyMessage reply, String postbackData) {
        return findButton(reply.flexContents(), postbackData).orElseThrow();
    }

    @SuppressWarnings("unchecked")
    private Optional<Map<String, Object>> findButton(Object node, String postbackData) {
        if (node instanceof Map<?, ?> map) {
            Object actionValue = map.get("action");
            if ("button".equals(map.get("type"))
                    && actionValue instanceof Map<?, ?> action
                    && postbackData.equals(action.get("data"))) {
                return Optional.of((Map<String, Object>) map);
            }
            for (Object child : map.values()) {
                Optional<Map<String, Object>> match = findButton(child, postbackData);
                if (match.isPresent()) {
                    return match;
                }
            }
        } else if (node instanceof List<?> list) {
            for (Object child : list) {
                Optional<Map<String, Object>> match = findButton(child, postbackData);
                if (match.isPresent()) {
                    return match;
                }
            }
        }
        return Optional.empty();
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

    private Reservation ownedReservation(UserData customer, ReservationStatus status) {
        return Reservation.builder()
                .id(99L)
                .business(business)
                .user(customer)
                .title("剪髮")
                .reservationDate(LocalDate.of(2026, 6, 29))
                .startTime(LocalTime.of(10, 0))
                .status(status)
                .build();
    }

    private void stubOwnedReservation(
            LineConversation conversation, UserData customer, Reservation reservation) {
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
                .thenReturn(Optional.of(conversation));
        when(lineCustomerService.findExistingCustomer(business, "line-user"))
                .thenReturn(Optional.of(new LineCustomerResolution(
                        LineCustomer.builder().id(3L).business(business).user(customer).build(),
                        customer,
                        false
                )));
        when(reservationRepo.findByIdAndBusiness(99L, business)).thenReturn(Optional.of(reservation));
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

    private LineConversation selectableTimeConversation() {
        LineConversation existing = conversation(LineConversationState.SELECTING_TIME);
        existing.setServiceItemId(20L);
        existing.setReservationDate(LocalDate.of(2026, 6, 29));
        when(conversationRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
                .thenReturn(Optional.of(existing));
        when(serviceItemRepo.findById(20L)).thenReturn(Optional.of(haircut));
        when(reservationTimeService.getTimeSlotsForDate(
                existing.getReservationDate(), 60, 8L))
                .thenReturn(List.of(new TimeSlotResponse("10:00", true)));
        return existing;
    }
}
