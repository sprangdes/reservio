package org.machi.reservio.service;

import jakarta.annotation.Resource;
import org.machi.reservio.dto.response.AccountDTO;
import org.machi.reservio.dto.request.CreateAccountDTO;
import org.machi.reservio.dto.request.UpdateAccountDTO;
import org.machi.reservio.entity.Account;
import org.machi.reservio.repository.AccountRepository;
import org.machi.reservio.repository.RoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestBody;

@Service
public class AccountService {

    @Resource
    private AccountRepository accountRepository;

    @Resource
    private RoleRepository roleRepository;

    public void createAccount(@RequestBody CreateAccountDTO dto) {
        Account newAccount = Account.builder()
                .lineUserId(dto.getLineUserId())
                .role(roleRepository.findById(dto.getRoleId())
                        .orElseThrow(() -> new RuntimeException("Role not found")))
                .build();
        accountRepository.save(newAccount);
    }

    public void updateAccount(UpdateAccountDTO dto) {
        Account account = accountRepository.findById(dto.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        account.setRole(roleRepository.findById(dto.getRoleId())
                .orElseThrow(() -> new RuntimeException("Role not found")));
        accountRepository.save(account);
    }

    public AccountDTO findAccount(Long id) {
        Account account = accountRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return converToAccountDTO(account);
    }

    private AccountDTO converToAccountDTO(Account account) {
        return AccountDTO.builder()
                .id(account.getId())
                .lineUserId(account.getLineUserId())
                .roleId(account.getRole().getId())
                .build();
    }

    public void registerUser(String userId) {
        if (!userExist(userId)) {
            saveUser(userId);
        }
    }

    private boolean userExist(String userId) {
        return !accountRepository.findByLineUserId(userId).isEmpty();
    }

    private void saveUser(String userId) {
        Account user = Account.builder().lineUserId(userId).build();
        accountRepository.save(user);
    }
}
