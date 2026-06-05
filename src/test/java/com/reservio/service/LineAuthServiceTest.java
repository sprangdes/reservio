package com.reservio.service;

import com.reservio.entity.UserData;
import com.reservio.repo.UserDataRepo;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LineAuthServiceTest {

    @Mock
    private UserDataRepo userDataRepo;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Test
    void newLineBusinessAccountUsesEmptyPreferredBusinesses() {
        LineAuthService service = new LineAuthService(userDataRepo, passwordEncoder);
        when(userDataRepo.findByLineUserIdAndRole("line-id", "ROLE_BUSINESS"))
                .thenReturn(Optional.empty());
        when(userDataRepo.existsByUsername(any())).thenReturn(false);
        when(userDataRepo.existsByEmail(any())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");
        when(userDataRepo.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.findOrCreateUserByLine("line-id", "line-business", "Business Owner");

        ArgumentCaptor<UserData> captor = ArgumentCaptor.forClass(UserData.class);
        verify(userDataRepo).save(captor.capture());
        assertThat(captor.getValue().getPreferredBusinesses()).isEmpty();
    }
}
