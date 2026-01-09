package com.reservio.service;

import com.reservio.entity.ServiceItem;
import com.reservio.repo.ServiceItemRepo;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ServiceItemService {

    private final ServiceItemRepo serviceItemRepo;

    public ServiceItemService(ServiceItemRepo serviceItemRepo) {
        this.serviceItemRepo = serviceItemRepo;
    }

    public List<ServiceItem> getServiceItems() {
        return serviceItemRepo.findAll();
    }
}
