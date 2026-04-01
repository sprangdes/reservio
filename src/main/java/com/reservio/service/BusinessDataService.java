package com.reservio.service;

import com.reservio.dto.*;
import com.reservio.entity.BusinessData;
import com.reservio.entity.DateAvailableHours;
import com.reservio.entity.DefaultAvailableHour;
import com.reservio.exception.NotBusinessAccountException;
import com.reservio.repo.BusinessDataRepo;
import com.reservio.repo.DateAvailableHoursRepo;
import com.reservio.repo.DefaultAvailableHoursRepo;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class BusinessDataService {

    private final BusinessDataRepo businessDataRepo;
    private final UserDataService userDataService;
    private final DefaultAvailableHoursRepo defaultAvailableHoursRepo;
    private final DateAvailableHoursRepo dateAvailableHoursRepo;

    public BusinessDataService(
            BusinessDataRepo businessDataRepo,
            UserDataService userDataService,
            DefaultAvailableHoursRepo defaultAvailableHoursRepo,
            DateAvailableHoursRepo dateAvailableHoursRepo) {
        this.businessDataRepo = businessDataRepo;
        this.userDataService = userDataService;
        this.defaultAvailableHoursRepo = defaultAvailableHoursRepo;
        this.dateAvailableHoursRepo = dateAvailableHoursRepo;
    }

    public List<BusinessData> getAllBusinesses() {
        return businessDataRepo.findAll();
    }

    public BusinessData getBusinessById(Long id) {
        return businessDataRepo.findById(id).orElseThrow(() -> new IllegalArgumentException("找不到店家: " + id));
    }

    public BusinessData updateBusinessInfo(UpdateBusinessInfoRequest request) {
        BusinessData businessData = userDataService.getCurrentUser().getBusinessData();
        if (businessData != null) {
            businessData.setName(contentCheck(request.getName())
                    ? request.getName()
                    : businessData.getName());
            businessData.setCategory(contentCheck(request.getCategory())
                    ? request.getCategory()
                    : businessData.getCategory());
            businessData.setAddress(contentCheck(request.getAddress())
                    ? request.getAddress()
                    : businessData.getAddress());
            businessData.setPhone(contentCheck(request.getPhone())
                    ? request.getPhone()
                    : businessData.getPhone());
            if (intervalCheck(request.getSlotInterval())) {
                businessData.setSlotInterval(request.getSlotInterval());
            }
            return businessDataRepo.save(businessData);
        } else {
            throw new NotBusinessAccountException("用戶為非商家帳號");
        }
    }

    public void setDefaultSlot(DefaultSlotRequest request) {
        BusinessData businessData = userDataService.getCurrentUser().getBusinessData();
        if (businessData != null) {
            Long businessId = businessData.getId();
            List<DefaultWeekSlot> defaultWeekSlots = request.getDefaultWeekSlots();
            List<DefaultAvailableHour> defaultAvailableHours = defaultAvailableHoursRepo.findAllByBusinessId(businessId);
            if (request.getDefaultInterval() != null) {
                businessData.setSlotInterval(request.getDefaultInterval());
            }
            if (defaultWeekSlots != null) {
                defaultWeekSlots.forEach(weekSlot -> {
                    Optional<DefaultAvailableHour> existingHour = findDefaultAvailableHour(defaultAvailableHours, weekSlot);
                    existingHour.ifPresentOrElse(
                            availableHour -> updateDefaultAvailableHour(availableHour, weekSlot),
                            () -> createDefaultAvailableHour(businessId, weekSlot)
                    );
                });
            }
        } else {
            throw new NotBusinessAccountException("用戶為非商家帳號");
        }
    }

    public DefaultSlotResponse getDefaultSlot() {
        BusinessData businessData = userDataService.getCurrentUser().getBusinessData();
        if (businessData != null) {
            Long businessId = businessData.getId();
            Integer defaultInterval = businessData.getSlotInterval();
            List<DefaultWeekSlot> defaultAvailableHours = defaultAvailableHoursRepo.findAllByBusinessId(businessId)
                    .stream()
                    .map(this::toDefaultWeekSlot)
                    .toList();
            return DefaultSlotResponse.builder()
                    .defaultWeekSlots(defaultAvailableHours)
                    .defaultInterval(defaultInterval)
                    .build();
        } else {
            throw new NotBusinessAccountException("用戶為非商家帳號");
        }
    }

    public DateSlotResponse getDateSlot(LocalDate date) {
        BusinessData businessData = userDataService.getCurrentUser().getBusinessData();
        if (businessData == null) {
            throw new NotBusinessAccountException("用戶為非商家帳號");
        }
        Long businessId = businessData.getId();
        List<DateAvailableHours> dateAvailableHours = dateAvailableHoursRepo.findAllByBusinessIdAndDate(businessId, date);
        if (!dateAvailableHours.isEmpty()) {
            return toDateSlotResponse(dateAvailableHours.get(0));
        }
        List<DefaultAvailableHour> defaultAvailableHours = defaultAvailableHoursRepo.findByBusinessIdAndDayOfWeek(businessId, date.getDayOfWeek());
        if (!defaultAvailableHours.isEmpty()) {
            return toDateSlotResponse(date, defaultAvailableHours.get(0));
        }
        return DateSlotResponse.builder()
                .date(date)
                .open(false)
                .build();
    }

    public List<DateSlotResponse> getDateSlots() {
        BusinessData businessData = userDataService.getCurrentUser().getBusinessData();
        if (businessData == null) {
            throw new NotBusinessAccountException("用戶為非商家帳號");
        }
        Long businessId = businessData.getId();
        LocalDate today = LocalDate.now();
        List<DateAvailableHours> dateAvailableHours = dateAvailableHoursRepo.findAllByBusinessIdAndDateAfter(businessId, today);
        List<DateSlotResponse> dateSlotResponses = new ArrayList<>();
        for (DateAvailableHours dateAvailableHour : dateAvailableHours) {
            dateSlotResponses.add(toDateSlotResponse(dateAvailableHour));
        }
        return dateSlotResponses;
    }

    public void saveDateSlot(SaveDateSlotRequest request) {
        BusinessData businessData = userDataService.getCurrentUser().getBusinessData();
        if (businessData == null) {
            throw new NotBusinessAccountException("用戶為非商家帳號");
        }
        Optional<DateAvailableHours> dateAvailableHours =
                dateAvailableHoursRepo.findByBusinessIdAndDate(
                        businessData.getId(),
                        request.getDate()
                );
        if (dateAvailableHours.isEmpty()) {
            DateAvailableHours newDateAvailableHours = DateAvailableHours.builder()
                    .businessId(businessData.getId())
                    .date(request.getDate())
                    .startTime(request.getStartTime())
                    .endTime(request.getEndTime())
                    .isClosed(!request.isOpen())
                    .build();
            dateAvailableHoursRepo.save(newDateAvailableHours);
        } else {
            dateAvailableHours.get().setStartTime(request.getStartTime());
            dateAvailableHours.get().setEndTime(request.getEndTime());
            dateAvailableHours.get().setClosed(!request.isOpen());
            dateAvailableHoursRepo.save(dateAvailableHours.get());
        }
    }

    private boolean contentCheck(String content) {
        return content != null && !content.isEmpty();
    }

    private boolean intervalCheck(Integer interval) {
        return interval != null && interval > 0;
    }

    private Optional<DefaultAvailableHour> findDefaultAvailableHour(
            List<DefaultAvailableHour> availableHours,
            DefaultWeekSlot weekSlot) {
        return availableHours.stream()
                .filter(defaultAvailableHour ->
                        defaultAvailableHour.getDayOfWeek().equals(weekSlot.getDayOfWeek()))
                .findFirst();
    }

    private void updateDefaultAvailableHour(DefaultAvailableHour availableHour, DefaultWeekSlot weekSlot) {
        availableHour.setStartTime(weekSlot.getStartTime());
        availableHour.setEndTime(weekSlot.getEndTime());
        availableHour.setOpen(openCheck(weekSlot));
        defaultAvailableHoursRepo.save(availableHour);
    }

    private void createDefaultAvailableHour(Long businessId, DefaultWeekSlot weekSlot) {
        DefaultAvailableHour newAvailableHour = DefaultAvailableHour.builder()
                .businessId(businessId)
                .dayOfWeek(weekSlot.getDayOfWeek())
                .startTime(weekSlot.getStartTime())
                .endTime(weekSlot.getEndTime())
                .isOpen(openCheck(weekSlot))
                .build();
        defaultAvailableHoursRepo.save(newAvailableHour);
    }

    private boolean openCheck(DefaultWeekSlot weekSlot) {
        LocalTime startTime = weekSlot.getStartTime();
        LocalTime endTime = weekSlot.getEndTime();
        return startTime != null && endTime != null;
    }

    private DefaultWeekSlot toDefaultWeekSlot(DefaultAvailableHour defaultAvailableHour) {
        return DefaultWeekSlot.builder()
                .dayOfWeek(defaultAvailableHour.getDayOfWeek())
                .startTime(defaultAvailableHour.getStartTime())
                .endTime(defaultAvailableHour.getEndTime())
                .build();
    }

    private DateSlotResponse toDateSlotResponse(DateAvailableHours dateAvailableHours) {
        return DateSlotResponse.builder()
                .date(dateAvailableHours.getDate())
                .open(!dateAvailableHours.isClosed())
                .startTime(dateAvailableHours.getStartTime())
                .endTime(dateAvailableHours.getEndTime())
                .build();
    }

    private DateSlotResponse toDateSlotResponse(LocalDate date, DefaultAvailableHour defaultAvailableHour) {
        return DateSlotResponse.builder()
                .date(date)
                .open(defaultAvailableHour.isOpen())
                .startTime(defaultAvailableHour.getStartTime())
                .endTime(defaultAvailableHour.getEndTime())
                .build();
    }
}
