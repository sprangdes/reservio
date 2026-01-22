package com.reservio.service;

import com.reservio.entity.BusinessData;
import com.reservio.repo.BusinessDataRepo;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BusinessDataService {

    private final BusinessDataRepo businessDataRepo;

    public BusinessDataService(BusinessDataRepo businessDataRepo) {
        this.businessDataRepo = businessDataRepo;
    }

    public List<BusinessData> getAllBusinesses() {
        return businessDataRepo.findAll();
    }
}
