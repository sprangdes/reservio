package org.machi.reservio.service;

import jakarta.annotation.Resource;
import org.machi.reservio.dto.request.CreateRoleDTO;
import org.machi.reservio.dto.request.RenameRoleDTO;
import org.machi.reservio.entity.Role;
import org.machi.reservio.repository.RoleRepository;
import org.springframework.stereotype.Service;

@Service
public class RoleService {

    @Resource
    private RoleRepository roleRepository;

    public void createRole(CreateRoleDTO dto) {
        Role newRole = Role.builder()
                .name(dto.getName())
                .build();
        roleRepository.save(newRole);
    }

    public void renameRole(RenameRoleDTO dto) {
        Role existingRole = roleRepository.findById(dto.getId())
                .orElseThrow(() -> new RuntimeException("Role not found"));

        existingRole.setName(dto.getName());
        roleRepository.save(existingRole);
    }

    public Role findRole(Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Role not found"));
    }
}
