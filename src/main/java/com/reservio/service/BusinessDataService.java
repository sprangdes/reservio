package com.reservio.service;

import com.reservio.dto.DefaultSlotRequest;
import com.reservio.dto.DefaultSlotResponse;
import com.reservio.dto.DefaultWeekSlot;
import com.reservio.dto.UpdateBusinessInfoRequest;
import com.reservio.entity.BusinessData;
import com.reservio.entity.DefaultAvailableHour;
import com.reservio.exception.NotBusinessAccountException;
import com.reservio.repo.BusinessDataRepo;
import com.reservio.repo.DefaultAvailableHoursRepo;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class BusinessDataService {

    private final BusinessDataRepo businessDataRepo;
    private final UserDataService userDataService;
    private final DefaultAvailableHoursRepo defaultAvailableHoursRepo;

    public BusinessDataService(
            BusinessDataRepo businessDataRepo,
            UserDataService userDataService,
            DefaultAvailableHoursRepo defaultAvailableHoursRepo) {
        this.businessDataRepo = businessDataRepo;
        this.userDataService = userDataService;
        this.defaultAvailableHoursRepo = defaultAvailableHoursRepo;
    }

    public List<BusinessData> getAllBusinesses() {
        return businessDataRepo.findAll();
    }

    public BusinessData getBusinessById(Long id) {
        return businessDataRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("找不到店家: " + id));
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
                defaultWeekSlots.forEach(weekSlot -> defaultAvailableHours.stream()
                        .filter(defaultAvailableHour -> defaultAvailableHour.getDayOfWeek().equals(weekSlot.getDayOfWeek()))
                        .findFirst()
                        .ifPresentOrElse(
                                availableHour -> {
                            availableHour.setStartTime(weekSlot.getStartTime());
                            availableHour.setEndTime(weekSlot.getEndTime());
                            availableHour.setOpen(openCheck(weekSlot));
                            defaultAvailableHoursRepo.save(availableHour);
                        },
                        () -> {
                            DefaultAvailableHour newAvailableHour = DefaultAvailableHour.builder()
                                    .businessId(businessId)
                                    .dayOfWeek(weekSlot.getDayOfWeek())
                                    .startTime(weekSlot.getStartTime())
                                    .endTime(weekSlot.getEndTime())
                                    .isOpen(openCheck(weekSlot))
                                    .build();
                            defaultAvailableHoursRepo.save(newAvailableHour);
                        })
                );
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

    private boolean contentCheck(String content) {
        return content != null && !content.isEmpty();
    }

    private boolean intervalCheck(Integer interval) {
        return interval != null && interval > 0;
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
}
