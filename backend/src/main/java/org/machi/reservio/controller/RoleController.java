package org.machi.reservio.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.machi.reservio.dto.request.CreateRoleDTO;
import org.machi.reservio.dto.request.RenameRoleDTO;
import org.machi.reservio.entity.Role;
import org.machi.reservio.service.RoleService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "角色")
@RestController
@RequestMapping("/role")
public class RoleController {

    @Resource
    private RoleService roleService;

    @PostMapping("/new")
    public void createRole(@RequestBody CreateRoleDTO dto) {
        roleService.createRole(dto);
    }

    @PostMapping("/rename")
    public void renameRole(@RequestBody RenameRoleDTO dto) {
        roleService.renameRole(dto);
    }

    @GetMapping
    public ResponseEntity<Role> findRole(@RequestParam Long id) {
        return ResponseEntity.ok(roleService.findRole(id));
    }
}
