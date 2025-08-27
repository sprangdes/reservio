package org.machi.reservio.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.machi.reservio.dto.request.CreateServiceDTO;
import org.machi.reservio.dto.request.UpdateServiceDTO;
import org.machi.reservio.service.ServiceService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "服務項目")
@RestController
@RequestMapping("/service")
public class ServiceController {

    @Resource
    private ServiceService serviceService;

    @PostMapping("/new")
    public void createService(@RequestBody CreateServiceDTO dto) {
        serviceService.createService(dto);
    }

    @PostMapping("/update")
    public void updateService(@RequestBody UpdateServiceDTO dto) {
        serviceService.updateService(dto);
    }

}
