package com.reservio.line.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import com.reservio.line.entity.LineCustomer;
import com.reservio.line.repo.LineCustomerRepo;
import com.reservio.repo.UserDataRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LineCustomerServiceTest {

    @Mock private LineCustomerRepo lineCustomerRepo;
    @Mock private UserDataRepo userDataRepo;
    @Mock private PasswordEncoder passwordEncoder;

    @Test
    void createsNonLoginUserForFirstBusinessLineCustomer() {
        BusinessData business = BusinessData.builder().id(8L).build();
        when(lineCustomerRepo.findByBusinessIdAndLineUserId(8L, "line-user")).thenReturn(Optional.empty());
        when(passwordEncoder.encode(any())).thenReturn("encoded-random-password");
        when(userDataRepo.save(any(UserData.class))).thenAnswer(invocation -> {
            UserData user = invocation.getArgument(0);
            user.setId(30L);
            return user;
        });
        when(lineCustomerRepo.save(any(LineCustomer.class))).thenAnswer(invocation -> invocation.getArgument(0));
        LineCustomerService service = new LineCustomerService(
                lineCustomerRepo, userDataRepo, passwordEncoder
        );

        UserData user = service.getOrCreateUser(business, "line-user", "王小明", "0912345678");

        assertThat(user.getId()).isEqualTo(30L);
        assertThat(user.getRole()).isEqualTo("ROLE_USER");
        assertThat(user.getUsername()).startsWith("line_customer_8_");
        assertThat(user.getEmail()).endsWith("@line.local");
        verify(lineCustomerRepo).save(any(LineCustomer.class));
    }

    @Test
    void updatesExistingCustomerContactData() {
        UserData user = UserData.builder().id(30L).build();
        LineCustomer existing = LineCustomer.builder()
                .id(1L)
                .user(user)
                .displayName("舊名字")
                .phone("0900")
                .build();
        when(lineCustomerRepo.findByBusinessIdAndLineUserId(8L, "line-user"))
                .thenReturn(Optional.of(existing));
        LineCustomerService service = new LineCustomerService(
                lineCustomerRepo, userDataRepo, passwordEncoder
        );

        UserData result = service.getOrCreateUser(
                BusinessData.builder().id(8L).build(),
                "line-user",
                "王小明",
                "0912345678"
        );

        assertThat(result).isSameAs(user);
        assertThat(existing.getDisplayName()).isEqualTo("王小明");
        assertThat(existing.getPhone()).isEqualTo("0912345678");
        verify(lineCustomerRepo).save(existing);
    }
}
