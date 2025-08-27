package org.machi.reservio.service;

import jakarta.annotation.Resource;
import org.machi.reservio.dto.request.CreateServiceDTO;
import org.machi.reservio.dto.request.UpdateServiceDTO;
import org.machi.reservio.entity.ProviderService;
import org.machi.reservio.repository.ProviderRepository;
import org.machi.reservio.repository.ServiceRepository;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Objects;


@Service
public class ServiceService {

    @Resource
    private ServiceRepository serviceRepository;

    @Resource
    private ProviderRepository providerRepository;

    public void createService(CreateServiceDTO dto) {
        org.machi.reservio.entity.Service newService = org.machi.reservio.entity.Service.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .price(dto.getPrice())
                .serviceTime(dto.getServiceTime())
                .active(dto.getActive())
                .providerServices(buildProviderServices(dto.getProviders()))
                .build();
        serviceRepository.save(newService);
    }

    private List<ProviderService> buildProviderServices(List<Long> providerIds) {
        if (providerIds == null || providerIds.isEmpty()) {
            return Collections.emptyList();
         }

        return providerIds.stream()
                .filter(Objects::nonNull)
                .map(this::buildProviderService)
                .filter(Objects::nonNull)
                .toList();
    }

    private ProviderService buildProviderService(Long providerId) {
        return providerRepository.findById(providerId)
                .map(provider -> ProviderService.builder()
                        .provider(provider)
                        .build())
                .orElse(null);
    }

    public void updateService(UpdateServiceDTO dto) {

    }
}
