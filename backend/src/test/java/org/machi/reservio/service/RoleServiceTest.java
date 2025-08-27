package org.machi.reservio.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.machi.reservio.dto.request.CreateRoleDTO;
import org.machi.reservio.dto.request.RenameRoleDTO;
import org.machi.reservio.entity.Role;
import org.machi.reservio.repository.RoleRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

class RoleServiceTest {

    @Mock
    private RoleRepository roleRepository;

    @InjectMocks
    private RoleService roleService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testCreateRole() {
        CreateRoleDTO createRoleDTO = new CreateRoleDTO();
        createRoleDTO.setName("Admin");

        Role savedRole = Role.builder()
                .name("Admin")
                .build();

        when(roleRepository.save(any(Role.class))).thenReturn(savedRole);

        roleService.createRole(createRoleDTO);

        verify(roleRepository, times(1)).save(any(Role.class));
    }

    @Test
    void testRenameRoleThrowsExceptionWhenRoleNotFound() {
        RenameRoleDTO renameRoleDTO = new RenameRoleDTO();
        renameRoleDTO.setId(1L);
        renameRoleDTO.setName("Updated Role");

        when(roleRepository.findById(1L)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> roleService.renameRole(renameRoleDTO));

        assertEquals("找不到指定的角色", exception.getMessage());
        verify(roleRepository, times(0)).save(any(Role.class));
    }

    @Test
    void testRenameRoleSuccess() {
        RenameRoleDTO renameRoleDTO = new RenameRoleDTO();
        renameRoleDTO.setId(1L);
        renameRoleDTO.setName("Updated Role");

        Role existingRole = Role.builder()
                .id(1L)
                .name("Old Role")
                .build();

        when(roleRepository.findById(1L)).thenReturn(Optional.of(existingRole));

        roleService.renameRole(renameRoleDTO);

        verify(roleRepository, times(1)).save(existingRole);
        assertEquals("Updated Role", existingRole.getName());
    }

    @Test
    void testFindRoleSuccess() {
        Long roleId = 1L;

        Role existingRole = Role.builder()
                .id(roleId)
                .name("Admin")
                .build();

        when(roleRepository.findById(roleId)).thenReturn(Optional.of(existingRole));

        Role foundRole = roleService.findRole(roleId);

        assertEquals(existingRole.getId(), foundRole.getId());
        assertEquals(existingRole.getName(), foundRole.getName());
        verify(roleRepository, times(1)).findById(roleId);
    }

    @Test
    void testFindRoleThrowsExceptionWhenRoleNotFound() {
        Long roleId = 1L;

        when(roleRepository.findById(roleId)).thenReturn(Optional.empty());

        RuntimeException exception = assertThrows(RuntimeException.class, () -> roleService.findRole(roleId));

        assertEquals("找不到指定的角色", exception.getMessage());
        verify(roleRepository, times(1)).findById(roleId);
    }
}