package org.machi.reservio.controller;

import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.machi.reservio.dto.response.AccountDTO;
import org.machi.reservio.dto.request.CreateAccountDTO;
import org.machi.reservio.dto.request.UpdateAccountDTO;
import org.machi.reservio.service.AccountService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "使用者")
@RestController
@RequestMapping("/user")
public class AccountController {

    @Resource
    private AccountService accountService;

    @PostMapping("/new")
    public void createAccount(@RequestBody CreateAccountDTO dto) {
        accountService.createAccount(dto);
    }

    @PostMapping("/update")
    public void updateAccount(@RequestBody UpdateAccountDTO dto) {
        accountService.updateAccount(dto);
    }

    @GetMapping
    public ResponseEntity<AccountDTO> findAccount(@RequestParam Long id) {
        return ResponseEntity.ok(accountService.findAccount(id));
    }
}
