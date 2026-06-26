package com.reservio.line.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import com.reservio.line.entity.LineCustomer;
import com.reservio.line.repo.LineCustomerRepo;
import com.reservio.repo.UserDataRepo;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import static com.reservio.enums.Role.ROLE_USER;

@Service
public class LineCustomerService {

    private final LineCustomerRepo lineCustomerRepo;
    private final UserDataRepo userDataRepo;
    private final PasswordEncoder passwordEncoder;

    public LineCustomerService(
            LineCustomerRepo lineCustomerRepo,
            UserDataRepo userDataRepo,
            PasswordEncoder passwordEncoder) {
        this.lineCustomerRepo = lineCustomerRepo;
        this.userDataRepo = userDataRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public UserData getOrCreateUser(
            BusinessData business,
            String lineUserId,
            String displayName,
            String phone) {
        return resolveCustomer(business, lineUserId, displayName, phone).reservationUser();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public LineCustomerResolution resolveCustomer(
            BusinessData business,
            String lineUserId,
            String displayName,
            String phone) {
        LineCustomer customer = lineCustomerRepo
                .findByBusinessIdAndLineUserId(business.getId(), lineUserId)
                .map(existing -> updateExisting(existing, displayName, phone))
                .orElseGet(() -> createCustomer(business, lineUserId, displayName, phone));
        UserData reservationUser = customer.getLinkedUser() != null
                ? customer.getLinkedUser()
                : customer.getUser();
        return new LineCustomerResolution(
                customer,
                reservationUser,
                customer.getLinkedUser() != null
        );
    }

    @Transactional(readOnly = true)
    public Optional<LineCustomerPrefill> findLinkedPrefill(
            Long businessId,
            String lineUserId) {
        return lineCustomerRepo.findByBusinessIdAndLineUserId(businessId, lineUserId)
                .filter(customer -> customer.getLinkedUser() != null)
                .map(customer -> new LineCustomerPrefill(
                        normalize(customer.getDisplayName()),
                        normalize(customer.getPhone())
                ));
    }

    private LineCustomer updateExisting(
            LineCustomer customer,
            String displayName,
            String phone) {
        customer.setDisplayName(displayName);
        customer.setPhone(phone);
        customer.setUpdatedAt(LocalDateTime.now());
        lineCustomerRepo.save(customer);
        return customer;
    }

    private LineCustomer createCustomer(
            BusinessData business,
            String lineUserId,
            String displayName,
            String phone) {
        String suffix = UUID.randomUUID().toString().replace("-", "");
        UserData user = userDataRepo.save(UserData.builder()
                .username("line_customer_" + business.getId() + "_" + suffix)
                .email((suffix + "." + business.getId() + "@line.local").toLowerCase(Locale.ROOT))
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(ROLE_USER.name())
                .mustChangePassword(false)
                .build());
        LineCustomer customer = LineCustomer.builder()
                .business(business)
                .user(user)
                .lineUserId(lineUserId)
                .displayName(displayName)
                .phone(phone)
                .createdAt(LocalDateTime.now())
                .build();
        return lineCustomerRepo.save(customer);
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
