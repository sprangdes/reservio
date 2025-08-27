package org.machi.reservio.service;

import org.junit.jupiter.api.Test;
import org.machi.reservio.dto.response.AccountDTO;
import org.machi.reservio.dto.request.CreateAccountDTO;
import org.machi.reservio.dto.request.UpdateAccountDTO;
import org.machi.reservio.entity.Role;
import org.machi.reservio.entity.Account;
import org.machi.reservio.repository.RoleRepository;
import org.machi.reservio.repository.AccountRepository;
import org.mockito.Mockito;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
class UserServiceTest {

    @Autowired
    private AccountService userService;

    @MockitoBean
    private AccountRepository accountRepository;

    @MockitoBean
    private RoleRepository roleRepository;

    @Test
    void shouldRegisterUserWhenUserDoesNotExist() {
        // Arrange
        String userId = "new_user";
        when(accountRepository.findByLineUserId(userId))
                .thenReturn(Collections.emptyList());

        // Act
        userService.registerUser(userId);

        // Assert
        verify(accountRepository, times(1)).findByLineUserId(userId);
        verify(accountRepository, times(1)).save(Mockito.any(Account.class));
    }

    @Test
    void shouldNotRegisterUserWhenUserAlreadyExists() {
        // Arrange
        String userId = "existing_user";
        Account existingUser = Account.builder().lineUserId(userId).build();
        when(accountRepository.findByLineUserId(userId))
                .thenReturn(Collections.singletonList(existingUser));

        // Act
        userService.registerUser(userId);

        // Assert
        verify(accountRepository, times(1)).findByLineUserId(userId);
        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void shouldCreateUserWhenRoleExists() {
        // Arrange
        CreateAccountDTO dto = new CreateAccountDTO();
        dto.setLineUserId("some_user");
        dto.setRoleId(1L);

        when(roleRepository.findById(1L)).thenReturn(Optional.of(mock(Role.class)));

        // Act
        userService.createAccount(dto);

        // Assert
        verify(roleRepository, times(1)).findById(1L);
        verify(accountRepository, times(1)).save(Mockito.any(Account.class));
    }

    @Test
    void shouldThrowExceptionWhenRoleDoesNotExist() {
        // Arrange
        CreateAccountDTO dto = new CreateAccountDTO();
        dto.setLineUserId("some_user");
        dto.setRoleId(1L);

        when(roleRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> userService.createAccount(dto));
        verify(roleRepository, times(1)).findById(1L);
        verify(accountRepository, never()).save(Mockito.any(Account.class));
    }

    @Test
    void shouldUpdateUserWhenRoleExists() {
        // Arrange
        UpdateAccountDTO dto = new UpdateAccountDTO();
        dto.setId(1L);
        dto.setRoleId(2L);

        Account existingUser = Account.builder().id(1L).build();
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existingUser));
        when(roleRepository.findById(2L)).thenReturn(Optional.of(mock(Role.class)));

        // Act
        userService.updateAccount(dto);

        // Assert
        verify(accountRepository, times(1)).findById(1L);
        verify(roleRepository, times(1)).findById(2L);
        verify(accountRepository, times(1)).save(existingUser);
    }

    @Test
    void shouldThrowExceptionWhenUserToUpdateDoesNotExist() {
        // Arrange
        UpdateAccountDTO dto = new UpdateAccountDTO();
        dto.setId(1L);
        dto.setRoleId(2L);

        when(accountRepository.findById(1L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> userService.updateAccount(dto));
        verify(accountRepository, times(1)).findById(1L);
        verify(roleRepository, never()).findById(anyLong());
        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void shouldThrowExceptionWhenRoleToUpdateDoesNotExist() {
        // Arrange
        UpdateAccountDTO dto = new UpdateAccountDTO();
        dto.setId(1L);
        dto.setRoleId(2L);

        Account existingUser = Account.builder().id(1L).build();
        when(accountRepository.findById(1L)).thenReturn(Optional.of(existingUser));
        when(roleRepository.findById(2L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> userService.updateAccount(dto));
        verify(accountRepository, times(1)).findById(1L);
        verify(roleRepository, times(1)).findById(2L);
        verify(accountRepository, never()).save(any(Account.class));
    }

    @Test
    void shouldFindUserWhenUserExists() {
        // Arrange
        Long userId = 1L;
        Long roleId = 2L;
        Role role = Role.builder().id(roleId).name("USER").build();
        Account existingUser = Account.builder()
            .id(userId)
            .lineUserId("some_user")
            .role(role)
            .build();
        when(accountRepository.findById(userId)).thenReturn(Optional.of(existingUser));

        // Act
        AccountDTO result = userService.findAccount(userId);

        // Assert
        verify(accountRepository, times(1)).findById(userId);
        assertNotNull(result);
        assertEquals(userId, result.getId());
        assertEquals("some_user", result.getLineUserId());
        assertEquals(roleId, result.getRoleId());
    }

    @Test
    void shouldThrowExceptionWhenUserDoesNotExist() {
        // Arrange
        Long userId = 1L;
        when(accountRepository.findById(userId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> userService.findAccount(userId));
        verify(accountRepository, times(1)).findById(userId);
    }
}