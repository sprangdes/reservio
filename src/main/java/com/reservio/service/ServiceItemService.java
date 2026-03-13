package com.reservio.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.ServiceItem;
import com.reservio.entity.UserData;
import com.reservio.repo.ServiceItemRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ServiceItemService {

    private final ServiceItemRepo serviceItemRepo;
    private final UserDataService userDataService;

    public ServiceItemService(ServiceItemRepo serviceItemRepo, UserDataService userDataService) {
        this.serviceItemRepo = serviceItemRepo;
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
    public void deleteServiceItem(Long id) throws NoSuchElementException {
        serviceItemRepo.findById(id)
                .filter(i -> i.getBusiness().equals(getCurrentUser().getBusinessData()))
                .orElseThrow();
        serviceItemRepo.deleteById(id);
    }

    @Transactional
    public void modifyServiceItem(Long id, String name, Integer duration) throws NoSuchElementException {
        ServiceItem item = serviceItemRepo.findById(id)
                .filter(i -> i.getBusiness().equals(getCurrentUser().getBusinessData()))
                .orElseThrow();
        item.setName(name);
        item.setDuration(duration);
        serviceItemRepo.save(item);
    }

    @Transactional
    public void switchServiceItem(Long id, boolean status) throws NoSuchElementException {
        ServiceItem item = serviceItemRepo.findById(id)
                .filter(i -> i.getBusiness().equals(getCurrentUser().getBusinessData()))
                .orElseThrow();
        item.setActive(status);
        serviceItemRepo.save(item);
    }

    private UserData getCurrentUser() {
        return userDataService.getCurrentUser();
    }
}
