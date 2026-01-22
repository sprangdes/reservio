package com.reservio.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.ServiceItem;
import com.reservio.repo.ServiceItemRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ServiceItemService {

    private final ServiceItemRepo serviceItemRepo;

    public ServiceItemService(ServiceItemRepo serviceItemRepo) {
        this.serviceItemRepo = serviceItemRepo;
    }

    public List<ServiceItem> getServicesByBusinessId(Long businessId) {
        return serviceItemRepo.findAllByBusinessId(businessId);
    }

    @Transactional
    public void saveServiceItem(BusinessData businessData, String name, Integer duration) {
        ServiceItem item = ServiceItem.builder()
                .name(name)
                .duration(duration)
                .business(businessData)
                .build();
        serviceItemRepo.save(item);
    }
}
