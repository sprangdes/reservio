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
import com.reservio.line.service.LineCustomerResolution;
import com.reservio.line.service.LineCustomerPrefill;
import com.reservio.line.service.LineAccountLinkService;
import com.reservio.line.config.LineMessagingProperties;
import com.reservio.repo.ReservationRepo;
import com.reservio.repo.ServiceItemRepo;
import com.reservio.service.ReservationCommandService;
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

    private final LineConversationRepo conversationRepo;
    private final ServiceItemRepo serviceItemRepo;
    private final ReservationRepo reservationRepo;
    private final ReservationTimeService reservationTimeService;
    private final ReservationCommandService reservationCommandService;
    private final LineCustomerService lineCustomerService;
    private final LineAccountLinkService accountLinkService;
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
            LineCustomerService lineCustomerService,
            LineAccountLinkService accountLinkService,
            LineMessagingProperties properties,
            LineMessageFactory messageFactory) {
        this(conversationRepo, serviceItemRepo, reservationRepo, reservationTimeService, reservationCommandService,
                lineCustomerService, accountLinkService, properties, messageFactory,
                Clock.systemDefaultZone());
    }

    LineReservationConversation(
            LineConversationRepo conversationRepo,
            ServiceItemRepo serviceItemRepo,
            ReservationRepo reservationRepo,
            ReservationTimeService reservationTimeService,
            ReservationCommandService reservationCommandService,
            LineCustomerService lineCustomerService,
            LineAccountLinkService accountLinkService,
            LineMessagingProperties properties,
            LineMessageFactory messageFactory,
            Clock clock) {
        this.conversationRepo = conversationRepo;
        this.serviceItemRepo = serviceItemRepo;
        this.reservationRepo = reservationRepo;
        this.reservationTimeService = reservationTimeService;
        this.reservationCommandService = reservationCommandService;
        this.lineCustomerService = lineCustomerService;
        this.accountLinkService = accountLinkService;
        this.properties = properties;
        this.messageFactory = messageFactory;
        this.clock = clock;
    }

    @Transactional
    public LineReplyMessage handle(BusinessLineChannel channel, String lineUserId, String input) {
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
            case ENTERING_DATE -> enterDate(conversation, normalized);
            case SELECTING_TIME -> selectTime(conversation, normalized);
            case ENTERING_NAME -> enterName(conversation, normalized);
            case ENTERING_PHONE -> enterPhone(conversation, normalized);
            case CONFIRMING -> confirm(channel, conversation, normalized);
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
            return handle(channel, lineUserId, START);
        }
        if ("cancel".equals(action)) {
            return handle(channel, lineUserId, CANCEL);
        }
        if ("restart".equals(action)) {
            return handle(channel, lineUserId, RESTART);
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
            case "my_reservations" -> myReservations(conversation);
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
        contents.add(text("想預約什麼項目？", "lg", "bold", "#222222"));
        contents.add(text("請點選下方服務項目。", "sm", "regular", "#666666"));
        services.stream()
                .limit(12)
                .forEach(service -> contents.add(button(
                        service.getName(),
                        "reservio.action=select_service&serviceItemId=" + service.getId()
                )));
        contents.add(controlButton(CANCEL, "reservio.action=cancel", CANCEL_BUTTON_COLOR));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "box");
        body.put("layout", "vertical");
        body.put("spacing", "md");
        body.put("contents", contents);
        return messageFactory.flex("想預約什麼項目？", Map.of(
                "type", "bubble",
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

    private LineReplyMessage enterDate(LineConversation conversation, String input) {
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
                "contents", bubbles
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
                "lg", "bold", "#222222"));
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
            if (currentRow.size() == 7) {
                contents.add(row(currentRow));
                currentRow = new ArrayList<>();
            }
        }
        if (!currentRow.isEmpty()) {
            while (currentRow.size() < 7) {
                currentRow.add(emptyDateCell());
            }
            contents.add(row(currentRow));
        }
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "box");
        body.put("layout", "vertical");
        body.put("spacing", "sm");
        body.put("contents", contents);
        return Map.of("type", "bubble", "body", body);
    }

    private Map<String, Object> weekdayRow() {
        return row(List.of(
                weekday("日"), weekday("一"), weekday("二"), weekday("三"),
                weekday("四"), weekday("五"), weekday("六")
        ));
    }

    private Map<String, Object> weekday(String label) {
        Map<String, Object> node = new LinkedHashMap<>();
        node.put("type", "text");
        node.put("text", label);
        node.put("size", "xs");
        node.put("align", "center");
        node.put("color", "#888888");
        node.put("flex", 1);
        return node;
    }

    private Map<String, Object> row(List<Map<String, Object>> cells) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("type", "box");
        row.put("layout", "horizontal");
        row.put("spacing", "xs");
        row.put("contents", cells);
        return row;
    }

    private Map<String, Object> emptyDateCell() {
        Map<String, Object> cell = new LinkedHashMap<>();
        cell.put("type", "box");
        cell.put("layout", "vertical");
        cell.put("flex", 1);
        cell.put("contents", List.of(text(" ", "sm", "regular", "#BBBBBB")));
        return cell;
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
        Map<String, Object> label = new LinkedHashMap<>();
        label.put("type", "text");
        label.put("text", String.valueOf(date.getDayOfMonth()));
        label.put("size", "sm");
        label.put("align", "center");
        label.put("color", selectable ? "#1DB446" : "#C8C8C8");
        Map<String, Object> cell = new LinkedHashMap<>();
        cell.put("type", "box");
        cell.put("layout", "vertical");
        cell.put("cornerRadius", "md");
        cell.put("paddingAll", "4px");
        cell.put("flex", 1);
        cell.put("contents", List.of(label));
        if (selectable) {
            cell.put("action", Map.of(
                    "type", "postback",
                    "label", String.valueOf(date.getDayOfMonth()),
                    "data", "reservio.action=select_date&date=" + date,
                    "displayText", date.toString()
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
        contents.add(text("請選擇可預約時段。", "lg", "bold", "#222222"));
        availableTimes.stream()
                .limit(24)
                .forEach(time -> contents.add(button(
                        time,
                        "reservio.action=select_time&time=" + time
                )));
        contents.add(controlButton(RESTART, "reservio.action=restart", RESTART_BUTTON_COLOR));
        contents.add(controlButton(CANCEL, "reservio.action=cancel", CANCEL_BUTTON_COLOR));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "box");
        body.put("layout", "vertical");
        body.put("spacing", "md");
        body.put("contents", contents);
        return messageFactory.flex("請選擇可預約時段。", Map.of(
                "type", "bubble",
                "body", body
        ));
    }

    private LineReplyMessage confirmationFlex(String summary) {
        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(text("確認預約", "lg", "bold", "#222222"));
        for (String line : summary.split("\\R")) {
            contents.add(text(line, "sm", "regular", "#444444"));
        }
        contents.add(controlButton(CONFIRM, "reservio.action=confirm_reservation", CONFIRM_BUTTON_COLOR));
        contents.add(controlButton(RESTART, "reservio.action=restart", RESTART_BUTTON_COLOR));
        contents.add(controlButton(CANCEL, "reservio.action=cancel", CANCEL_BUTTON_COLOR));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "box");
        body.put("layout", "vertical");
        body.put("spacing", "md");
        body.put("contents", contents);
        return messageFactory.flex("確認預約", Map.of(
                "type", "bubble",
                "body", body
        ));
    }

    private LineReplyMessage myReservations(LineConversation conversation) {
        return lineCustomerService
                .findExistingCustomer(conversation.getBusiness(), conversation.getLineUserId())
                .map(customer -> reservationCards(reservationRepo
                        .findAllByBusinessAndUserAndReservationDateGreaterThanEqualAndStatusInOrderByReservationDateAscStartTimeAsc(
                                conversation.getBusiness(),
                                customer.reservationUser(),
                                LocalDate.now(clock),
                                List.of(ReservationStatus.PENDING, ReservationStatus.CONFIRMED)
                        )))
                .orElseGet(() -> messageFactory.text("目前找不到你的 LINE 預約紀錄。"));
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
                "contents", bubbles
        ));
    }

    private Map<String, Object> reservationBubble(Reservation reservation) {
        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(text("我的預約", "lg", "bold", "#222222"));
        contents.add(text("項目：" + Objects.requireNonNullElse(reservation.getTitle(), "預約"),
                "sm", "regular", "#444444"));
        contents.add(text("日期：" + reservation.getReservationDate(),
                "sm", "regular", "#444444"));
        contents.add(text("時間：" + reservation.getStartTime(),
                "sm", "regular", "#444444"));
        contents.add(controlButton(
                "取消預約",
                "reservio.action=cancel_reservation&reservationId=" + reservation.getId(),
                CANCEL_BUTTON_COLOR
        ));
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "box");
        body.put("layout", "vertical");
        body.put("spacing", "md");
        body.put("contents", contents);
        return Map.of("type", "bubble", "body", body);
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
        Reservation reservation = reservationRepo
                .findByIdAndBusiness(reservationId, conversation.getBusiness())
                .filter(candidate -> candidate.getUser() != null
                        && candidate.getUser().getId() != null
                        && candidate.getUser().getId().equals(customer.reservationUser().getId()))
                .filter(candidate -> candidate.getStatus() == ReservationStatus.PENDING
                        || candidate.getStatus() == ReservationStatus.CONFIRMED)
                .orElse(null);
        if (reservation == null) {
            return messageFactory.text("找不到可取消的預約。");
        }
        reservation.setStatus(ReservationStatus.CANCELLED);
        reservation.setCancelReason("LINE 使用者取消");
        reservation.setCancelledAt(LocalDateTime.now(clock));
        reservation.setUpdatedAt(LocalDateTime.now(clock));
        reservation.setUpdatedBy("LINE");
        reservationRepo.save(reservation);
        return messageFactory.text("預約已取消。");
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
        if (!input.matches("[0-9+()\\-\\s]{8,20}")) {
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
            log.info(
                    "line_reservation_completed business_id={} event_id={} conversation_state={}",
                    conversation.getBusiness().getId(),
                    eventId(),
                    conversation.getState()
            );
            String successMessage = "預約已送出。";
            if (customerResolution.linked()) {
                return messageFactory.text(successMessage);
            }
            try {
                String requestToken = accountLinkService.create(
                        channel,
                        customerResolution.customer()
                );
                String baseUrl = properties.webhookBaseUrl().replaceAll("/+$", "");
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

    private List<String> availableTimes(LocalDate date, ServiceItem service, Long businessId) {
        return reservationTimeService.getTimeSlotsForDate(date, service.getDuration(), businessId)
                .stream()
                .filter(TimeSlotResponse::isAvailable)
                .map(TimeSlotResponse::getTime)
                .toList();
    }

    private List<String> withActions(List<String> options) {
        List<String> result = new ArrayList<>(options.stream().limit(11).toList());
        result.add(RESTART);
        result.add(CANCEL);
        return result;
    }

    private Map<String, Object> text(String text, String size, String weight, String color) {
        Map<String, Object> node = new LinkedHashMap<>();
        node.put("type", "text");
        node.put("text", text);
        node.put("size", size);
        node.put("weight", weight);
        node.put("color", color);
        node.put("wrap", true);
        return node;
    }

    private Map<String, Object> button(String label, String data) {
        return Map.of(
                "type", "button",
                "style", "secondary",
                "height", "sm",
                "action", Map.of(
                        "type", "postback",
                        "label", label,
                        "data", data,
                        "displayText", label
                )
        );
    }

    private Map<String, Object> controlButton(String label, String data, String color) {
        return Map.of(
                "type", "button",
                "style", "primary",
                "height", "sm",
                "color", color,
                "action", Map.of(
                        "type", "postback",
                        "label", label,
                        "data", data,
                        "displayText", label
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
    }

    private void save(LineConversation conversation) {
        LocalDateTime now = LocalDateTime.now(clock);
        conversation.setUpdatedAt(now);
        conversation.setExpiresAt(now.plusMinutes(30));
        conversationRepo.save(conversation);
        log.info(
                "line_conversation_saved business_id={} event_id={} conversation_state={}",
                conversation.getBusiness().getId(),
                eventId(),
                conversation.getState()
        );
    }

    private String eventId() {
        String eventId = MDC.get("event_id");
        return eventId == null ? "none" : eventId;
    }
}
