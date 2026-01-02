package com.reservio.service;

import com.reservio.entity.UserData;
import com.reservio.repo.UserDataRepo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserDataService {

    private final UserDataRepo userDataRepo;

    public UserDataService(UserDataRepo userDataRepo) {
        this.userDataRepo = userDataRepo;
    }

    @Transactional
    public UserData registerUser(String username, String email, String password) {
        UserData user = UserData.builder()
                .username(username)
                .email(email)
                .password(password)
                .build();
        return userDataRepo.save(user);
    }
}
