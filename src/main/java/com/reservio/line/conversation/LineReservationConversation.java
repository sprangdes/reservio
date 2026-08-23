package com.reservio.line.conversation;

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
import com.reservio.line.service.LineRichMenuService;
import com.reservio.line.service.LineCustomerResolution;
import com.reservio.line.service.LineCustomerPrefill;
import com.reservio.line.service.LineAccountLinkService;
import com.reservio.line.config.LineMessagingProperties;
import com.reservio.repo.ReservationRepo;
import com.reservio.repo.ServiceItemRepo;
import com.reservio.service.ReservationCommandService;
import com.reservio.service.ReservationService;
import com.reservio.service.ReservationTimeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class LineReservationConversation {

    private static final Logger log =
            LoggerFactory.getLogger(LineReservationConversation.class);
    private static final String START = "立即預約";
    private static final String RESTART = "重新開始";
    private static final String CANCEL = "取消";
    private static final String CONFIRM = "確認";
    private static final String CONFIRM_BUTTON_COLOR = "#557A5C";
    private static final String RESTART_BUTTON_COLOR = "#5F7185";
    private static final String CANCEL_BUTTON_COLOR = "#9A5F5F";
    private static final String PRIMARY_TEXT_COLOR = "#222222";
    private static final String SECONDARY_TEXT_COLOR = "#444444";
    private static final String REGULAR_WEIGHT = "regular";
    private static final String CONTENTS_KEY = "contents";
    private static final String SPACING_KEY = "spacing";
    private static final String BUBBLE_TYPE = "bubble";
    private static final String COLOR_KEY = "color";
    private static final String ACTION_KEY = "action";
    private static final String DISPLAY_TEXT_KEY = "displayText";
    private static final String POSTBACK_TYPE = "postback";
    private static final String CANCEL_ACTION = "reservio.action=cancel";
    private static final String LABEL_KEY = "label";
    private static final String VERTICAL_LAYOUT = "vertical";
    private static final String LAYOUT_KEY = "layout";
    private static final int CALENDAR_COLUMNS = 7;
    private static final int CALENDAR_WEEK_ROWS = 6;
    private static final DateTimeFormatter RESERVATION_TIME_FORMAT =
            DateTimeFormatter.ofPattern("HH:mm");
    private static final List<String> CANCELLATION_REASONS = List.of(
            "時間無法配合", "臨時有事", "已不需要服務", "想改約其他時間");

    private final LineConversationRepo conversationRepo;
    private final ServiceItemRepo serviceItemRepo;
    private final ReservationRepo reservationRepo;
    private final ReservationTimeService reservationTimeService;
    private final ReservationCommandService reservationCommandService;
    private final ReservationService reservationService;
    private final LineCustomerService lineCustomerService;
    private final LineAccountLinkService accountLinkService;
    private final LineRichMenuService richMenuService;
    private final LineMessagingProperties properties;
    private final LineMessageFactory messageFactory;
    private final Clock clock;

    @Autowired
    public LineReservationConversation(
            LineConversationRepo conversationRepo,
            ServiceItemRepo serviceItemRepo,
            ReservationRepo reservationRepo,
            ReservationTimeService reservationTimeService,
            ReservationCommandService reservationCommandService,
            ReservationService reservationService,
            LineCustomerService lineCustomerService,
            LineAccountLinkService accountLinkService,
            LineRichMenuService richMenuService,
            LineMessagingProperties properties,
            LineMessageFactory messageFactory) {
        this(conversationRepo, serviceItemRepo, reservationRepo, reservationTimeService, reservationCommandService,
                reservationService,
                lineCustomerService, accountLinkService, richMenuService, properties, messageFactory,
                Clock.systemDefaultZone());
    }

    LineReservationConversation(
            LineConversationRepo conversationRepo,
            ServiceItemRepo serviceItemRepo,
            ReservationRepo reservationRepo,
            ReservationTimeService reservationTimeService,
            ReservationCommandService reservationCommandService,
            ReservationService reservationService,
            LineCustomerService lineCustomerService,
            LineAccountLinkService accountLinkService,
            LineRichMenuService richMenuService,
            LineMessagingProperties properties,
            LineMessageFactory messageFactory,
            Clock clock) {
        this.conversationRepo = conversationRepo;
        this.serviceItemRepo = serviceItemRepo;
        this.reservationRepo = reservationRepo;
        this.reservationTimeService = reservationTimeService;
        this.reservationCommandService = reservationCommandService;
        this.reservationService = reservationService;
        this.lineCustomerService = lineCustomerService;
        this.accountLinkService = accountLinkService;
        this.richMenuService = richMenuService;
        this.properties = properties;
        this.messageFactory = messageFactory;
        this.clock = clock;
    }

    @Transactional
    public LineReplyMessage handle(BusinessLineChannel channel, String lineUserId, String input) {
        return handleMessage(channel, lineUserId, input);
    }

    private LineReplyMessage handleMessage(BusinessLineChannel channel, String lineUserId, String input) {
        BusinessData business = channel.getBusiness();
        LineConversation conversation = conversationRepo
                .findByBusinessIdAndLineUserId(business.getId(), lineUserId)
                .orElseGet(() -> newConversation(business, lineUserId));
        String normalized = input == null ? "" : input.trim();

        if (CANCEL.equals(normalized)) {
            reset(conversation);
            save(conversation);
            return messageFactory.text("已取消目前的預約流程。");
        }
        if (START.equals(normalized) || RESTART.equals(normalized)) {
            return start(conversation);
        }
        if (isExpired(conversation)) {
            reset(conversation);
            save(conversation);
            return messageFactory.text("預約流程已逾時，請點選「立即預約」重新開始。");
        }

        LineReplyMessage reply = switch (conversation.getState()) {
            case SELECTING_SERVICE -> selectService(conversation, normalized);
            case ENTERING_DATE -> enterDate(conversation);
            case SELECTING_TIME -> selectTime(conversation, normalized);
            case ENTERING_NAME -> enterName(conversation, normalized);
            case ENTERING_PHONE -> enterPhone(conversation, normalized);
            case CONFIRMING -> confirm(channel, conversation, normalized);
            case ENTERING_CANCEL_REASON -> enterCancellationReason(conversation, normalized);
            case IDLE, COMPLETED -> messageFactory.text("請點選「立即預約」開始預約。");
        };
        save(conversation);
        return reply;
    }

    @Transactional
    public LineReplyMessage handlePostback(BusinessLineChannel channel, String lineUserId, String data) {
        LinePostbackData postback = LinePostbackData.parse(data);
        String action = postback.action();
        if ("book".equals(action)) {
            return handleMessage(channel, lineUserId, START);
        }
        if ("cancel".equals(action)) {
            return handleMessage(channel, lineUserId, CANCEL);
        }
        if ("restart".equals(action)) {
            return handleMessage(channel, lineUserId, RESTART);
        }
        BusinessData business = channel.getBusiness();
        LineConversation conversation = conversationRepo
                .findByBusinessIdAndLineUserId(business.getId(), lineUserId)
                .orElseGet(() -> newConversation(business, lineUserId));
        if (isExpired(conversation)) {
            reset(conversation);
            save(conversation);
            return messageFactory.text("預約流程已逾時，請點選「立即預約」重新開始。");
        }
        LineReplyMessage reply = switch (action) {
            case "select_service" -> selectServiceById(conversation, postback.value("serviceItemId"));
            case "select_date" -> selectDate(conversation, postback.value("date"));
            case "select_time" -> selectTime(conversation, postback.value("time"));
            case "confirm_reservation" -> confirm(channel, conversation, CONFIRM);
            case "my_reservations" -> myReservations(channel, conversation);
            case "link_account" -> accountLinkPrompt(
                    channel,
                    lineUserId,
                    lineCustomerService.resolveForAccountLink(business, lineUserId)
            );
            case "cancel_reservation" -> cancelReservation(conversation, postback.value("reservationId"));
            default -> messageFactory.text("此操作已失效，請點選「立即預約」重新開始。");
        };
        save(conversation);
        return reply;
    }

    private LineReplyMessage selectServiceById(LineConversation conversation, String serviceItemId) {
        Long id;
        try {
            id = Long.parseLong(Objects.requireNonNullElse(serviceItemId, ""));
        } catch (NumberFormatException exception) {
            return serviceSelectionFlex(serviceItemRepo
                    .findAllByBusinessIdAndActiveTrue(conversation.getBusiness().getId()));
        }
        ServiceItem service = serviceItemRepo.findById(id)
                .filter(item -> Boolean.TRUE.equals(item.getActive()))
                .filter(item -> item.getBusiness() != null
                        && conversation.getBusiness().getId().equals(item.getBusiness().getId()))
                .orElse(null);
        if (service == null) {
            return serviceSelectionFlex(serviceItemRepo
                    .findAllByBusinessIdAndActiveTrue(conversation.getBusiness().getId()));
        }
        conversation.setServiceItemId(service.getId());
        conversation.setState(LineConversationState.ENTERING_DATE);
        return dateCalendarFlex(conversation, "想預約哪一天？");
    }

    private LineReplyMessage selectDate(LineConversation conversation, String dateText) {
        if (conversation.getState() != LineConversationState.ENTERING_DATE
                && conversation.getState() != LineConversationState.SELECTING_TIME) {
            return messageFactory.text("目前預約流程不在選擇日期階段，請點選「立即預約」重新開始。");
        }
        LocalDate date;
        try {
            date = LocalDate.parse(Objects.requireNonNullElse(dateText, ""));
        } catch (RuntimeException exception) {
            return dateCalendarFlex(conversation, "日期格式錯誤，請重新選擇。");
        }
        LocalDate today = LocalDate.now(clock);
        if (date.isBefore(today) || date.isAfter(today.plusMonths(3))) {
            return dateCalendarFlex(conversation, "日期超出可預約範圍，請重新選擇。");
        }
        ServiceItem service = requiredService(conversation);
        Long businessId = conversation.getBusiness().getId();
        if (!reservationTimeService.isBusinessOpen(date, businessId)) {
            return dateCalendarFlex(conversation, "當日不營業，請選擇其他日期。");
        }
        List<String> available = availableTimes(date, service, businessId);
        if (available.isEmpty()) {
            return dateCalendarFlex(conversation, "當日已無可預約時段，請選擇其他日期。");
        }
        conversation.setReservationDate(date);
        conversation.setStartTime(null);
        conversation.setState(LineConversationState.SELECTING_TIME);
        return timeSelectionFlex(available);
    }

    private LineReplyMessage start(LineConversation conversation) {
        reset(conversation);
        conversation.setState(LineConversationState.SELECTING_SERVICE);
        List<ServiceItem> services = serviceItemRepo
                .findAllByBusinessIdAndActiveTrue(conversation.getBusiness().getId());
        if (services.isEmpty()) {
            conversation.setState(LineConversationState.IDLE);
            save(conversation);
            return messageFactory.text("商家目前沒有開放可預約的服務項目。");
        }
        save(conversation);
        return serviceSelectionFlex(services);
    }

    private LineReplyMessage serviceSelectionFlex(List<ServiceItem> services) {
        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(text("想預約什麼項目？", "lg", "bold", PRIMARY_TEXT_COLOR));
        contents.add(text("請點選下方服務項目。", "sm", REGULAR_WEIGHT, "#666666"));
        services.stream()
                .limit(12)
                .forEach(service -> contents.add(button(
                        service.getName(),
                        "reservio.action=select_service&serviceItemId=" + service.getId()
                )));
        contents.add(controlButton(CANCEL, CANCEL_ACTION, CANCEL_BUTTON_COLOR));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "box");
        body.put(LAYOUT_KEY, VERTICAL_LAYOUT);
        body.put(SPACING_KEY, "md");
        body.put(CONTENTS_KEY, contents);
        return messageFactory.flex("想預約什麼項目？", Map.of(
                "type", BUBBLE_TYPE,
                "body", body
        ));
    }

    private LineReplyMessage selectService(LineConversation conversation, String input) {
        ServiceItem service = serviceItemRepo
                .findByBusinessIdAndNameAndActiveTrue(conversation.getBusiness().getId(), input)
                .orElse(null);
        if (service == null) {
            return serviceSelectionFlex(serviceItemRepo
                    .findAllByBusinessIdAndActiveTrue(conversation.getBusiness().getId()));
        }
        conversation.setServiceItemId(service.getId());
        conversation.setState(LineConversationState.ENTERING_DATE);
        return dateCalendarFlex(conversation, "想預約哪一天？");
    }

    private LineReplyMessage enterDate(LineConversation conversation) {
        return dateCalendarFlex(conversation, "請從月曆點選日期。");
    }

    private LineReplyMessage dateCalendarFlex(LineConversation conversation, String altText) {
        ServiceItem service = requiredService(conversation);
        LocalDate today = LocalDate.now(clock);
        LocalDate maxDate = today.plusMonths(3);
        List<Map<String, Object>> bubbles = new ArrayList<>();
        YearMonth current = YearMonth.from(today);
        YearMonth last = YearMonth.from(maxDate);
        while (!current.isAfter(last)) {
            bubbles.add(monthBubble(
                    current,
                    today,
                    maxDate,
                    service,
                    conversation.getBusiness().getId()
            ));
            current = current.plusMonths(1);
        }
        return messageFactory.flex(altText, Map.of(
                "type", "carousel",
                CONTENTS_KEY, bubbles
        ));
    }

    private Map<String, Object> monthBubble(
            YearMonth month,
            LocalDate today,
            LocalDate maxDate,
            ServiceItem service,
            Long businessId) {
        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(text(month.getYear() + "年" + month.getMonthValue() + "月",
                "lg", "bold", PRIMARY_TEXT_COLOR));
        contents.add(weekdayRow());
        LocalDate first = month.atDay(1);
        int leadingBlanks = first.getDayOfWeek().getValue() % 7;
        List<Map<String, Object>> currentRow = new ArrayList<>();
        for (int i = 0; i < leadingBlanks; i++) {
            currentRow.add(emptyDateCell());
        }
        for (int day = 1; day <= month.lengthOfMonth(); day++) {
            LocalDate date = month.atDay(day);
            currentRow.add(dateCell(date, today, maxDate, service, businessId));
            if (currentRow.size() == CALENDAR_COLUMNS) {
                contents.add(row(currentRow));
                currentRow = new ArrayList<>();
            }
        }
        if (!currentRow.isEmpty()) {
            while (currentRow.size() < CALENDAR_COLUMNS) {
                currentRow.add(emptyDateCell());
            }
            contents.add(row(currentRow));
        }
        int dateRowCount = contents.size() - 2;
        while (dateRowCount < CALENDAR_WEEK_ROWS) {
            List<Map<String, Object>> emptyRow = new ArrayList<>();
            for (int column = 0; column < CALENDAR_COLUMNS; column++) {
                emptyRow.add(emptyDateCell());
            }
            contents.add(row(emptyRow));
            dateRowCount++;
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "box");
        body.put(LAYOUT_KEY, VERTICAL_LAYOUT);
        body.put(SPACING_KEY, "xs");
        body.put("paddingAll", "12px");
        body.put(CONTENTS_KEY, contents);
        return Map.of(
                "type", BUBBLE_TYPE,
                "size", "giga",
                "body", body
        );
    }

    private Map<String, Object> weekdayRow() {
        return row(List.of(
                weekday("日"), weekday("一"), weekday("二"), weekday("三"),
                weekday("四"), weekday("五"), weekday("六")
        ));
    }

    private Map<String, Object> weekday(String label) {
        return calendarCell(calendarText(label, "sm", "bold", "#666666"));
    }

    private Map<String, Object> row(List<Map<String, Object>> cells) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("type", "box");
        row.put(LAYOUT_KEY, "horizontal");
        row.put(SPACING_KEY, "2px");
        row.put(CONTENTS_KEY, cells);
        return row;
    }

    private Map<String, Object> emptyDateCell() {
        return calendarCell(Map.of(
                "type", "text",
                "text", " ",
                "size", "md"
        ));
    }

    private Map<String, Object> calendarCell(Map<String, Object> label) {
        Map<String, Object> cell = new LinkedHashMap<>();
        cell.put("type", "box");
        cell.put(LAYOUT_KEY, VERTICAL_LAYOUT);
        cell.put("paddingAll", "8px");
        cell.put("flex", 1);
        cell.put(CONTENTS_KEY, List.of(label));
        return cell;
    }

    private Map<String, Object> calendarText(
            String value,
            String size,
            String weight,
            String color) {
        Map<String, Object> label = new LinkedHashMap<>();
        label.put("type", "text");
        label.put("text", value);
        label.put("size", size);
        if (!REGULAR_WEIGHT.equals(weight)) {
            label.put("weight", weight);
        }
        label.put("align", "center");
        label.put(COLOR_KEY, color);
        label.put("scaling", true);
        label.put("adjustMode", "shrink-to-fit");
        return label;
    }

    private Map<String, Object> dateCell(
            LocalDate date,
            LocalDate today,
            LocalDate maxDate,
            ServiceItem service,
            Long businessId) {
        boolean selectable = !date.isBefore(today)
                && !date.isAfter(maxDate)
                && reservationTimeService.isBusinessOpen(date, businessId)
                && !availableTimes(date, service, businessId).isEmpty();
        Map<String, Object> cell = calendarCell(calendarText(
                String.valueOf(date.getDayOfMonth()),
                "md",
                REGULAR_WEIGHT,
                selectable ? "#1DB446" : "#C8C8C8"
        ));
        if (selectable) {
            cell.put(ACTION_KEY, Map.of(
                    "type", POSTBACK_TYPE,
                    LABEL_KEY, String.valueOf(date.getDayOfMonth()),
                    "data", "reservio.action=select_date&date=" + date,
                    DISPLAY_TEXT_KEY, date.toString()
            ));
        }
        return cell;
    }

    private LineReplyMessage selectTime(LineConversation conversation, String input) {
        ServiceItem service = requiredService(conversation);
        List<String> available = availableTimes(
                conversation.getReservationDate(), service, conversation.getBusiness().getId());
        if (!available.contains(input)) {
            return timeSelectionFlex(available);
        }
        conversation.setStartTime(LocalTime.parse(input));
        LineCustomerPrefill prefill = lineCustomerService.findLinkedPrefill(
                        conversation.getBusiness().getId(),
                        conversation.getLineUserId())
                .orElse(new LineCustomerPrefill(null, null));
        conversation.setCustomerName(prefill.name());
        conversation.setPhone(prefill.phone());
        if (conversation.getCustomerName() != null && conversation.getPhone() != null) {
            conversation.setState(LineConversationState.CONFIRMING);
            return confirmationMessage(conversation);
        }
        if (conversation.getCustomerName() != null) {
            conversation.setState(LineConversationState.ENTERING_PHONE);
            return messageFactory.text("請輸入聯絡電話。");
        }
        conversation.setState(LineConversationState.ENTERING_NAME);
        return messageFactory.text("請輸入預約人姓名。");
    }

    private LineReplyMessage timeSelectionFlex(List<String> availableTimes) {
        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(text("請選擇可預約時段。", "lg", "bold", PRIMARY_TEXT_COLOR));
        availableTimes.stream()
                .limit(24)
                .forEach(time -> contents.add(button(
                        time,
                        "reservio.action=select_time&time=" + time
                )));
        contents.add(controlButton(RESTART, "reservio.action=restart", RESTART_BUTTON_COLOR));
        contents.add(controlButton(CANCEL, CANCEL_ACTION, CANCEL_BUTTON_COLOR));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "box");
        body.put(LAYOUT_KEY, VERTICAL_LAYOUT);
        body.put(SPACING_KEY, "md");
        body.put(CONTENTS_KEY, contents);
        return messageFactory.flex("請選擇可預約時段。", Map.of(
                "type", BUBBLE_TYPE,
                "body", body
        ));
    }

    private LineReplyMessage confirmationFlex(String summary) {
        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(text("確認預約", "lg", "bold", PRIMARY_TEXT_COLOR));
        for (String line : summary.lines().toList()) {
            contents.add(text(line, "sm", REGULAR_WEIGHT, SECONDARY_TEXT_COLOR));
        }
        contents.add(controlButton(CONFIRM, "reservio.action=confirm_reservation", CONFIRM_BUTTON_COLOR));
        contents.add(controlButton(RESTART, "reservio.action=restart", RESTART_BUTTON_COLOR));
        contents.add(controlButton(CANCEL, CANCEL_ACTION, CANCEL_BUTTON_COLOR));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "box");
        body.put(LAYOUT_KEY, VERTICAL_LAYOUT);
        body.put(SPACING_KEY, "md");
        body.put(CONTENTS_KEY, contents);
        return messageFactory.flex("確認預約", Map.of(
                "type", BUBBLE_TYPE,
                "body", body
        ));
    }

    private LineReplyMessage myReservations(
            BusinessLineChannel channel,
            LineConversation conversation) {
        return lineCustomerService
                .findExistingCustomer(conversation.getBusiness(), conversation.getLineUserId())
                .map(customer -> customer.linked()
                        ? reservationCards(reservationRepo
                                .findAllByBusinessAndUserAndReservationDateGreaterThanEqualAndStatusInOrderByReservationDateAscStartTimeAsc(
                                        conversation.getBusiness(),
                                        customer.reservationUser(),
                                        LocalDate.now(clock),
                                        List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED)
                                ))
                        : accountLinkPrompt(channel, conversation.getLineUserId(), customer))
                .orElseGet(() -> accountLinkPrompt(
                        channel,
                        conversation.getLineUserId(),
                        lineCustomerService.resolveForAccountLink(
                                conversation.getBusiness(),
                                conversation.getLineUserId()
                        )
                ));
    }

    private LineReplyMessage accountLinkPrompt(
            BusinessLineChannel channel,
            String lineUserId,
            LineCustomerResolution customer) {
        if (customer.linked()) {
            richMenuService.assignLinkedMenu(channel, lineUserId);
            return messageFactory.text("LINE 帳號已完成綁定。");
        }
        try {
            String requestToken = accountLinkService.create(channel, customer.customer());
            String baseUrl = withoutTrailingSlashes(properties.webhookBaseUrl());
            return messageFactory.uriButton(
                    "請先綁定 LINE 帳號，再查詢 Reservio 預約。",
                    "使用 LINE 登入並綁定",
                    baseUrl + "/line/account-link?request=" + requestToken
            );
        } catch (RuntimeException exception) {
            log.warn(
                    "line_account_link_prompt_failed business_id={} event_id={} error_type={}",
                    channel.getBusiness().getId(),
                    eventId(),
                    exception.getClass().getSimpleName()
            );
            return messageFactory.text("目前無法建立綁定連結，請稍後再試。");
        }
    }

    private LineReplyMessage reservationCards(List<Reservation> reservations) {
        if (reservations.isEmpty()) {
            return messageFactory.text("目前沒有未來預約。");
        }
        List<Map<String, Object>> bubbles = reservations.stream()
                .limit(10)
                .map(this::reservationBubble)
                .toList();
        return messageFactory.flex("我的預約", Map.of(
                "type", "carousel",
                CONTENTS_KEY, bubbles
        ));
    }

    private Map<String, Object> reservationBubble(Reservation reservation) {
        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(text(reservationTitle(reservation), "lg", "bold", PRIMARY_TEXT_COLOR));
        contents.add(text("日期：" + reservation.getReservationDate(),
                "sm", REGULAR_WEIGHT, SECONDARY_TEXT_COLOR));
        contents.add(text("時間：" + reservation.getStartTime().format(RESERVATION_TIME_FORMAT),
                "sm", REGULAR_WEIGHT, SECONDARY_TEXT_COLOR));
        contents.add(text("狀態：" + reservationStatusLabel(reservation.getStatus()),
                "sm", REGULAR_WEIGHT, SECONDARY_TEXT_COLOR));
        contents.add(controlButton(
                "取消預約",
                "reservio.action=cancel_reservation&reservationId=" + reservation.getId(),
                CANCEL_BUTTON_COLOR
        ));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "box");
        body.put(LAYOUT_KEY, VERTICAL_LAYOUT);
        body.put(SPACING_KEY, "md");
        body.put(CONTENTS_KEY, contents);
        return Map.of("type", BUBBLE_TYPE, "body", body);
    }

    private String reservationTitle(Reservation reservation) {
        return Objects.requireNonNullElse(reservation.getTitle(), "預約");
    }

    private String reservationStatusLabel(ReservationStatus status) {
        return switch (status) {
            case PENDING -> "待確認";
            case CONFIRMED -> "已確認";
            default -> status.name();
        };
    }

    private LineReplyMessage cancelReservation(LineConversation conversation, String reservationIdText) {
        Long reservationId;
        try {
            reservationId = Long.parseLong(Objects.requireNonNullElse(reservationIdText, ""));
        } catch (NumberFormatException exception) {
            return messageFactory.text("取消預約資料不正確，請重新查詢我的預約。");
        }
        LineCustomerResolution customer = lineCustomerService
                .findExistingCustomer(conversation.getBusiness(), conversation.getLineUserId())
                .orElse(null);
        if (customer == null) {
            return messageFactory.text("目前找不到你的 LINE 預約紀錄。");
        }
        Reservation reservation = ownedReservation(
                conversation,
                reservationId,
                customer,
                List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED));
        if (reservation == null) {
            return messageFactory.text("找不到可取消的預約。");
        }
        String title = reservationTitle(reservation);
        if (reservation.getStatus() == ReservationStatus.PENDING) {
            try {
                reservationService.customerCancel(reservation, null, "LINE");
            } catch (IllegalStateException exception) {
                return messageFactory.text("找不到可取消的預約。");
            }
            reset(conversation);
            return messageFactory.text("您已取消「" + title + "」的預約。");
        }
        conversation.setPendingCancellationReservationId(reservation.getId());
        conversation.setState(LineConversationState.ENTERING_CANCEL_REASON);
        return cancellationReasonPrompt(title);
    }

    private LineReplyMessage enterCancellationReason(LineConversation conversation, String reason) {
        if (reason.isBlank()) {
            return messageFactory.quickReply("請輸入取消原因。", CANCELLATION_REASONS);
        }
        LineCustomerResolution customer = lineCustomerService
                .findExistingCustomer(conversation.getBusiness(), conversation.getLineUserId())
                .orElse(null);
        Reservation reservation = customer == null ? null : ownedReservation(
                conversation,
                conversation.getPendingCancellationReservationId(),
                customer,
                List.of(ReservationStatus.CONFIRMED));
        if (reservation == null) {
            reset(conversation);
            return messageFactory.text("預約狀態已變更，請重新查詢我的預約。");
        }
        String title = reservationTitle(reservation);
        try {
            reservationService.customerCancel(reservation, reason, "LINE");
        } catch (IllegalArgumentException | IllegalStateException exception) {
            reset(conversation);
            return messageFactory.text("預約狀態已變更，請重新查詢我的預約。");
        }
        reset(conversation);
        return messageFactory.text("已收到您取消「" + title
                + "」的申請。\n\n商家確認後，將完成取消並另行通知您。");
    }

    private LineReplyMessage cancellationReasonPrompt(String title) {
        return messageFactory.quickReply(
                "請問您取消「" + title + "」預約的原因？",
                CANCELLATION_REASONS);
    }

    private Reservation ownedReservation(
            LineConversation conversation,
            Long reservationId,
            LineCustomerResolution customer,
            List<ReservationStatus> allowedStatuses) {
        if (reservationId == null) {
            return null;
        }
        return reservationRepo.findByIdAndBusiness(reservationId, conversation.getBusiness())
                .filter(candidate -> candidate.getUser() != null)
                .filter(candidate -> candidate.getUser().getId() != null)
                .filter(candidate -> candidate.getUser().getId().equals(customer.reservationUser().getId()))
                .filter(candidate -> allowedStatuses.contains(candidate.getStatus()))
                .orElse(null);
    }

    private LineReplyMessage enterName(LineConversation conversation, String input) {
        if (input.isBlank() || input.length() > 100) {
            return messageFactory.text("姓名不可為空且不可超過 100 個字，請重新輸入。");
        }
        conversation.setCustomerName(input);
        if (conversation.getPhone() != null && !conversation.getPhone().isBlank()) {
            conversation.setState(LineConversationState.CONFIRMING);
            return confirmationMessage(conversation);
        }
        conversation.setState(LineConversationState.ENTERING_PHONE);
        return messageFactory.text("請輸入聯絡電話。");
    }

    private LineReplyMessage enterPhone(LineConversation conversation, String input) {
        if (!isValidPhone(input)) {
            return messageFactory.text("電話格式錯誤，請輸入 8 至 20 位數字或常用符號。");
        }
        conversation.setPhone(input);
        conversation.setState(LineConversationState.CONFIRMING);
        return confirmationMessage(conversation);
    }

    private LineReplyMessage confirmationMessage(LineConversation conversation) {
        ServiceItem service = requiredService(conversation);
        String summary = """
                請確認預約資訊：
                商家：%s
                項目：%s
                日期：%s
                時間：%s
                姓名：%s
                電話：%s
                """.formatted(
                conversation.getBusiness().getName(),
                service.getName(),
                conversation.getReservationDate(),
                conversation.getStartTime(),
                conversation.getCustomerName(),
                conversation.getPhone()
        ).trim();
        return confirmationFlex(summary);
    }

    private boolean isValidPhone(String input) {
        if (input.length() < 8 || input.length() > 20) {
            return false;
        }
        for (int index = 0; index < input.length(); index++) {
            char character = input.charAt(index);
            boolean asciiDigit = character >= '0' && character <= '9';
            if (!asciiDigit
                    && character != '+'
                    && character != '('
                    && character != ')'
                    && character != '-'
                    && !isAsciiRegexWhitespace(character)) {
                return false;
            }
        }
        return true;
    }

    private boolean isAsciiRegexWhitespace(char character) {
        return character == ' '
                || character == '\t'
                || character == '\n'
                || character == '\u000B'
                || character == '\f'
                || character == '\r';
    }

    private LineReplyMessage confirm(
            BusinessLineChannel channel,
            LineConversation conversation,
            String input) {
        if (!CONFIRM.equals(input)) {
            return confirmationFlex("請選擇確認、重新開始或取消。");
        }
        ServiceItem service = requiredService(conversation);
        LineCustomerResolution customerResolution = lineCustomerService.resolveCustomer(
                conversation.getBusiness(),
                conversation.getLineUserId(),
                conversation.getCustomerName(),
                conversation.getPhone()
        );
        UserData customer = customerResolution.reservationUser();
        try {
            reservationCommandService.createReservation(
                    customer,
                    conversation.getBusiness(),
                    service,
                    conversation.getReservationDate(),
                    conversation.getStartTime(),
                    ReservationSource.LINE,
                    null,
                    "LINE 預約",
                    conversation.getCustomerName(),
                    conversation.getPhone()
            );
            conversation.setState(LineConversationState.COMPLETED);
            if (log.isInfoEnabled()) {
                log.info(
                        "line_reservation_completed business_id={} event_id={} conversation_state={}",
                        conversation.getBusiness().getId(),
                        eventId(),
                        conversation.getState()
                );
            }
            String successMessage = "預約已送出。";
            if (customerResolution.linked()) {
                return messageFactory.text(successMessage);
            }
            return accountLinkButtonAfterReservation(
                    channel, conversation, customerResolution, successMessage);
        } catch (IllegalStateException exception) {
            conversation.setState(LineConversationState.ENTERING_DATE);
            conversation.setReservationDate(null);
            conversation.setStartTime(null);
            log.warn(
                    "line_reservation_conflict business_id={} event_id={} conversation_state={} error_type={}",
                    conversation.getBusiness().getId(),
                    eventId(),
                    conversation.getState(),
                    exception.getClass().getSimpleName()
            );
            return messageFactory.text("此時段剛被預約，請重新輸入想預約的日期。");
        }
    }

    private LineReplyMessage accountLinkButtonAfterReservation(
            BusinessLineChannel channel,
            LineConversation conversation,
            LineCustomerResolution customerResolution,
            String successMessage) {
        try {
            String requestToken = accountLinkService.create(
                    channel,
                    customerResolution.customer()
            );
            String baseUrl = withoutTrailingSlashes(properties.webhookBaseUrl());
            return messageFactory.uriButton(
                    successMessage,
                    "綁定 Reservio 帳號",
                    baseUrl + "/line/account-link?request=" + requestToken
            );
        } catch (RuntimeException exception) {
            log.warn(
                    "line_account_link_prompt_failed business_id={} event_id={} error_type={}",
                    conversation.getBusiness().getId(),
                    eventId(),
                    exception.getClass().getSimpleName()
            );
            return messageFactory.text(successMessage);
        }
    }

    private String withoutTrailingSlashes(String value) {
        int end = value.length();
        while (end > 0 && value.charAt(end - 1) == '/') {
            end--;
        }
        return value.substring(0, end);
    }

    private List<String> availableTimes(LocalDate date, ServiceItem service, Long businessId) {
        return reservationTimeService.getTimeSlotsForDate(date, service.getDuration(), businessId)
                .stream()
                .filter(TimeSlotResponse::isAvailable)
                .map(TimeSlotResponse::getTime)
                .toList();
    }

    private Map<String, Object> text(String text, String size, String weight, String color) {
        Map<String, Object> node = new LinkedHashMap<>();
        node.put("type", "text");
        node.put("text", text);
        node.put("size", size);
        node.put("weight", weight);
        node.put(COLOR_KEY, color);
        node.put("wrap", true);
        return node;
    }

    private Map<String, Object> button(String label, String data) {
        return Map.of(
                "type", "button",
                "style", "secondary",
                "height", "sm",
                ACTION_KEY, Map.of(
                        "type", POSTBACK_TYPE,
                        LABEL_KEY, label,
                        "data", data,
                        DISPLAY_TEXT_KEY, label
                )
        );
    }

    private Map<String, Object> controlButton(String label, String data, String color) {
        return Map.of(
                "type", "button",
                "style", "primary",
                "height", "sm",
                COLOR_KEY, color,
                ACTION_KEY, Map.of(
                        "type", POSTBACK_TYPE,
                        LABEL_KEY, label,
                        "data", data,
                        DISPLAY_TEXT_KEY, label
                )
        );
    }

    private ServiceItem requiredService(LineConversation conversation) {
        return serviceItemRepo.findById(conversation.getServiceItemId())
                .filter(item -> Boolean.TRUE.equals(item.getActive()))
                .filter(item -> item.getBusiness() != null
                        && conversation.getBusiness().getId().equals(item.getBusiness().getId()))
                .orElseThrow(() -> new IllegalStateException("服務項目目前無法預約"));
    }

    private LineConversation newConversation(BusinessData business, String lineUserId) {
        LocalDateTime now = LocalDateTime.now(clock);
        return LineConversation.builder()
                .business(business)
                .lineUserId(lineUserId)
                .state(LineConversationState.IDLE)
                .updatedAt(now)
                .expiresAt(now.plusMinutes(30))
                .build();
    }

    private boolean isExpired(LineConversation conversation) {
        return conversation.getExpiresAt() != null
                && !conversation.getExpiresAt().isAfter(LocalDateTime.now(clock));
    }

    private void reset(LineConversation conversation) {
        conversation.setState(LineConversationState.IDLE);
        conversation.setServiceItemId(null);
        conversation.setReservationDate(null);
        conversation.setStartTime(null);
        conversation.setCustomerName(null);
        conversation.setPhone(null);
        conversation.setPendingCancellationReservationId(null);
    }

    private void save(LineConversation conversation) {
        LocalDateTime now = LocalDateTime.now(clock);
        conversation.setUpdatedAt(now);
        conversation.setExpiresAt(now.plusMinutes(30));
        conversationRepo.save(conversation);
        if (log.isInfoEnabled()) {
            log.info(
                    "line_conversation_saved business_id={} event_id={} conversation_state={}",
                    conversation.getBusiness().getId(),
                    eventId(),
                    conversation.getState()
            );
        }
    }

    private String eventId() {
        String eventId = MDC.get("event_id");
        return eventId == null ? "none" : eventId;
    }
}
