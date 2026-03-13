package com.reservio.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.ServiceItem;
import com.reservio.entity.UserData;
import com.reservio.exception.ServiceNotEditableException;
import com.reservio.repo.ReservationRepo;
import com.reservio.repo.ServiceItemRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

import static com.reservio.enums.ReservationStatus.CONFIRMED;
import static com.reservio.enums.ReservationStatus.PENDING;

@Service
public class ServiceItemService {

    private final ServiceItemRepo serviceItemRepo;
    private final ReservationRepo reservationRepo;
    private final UserDataService userDataService;

    public ServiceItemService(
            ServiceItemRepo serviceItemRepo,
            ReservationRepo reservationRepo,
            UserDataService userDataService) {
        this.serviceItemRepo = serviceItemRepo;
        this.reservationRepo = reservationRepo;
        this.userDataService = userDataService;
    }

    public List<ServiceItem> getServicesByBusinessId(Long businessId) {
        return serviceItemRepo.findAllByBusinessId(businessId);
    }

    @Transactional
    public ServiceItem saveServiceItem(BusinessData businessData, String name, Integer duration) {
        ServiceItem item = ServiceItem.builder()
                .name(name)
                .duration(duration)
                .business(businessData)
                .build();
        return serviceItemRepo.save(item);
    }

    @Transactional
    public void deleteServiceItem(Long id) throws NoSuchElementException, ServiceNotEditableException{
        serviceItemRepo.findById(id)
                .filter(this::isServiceOwnedByBusiness)
                .filter(this::isServiceEditable)
                .orElseThrow();
        serviceItemRepo.deleteById(id);
    }

    @Transactional
    public void modifyServiceItem(Long id, String name, Integer duration)
            throws NoSuchElementException , ServiceNotEditableException{
        ServiceItem item = serviceItemRepo.findById(id)
                .filter(this::isServiceOwnedByBusiness)
                .filter(this::isServiceEditable)
                .orElseThrow();
        item.setName(name);
        item.setDuration(duration);
        serviceItemRepo.save(item);
    }

    @Transactional
    public void switchServiceItem(Long id, boolean status) throws NoSuchElementException {
        ServiceItem item = serviceItemRepo.findById(id)
                .filter(this::isServiceOwnedByBusiness)
                .orElseThrow();
        item.setActive(status);
        serviceItemRepo.save(item);
    }

    private UserData getCurrentUser() {
        return userDataService.getCurrentUser();
    }

    private boolean isServiceOwnedByBusiness(ServiceItem item) {
        return item.getBusiness().equals(getCurrentUser().getBusinessData());
    }

    private boolean isServiceEditable(ServiceItem item) throws ServiceNotEditableException {
        long editableServices = reservationRepo.countByBusinessAndTitleAndStatusIn(
                item.getBusiness(), item.getName(), List.of(PENDING, CONFIRMED));
        if (editableServices > 0 ) {
            throw new ServiceNotEditableException("服務項目目前無法編輯");
        } else {
            return true;
        }
    }
}
