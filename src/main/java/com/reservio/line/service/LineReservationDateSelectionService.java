package com.reservio.line.service;

import com.reservio.controller.response.TimeSlotResponse;
import com.reservio.entity.ServiceItem;
import com.reservio.line.controller.response.LineReservationDateOptionResponse;
import com.reservio.line.controller.response.LineReservationDateSelectResponse;
import com.reservio.line.controller.response.LineReservationDateStatusResponse;
import com.reservio.line.entity.LineConversation;
import com.reservio.line.enums.LineConversationState;
import com.reservio.line.repo.LineConversationRepo;
import com.reservio.repo.ServiceItemRepo;
import com.reservio.service.ReservationTimeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class LineReservationDateSelectionService {

    private final LineReservationDateTokenService tokenService;
    private final LineConversationRepo conversationRepo;
    private final ServiceItemRepo serviceItemRepo;
    private final ReservationTimeService reservationTimeService;
    private final Clock clock;

    public LineReservationDateSelectionService(
            LineReservationDateTokenService tokenService,
            LineConversationRepo conversationRepo,
            ServiceItemRepo serviceItemRepo,
            ReservationTimeService reservationTimeService) {
        this(tokenService, conversationRepo, serviceItemRepo, reservationTimeService,
                Clock.systemDefaultZone());
    }

    LineReservationDateSelectionService(
            LineReservationDateTokenService tokenService,
            LineConversationRepo conversationRepo,
            ServiceItemRepo serviceItemRepo,
            ReservationTimeService reservationTimeService,
            Clock clock) {
        this.tokenService = tokenService;
        this.conversationRepo = conversationRepo;
        this.serviceItemRepo = serviceItemRepo;
        this.reservationTimeService = reservationTimeService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public LineReservationDateStatusResponse status(String token) {
        Context context = context(token);
        LocalDate minDate = LocalDate.now(clock);
        LocalDate maxDate = minDate.plusMonths(3);
        List<LineReservationDateOptionResponse> dates = minDate
                .datesUntil(maxDate.plusDays(1))
                .map(date -> new LineReservationDateOptionResponse(
                        date,
                        isSelectable(date, context.service(), context.conversation())
                ))
                .toList();
        return new LineReservationDateStatusResponse(
                context.conversation().getBusiness().getName(),
                context.service().getName(),
                minDate,
                maxDate,
                dates
        );
    }

    @Transactional
    public LineReservationDateSelectResponse select(String token, LocalDate date) {
        Context context = context(token);
        LocalDate minDate = LocalDate.now(clock);
        LocalDate maxDate = minDate.plusMonths(3);
        if (date.isBefore(minDate) || date.isAfter(maxDate)) {
            throw new IllegalArgumentException("日期超出可預約範圍。");
        }
        List<String> availableTimes = availableTimes(date, context.service(), context.conversation());
        if (availableTimes.isEmpty()) {
            throw new IllegalArgumentException("此日期目前沒有可預約時段，請選擇其他日期。");
        }
        LineConversation conversation = context.conversation();
        conversation.setReservationDate(date);
        conversation.setStartTime(null);
        conversation.setState(LineConversationState.SELECTING_TIME);
        conversation.setUpdatedAt(LocalDateTime.now(clock));
        conversationRepo.save(conversation);
        return new LineReservationDateSelectResponse(date, availableTimes);
    }

    private Context context(String token) {
        LineReservationDateTokenPayload payload = tokenService.verify(token);
        LineConversation conversation = conversationRepo
                .findByBusinessIdAndLineUserId(payload.businessId(), payload.lineUserId())
                .orElseThrow(() -> new IllegalArgumentException("找不到 LINE 預約流程，請回 LINE 重新操作。"));
        if (conversation.getState() != LineConversationState.ENTERING_DATE
                && conversation.getState() != LineConversationState.SELECTING_TIME) {
            throw new IllegalArgumentException("目前預約流程不在選擇日期階段，請回 LINE 重新操作。");
        }
        if (!payload.serviceItemId().equals(conversation.getServiceItemId())) {
            throw new IllegalArgumentException("日期選擇連結與目前預約項目不一致，請回 LINE 重新操作。");
        }
        ServiceItem service = serviceItemRepo.findById(payload.serviceItemId())
                .filter(item -> Boolean.TRUE.equals(item.getActive())
                        && item.getBusiness() != null
                        && payload.businessId().equals(item.getBusiness().getId()))
                .orElseThrow(() -> new IllegalArgumentException("預約項目不存在或已停用，請回 LINE 重新操作。"));
        return new Context(conversation, service);
    }

    private boolean isSelectable(LocalDate date, ServiceItem service, LineConversation conversation) {
        return !availableTimes(date, service, conversation).isEmpty();
    }

    private List<String> availableTimes(
            LocalDate date,
            ServiceItem service,
            LineConversation conversation) {
        Long businessId = conversation.getBusiness().getId();
        if (!reservationTimeService.isBusinessOpen(date, businessId)) {
            return List.of();
        }
        return reservationTimeService.getTimeSlotsForDate(date, service.getDuration(), businessId)
                .stream()
                .filter(TimeSlotResponse::isAvailable)
                .map(TimeSlotResponse::getTime)
                .toList();
    }

    private record Context(LineConversation conversation, ServiceItem service) {
    }
}
