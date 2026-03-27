package com.reservio.service;

import com.reservio.dto.UpdateBusinessInfoRequest;
import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import com.reservio.exception.NotBusinessAccountException;
import com.reservio.repo.BusinessDataRepo;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class BusinessDataService {

    private final BusinessDataRepo businessDataRepo;
    private final UserDataService userDataService;

    public BusinessDataService(
            BusinessDataRepo businessDataRepo,
            UserDataService userDataService) {
        this.businessDataRepo = businessDataRepo;
        this.userDataService = userDataService;
    }

    public List<BusinessData> getAllBusinesses() {
        return businessDataRepo.findAll();
    }

    public BusinessData getBusinessById(Long id) {
        return businessDataRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("找不到店家: " + id));
    }

    public BusinessData updateBusinessInfo(UpdateBusinessInfoRequest request) {
        UserData currentUser = userDataService.getCurrentUser();
        BusinessData businessData = businessDataRepo.findByUser(currentUser);
        if (businessData == null) {
            throw new NotBusinessAccountException("用戶為非商家帳號");
        } else {
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
        }
    }

    private boolean contentCheck(String content) {
        return content != null && !content.isEmpty();
    }

    private boolean intervalCheck(Integer interval) {
        return interval != null && interval > 0;
    }
}
