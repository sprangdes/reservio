package com.reservio.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import com.reservio.exception.UserAlreadyExistsException;
import com.reservio.exception.UserNotFoundException;
import com.reservio.repo.BusinessDataRepo;
import com.reservio.repo.UserDataRepo;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static com.reservio.enums.Role.ROLE_BUSINESS;
import static com.reservio.enums.Role.ROLE_USER;

@Service
public class UserDataService {

    private final UserDataRepo userDataRepo;
    private final PasswordEncoder passwordEncoder;
    private final BusinessDataRepo businessDataRepo;

    public UserDataService(UserDataRepo userDataRepo, PasswordEncoder passwordEncoder, BusinessDataRepo businessDataRepo) {
        this.userDataRepo = userDataRepo;
        this.passwordEncoder = passwordEncoder;
        this.businessDataRepo = businessDataRepo;
    }

    @Transactional
    public UserData registerUser(String username, String email, String password) throws UserAlreadyExistsException {
        accountExistCheck(username, email);

        UserData user = UserData.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(ROLE_USER.name())
                .build();
        return userDataRepo.save(user);
    }

    @Transactional
    public UserData registerBusinessUser(
            String username,
            String email,
            String password,
            String businessName,
            String category,
            String phone,
            String address) throws UserAlreadyExistsException {
        accountExistCheck(username, email);

        UserData user = UserData.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(password))
                .role(ROLE_BUSINESS.name())
                .build();

        BusinessData businessData = BusinessData.builder()
                .name(businessName)
                .category(category)
                .phone(phone)
                .address(address)
                .user(user)
                .build();

        user.setBusinessData(businessData);
        return userDataRepo.save(user);
    }

    public UserData getCurrentUser() throws UserNotFoundException {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String username;

        if (principal instanceof UserDetails userDetails) {
            username = userDetails.getUsername();
        } else {
            username = principal.toString();
        }

        UserData user = userDataRepo.findByUsername(username);
        if (user == null) {
            throw new UserNotFoundException("找不到當前登入的使用者: " + username);
        }
        return user;
    }

    public void setPreferredBusinesses(List<Long> preferredBusinesses) {
        UserData user = getCurrentUser();
        user.setPreferredBusinesses(preferredBusinesses);
        userDataRepo.save(user);
    }

    public List<BusinessData> getPreferredBusinesses() {
        UserData user = getCurrentUser();
        List<Long> preferBusinessIds = user.getPreferredBusinesses();
        if (preferBusinessIds == null || preferBusinessIds.isEmpty()) {
            return List.of();
        }

        return user.getPreferredBusinesses().stream()
                .map(id -> businessDataRepo.findById(id).orElse(null))
                .toList();
    }

    private void accountExistCheck(String username, String email) {
        if (userDataRepo.existsByEmail(email)) {
            throw new UserAlreadyExistsException("此電子郵件已被註冊");
        }

        if (userDataRepo.existsByUsername(username)) {
            throw new UserAlreadyExistsException("此使用者名稱已被使用");
        }
    }
}
