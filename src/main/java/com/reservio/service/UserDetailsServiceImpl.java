package com.reservio.service;

import com.reservio.entity.UserData;
import com.reservio.repo.UserDataRepo;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserDataRepo userDataRepo;

    public UserDetailsServiceImpl(UserDataRepo userDataRepo) {
        this.userDataRepo = userDataRepo;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserData user = userDataRepo.findByUsername(username);

        if (user == null) {
            throw new UsernameNotFoundException("找不到使用者: " + username);
        }
        return new User(
                user.getUsername(),
                user.getPassword(),
                Collections.emptyList()
        );
    }
}
