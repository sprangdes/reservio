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
import java.util.ArrayList;
import java.util.List;

@Service
public class LineReservationConversation {

    private static final Logger log =
            LoggerFactory.getLogger(LineReservationConversation.class);
    private static final String START = "立即預約";
    private static final String RESTART = "重新開始";
    private static final String CANCEL = "取消";
    private static final String CONFIRM = "確認";

    private final LineConversationRepo conversationRepo;
    private final ServiceItemRepo serviceItemRepo;
    private final ReservationTimeService reservationTimeService;
    private final ReservationCommandService reservationCommandService;
    private final LineCustomerService lineCustomerService;
    private final LineAccountLinkService accountLinkService;
    private final LineMessagingProperties properties;
    private final LineDateParser dateParser;
    private final LineMessageFactory messageFactory;
    private final Clock clock;

    @Autowired
    public LineReservationConversation(
            LineConversationRepo conversationRepo,
            ServiceItemRepo serviceItemRepo,
            ReservationTimeService reservationTimeService,
            ReservationCommandService reservationCommandService,
            LineCustomerService lineCustomerService,
            LineAccountLinkService accountLinkService,
            LineMessagingProperties properties,
            LineDateParser dateParser,
            LineMessageFactory messageFactory) {
        this(conversationRepo, serviceItemRepo, reservationTimeService, reservationCommandService,
                lineCustomerService, accountLinkService, properties, dateParser, messageFactory,
                Clock.systemDefaultZone());
    }

    LineReservationConversation(
            LineConversationRepo conversationRepo,
            ServiceItemRepo serviceItemRepo,
            ReservationTimeService reservationTimeService,
            ReservationCommandService reservationCommandService,
            LineCustomerService lineCustomerService,
            LineAccountLinkService accountLinkService,
            LineMessagingProperties properties,
            LineDateParser dateParser,
            LineMessageFactory messageFactory,
            Clock clock) {
        this.conversationRepo = conversationRepo;
        this.serviceItemRepo = serviceItemRepo;
        this.reservationTimeService = reservationTimeService;
        this.reservationCommandService = reservationCommandService;
        this.lineCustomerService = lineCustomerService;
        this.accountLinkService = accountLinkService;
        this.properties = properties;
        this.dateParser = dateParser;
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

    private LineReplyMessage start(LineConversation conversation) {
        reset(conversation);
        conversation.setState(LineConversationState.SELECTING_SERVICE);
        List<String> services = serviceItemRepo
                .findAllByBusinessIdAndActiveTrue(conversation.getBusiness().getId())
                .stream()
                .map(ServiceItem::getName)
                .toList();
        if (services.isEmpty()) {
            conversation.setState(LineConversationState.IDLE);
            save(conversation);
            return messageFactory.text("商家目前沒有開放可預約的服務項目。");
        }
        List<String> options = new ArrayList<>(services.stream().limit(12).toList());
        options.add(CANCEL);
        save(conversation);
        return messageFactory.quickReply("想預約什麼項目？", options);
    }

    private LineReplyMessage selectService(LineConversation conversation, String input) {
        ServiceItem service = serviceItemRepo
                .findByBusinessIdAndNameAndActiveTrue(conversation.getBusiness().getId(), input)
                .orElse(null);
        if (service == null) {
            List<String> options = new ArrayList<>(serviceItemRepo
                    .findAllByBusinessIdAndActiveTrue(conversation.getBusiness().getId())
                    .stream().map(ServiceItem::getName).limit(12).toList());
            options.add(CANCEL);
            return messageFactory.quickReply("找不到此服務項目，請重新選擇。", options);
        }
        conversation.setServiceItemId(service.getId());
        conversation.setState(LineConversationState.ENTERING_DATE);
        return messageFactory.text("想預約哪一天？請輸入例如 6/29。");
    }

    private LineReplyMessage enterDate(LineConversation conversation, String input) {
        LocalDate date;
        try {
            date = dateParser.parse(input);
        } catch (IllegalArgumentException exception) {
            return messageFactory.text(exception.getMessage());
        }
        ServiceItem service = requiredService(conversation);
        Long businessId = conversation.getBusiness().getId();
        if (!reservationTimeService.isBusinessOpen(date, businessId)) {
            return messageFactory.text("當日不營業，請選擇其他日期。");
        }
        List<String> available = availableTimes(date, service, businessId);
        if (available.isEmpty()) {
            return messageFactory.text("當日已無可預約時段，請選擇其他日期。");
        }
        conversation.setReservationDate(date);
        conversation.setState(LineConversationState.SELECTING_TIME);
        available = withActions(available);
        return messageFactory.quickReply("請選擇可預約時段。", available);
    }

    private LineReplyMessage selectTime(LineConversation conversation, String input) {
        ServiceItem service = requiredService(conversation);
        List<String> available = availableTimes(
                conversation.getReservationDate(), service, conversation.getBusiness().getId());
        if (!available.contains(input)) {
            return messageFactory.quickReply("此時段目前不可預約，請重新選擇。", withActions(available));
        }
        conversation.setStartTime(LocalTime.parse(input));
        conversation.setState(LineConversationState.ENTERING_NAME);
        return messageFactory.text("請輸入預約人姓名。");
    }

    private LineReplyMessage enterName(LineConversation conversation, String input) {
        if (input.isBlank() || input.length() > 100) {
            return messageFactory.text("姓名不可為空且不可超過 100 個字，請重新輸入。");
        }
        conversation.setCustomerName(input);
        conversation.setState(LineConversationState.ENTERING_PHONE);
        return messageFactory.text("請輸入聯絡電話。");
    }

    private LineReplyMessage enterPhone(LineConversation conversation, String input) {
        if (!input.matches("[0-9+()\\-\\s]{8,20}")) {
            return messageFactory.text("電話格式錯誤，請輸入 8 至 20 位數字或常用符號。");
        }
        conversation.setPhone(input);
        conversation.setState(LineConversationState.CONFIRMING);
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
        return messageFactory.quickReply(summary, List.of(CONFIRM, RESTART, CANCEL));
    }

    private LineReplyMessage confirm(
            BusinessLineChannel channel,
            LineConversation conversation,
            String input) {
        if (!CONFIRM.equals(input)) {
            return messageFactory.quickReply("請選擇確認、重新開始或取消。", List.of(CONFIRM, RESTART, CANCEL));
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
            Reservation reservation = reservationCommandService.createReservation(
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
