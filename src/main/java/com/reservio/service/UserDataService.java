package com.reservio.service;

import com.reservio.entity.UserData;
import com.reservio.repo.UserDataRepo;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDataService {

    private final UserDataRepo userDataRepo;
    private final PasswordEncoder passwordEncoder;

    public UserDataService(UserDataRepo userDataRepo, PasswordEncoder passwordEncoder) {
        this.userDataRepo = userDataRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserData registerUser(String username, String email, String password) {
        UserData user = UserData.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .build();
        return userDataRepo.save(user);
    }
}
