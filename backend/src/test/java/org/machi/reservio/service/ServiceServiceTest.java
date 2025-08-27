package org.machi.reservio.service;

import org.junit.jupiter.api.Test;
import org.machi.reservio.dto.request.CreateServiceDTO;
import org.machi.reservio.entity.Provider;
import org.machi.reservio.repository.ProviderRepository;
import org.machi.reservio.repository.ServiceRepository;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
class ServiceServiceTest {

    @Autowired
    private ServiceService serviceService;

    @MockitoBean
    private ServiceRepository serviceRepository;

    @MockitoBean
    private ProviderRepository providerRepository;

    @Test
    void testCreateServiceWithValidData() {
        // Arrange
        CreateServiceDTO dto = new CreateServiceDTO();
        dto.setName("Test Service");
        dto.setDescription("A test service");
        dto.setPrice(BigDecimal.valueOf(100));
        dto.setServiceTime(60);
        dto.setActive(true);
        dto.setProviders(List.of(1L));

        Provider provider = new Provider();
        provider.setId(1L);
        when(providerRepository.findById(1L)).thenReturn(Optional.of(provider));

        // Act
        serviceService.createService(dto);

        // Assert
        ArgumentCaptor<org.machi.reservio.entity.Service> serviceCaptor = ArgumentCaptor.forClass(org.machi.reservio.entity.Service.class);
        verify(serviceRepository, times(1)).save(serviceCaptor.capture());

        org.machi.reservio.entity.Service savedService = serviceCaptor.getValue();
        assertEquals("Test Service", savedService.getName());
        assertEquals("A test service", savedService.getDescription());
        assertEquals(BigDecimal.valueOf(100), savedService.getPrice());
        assertEquals(60, savedService.getServiceTime());
        assertTrue(savedService.getActive());
        assertEquals(1, savedService.getProviderServices().size());
        assertEquals(provider, savedService.getProviderServices().get(0).getProvider());
    }

    @Test
    void testCreateServiceWithNoProviders() {
        // Arrange
        CreateServiceDTO dto = new CreateServiceDTO();
        dto.setName("Test Service");
        dto.setDescription("A test service");
        dto.setPrice(BigDecimal.valueOf(100));
        dto.setServiceTime(60);
        dto.setActive(true);

        // Act
        serviceService.createService(dto);

        // Assert
        ArgumentCaptor<org.machi.reservio.entity.Service> serviceCaptor = ArgumentCaptor.forClass(org.machi.reservio.entity.Service.class);
        verify(serviceRepository, times(1)).save(serviceCaptor.capture());

        org.machi.reservio.entity.Service savedService = serviceCaptor.getValue();
        assertEquals("Test Service", savedService.getName());
        assertEquals("A test service", savedService.getDescription());
        assertEquals(BigDecimal.valueOf(100), savedService.getPrice());
        assertEquals(60, savedService.getServiceTime());
        assertTrue(savedService.getActive());
        assertTrue(savedService.getProviderServices().isEmpty());
    }

    @Test
    void testCreateServiceWithInvalidProvider() {
        // Arrange
        CreateServiceDTO dto = new CreateServiceDTO();
        dto.setName("Test Service");
        dto.setDescription("A test service");
        dto.setPrice(BigDecimal.valueOf(100));
        dto.setServiceTime(60);
        dto.setActive(true);
        dto.setProviders(List.of(999L));

        when(providerRepository.findById(999L)).thenReturn(Optional.empty());

        // Act
        serviceService.createService(dto);

        // Assert
        ArgumentCaptor<org.machi.reservio.entity.Service> serviceCaptor = ArgumentCaptor.forClass(org.machi.reservio.entity.Service.class);
        verify(serviceRepository, times(1)).save(serviceCaptor.capture());

        org.machi.reservio.entity.Service savedService = serviceCaptor.getValue();
        assertEquals("Test Service", savedService.getName());
        assertTrue(savedService.getProviderServices().isEmpty());
    }

    @Test
    void testCreateServiceWithNullFields() {
        // Arrange
        CreateServiceDTO dto = new CreateServiceDTO();
        dto.setName("Test Service");
        dto.setPrice(BigDecimal.valueOf(100));
        dto.setServiceTime(60);

        // Act
        serviceService.createService(dto);

        // Assert
        ArgumentCaptor<org.machi.reservio.entity.Service> serviceCaptor = ArgumentCaptor.forClass(org.machi.reservio.entity.Service.class);
        verify(serviceRepository, times(1)).save(serviceCaptor.capture());

        org.machi.reservio.entity.Service savedService = serviceCaptor.getValue();
        assertEquals("Test Service", savedService.getName());
        assertNull(savedService.getDescription());
        assertNull(savedService.getActive());
        assertTrue(savedService.getProviderServices().isEmpty());
    }
}