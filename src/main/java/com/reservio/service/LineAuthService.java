package com.reservio.service;

import com.reservio.entity.UserData;
import com.reservio.repo.UserDataRepo;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

import static com.reservio.enums.Role.ROLE_BUSINESS;
import static com.reservio.enums.Role.ROLE_USER;

@Service
public class LineAuthService {

    public static final String LINE_LOCAL = "@line.local";

    private final UserDataRepo userDataRepo;
    private final PasswordEncoder passwordEncoder;

    public LineAuthService(UserDataRepo userDataRepo, PasswordEncoder passwordEncoder) {
        this.userDataRepo = userDataRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserData findOrCreateUserByLine(String lineUserId, String registrationId, String displayName) {
        String role = resolveRole(registrationId);

        return userDataRepo.findByLineUserIdAndRole(lineUserId, role)
                .orElseGet(() -> createUserFromLine(lineUserId, role, displayName));
    }

    private UserData createUserFromLine(String lineUserId, String role, String displayName) {
        String base = lineUserId.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
        String normalized = base.isBlank() ? UUID.randomUUID().toString().replace("-", "") : base;
        String usernamePrefix = role.equals(ROLE_BUSINESS.name()) ? "line_b_" : "line_u_";

        String username = ensureUniqueUsername(usernamePrefix + normalized);
        if (displayName != null && !displayName.isBlank()) {
            String cleanedDisplayName = displayName.trim()
                    .replaceAll("\\s+", "_")
                    .replaceAll("[^\\p{L}\\p{N}_]", "");
            if (!cleanedDisplayName.isBlank()) {
                username = ensureUniqueUsername(cleanedDisplayName);
            }
        }
        String email = ensureUniqueEmail(normalized, role);

        UserData user = UserData.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role(role)
                .lineUserId(lineUserId)
                .mustChangePassword(false)
                .build();

        return userDataRepo.save(user);
    }

    private String resolveRole(String registrationId) {
        return switch (registrationId) {
            case "line-business" -> ROLE_BUSINESS.name();
            case "line-user" -> ROLE_USER.name();
            default -> throw new IllegalArgumentException("Unsupported LINE registration: " + registrationId);
        };
    }

    private String ensureUniqueUsername(String seed) {
        String candidate = (seed == null || seed.isBlank()) ? "line_user" : seed;
        if (!userDataRepo.existsByUsername(candidate)) {
            return candidate;
        }

        int suffix = 1;
        while (userDataRepo.existsByUsername(candidate + suffix)) {
            suffix++;
        }
        return candidate + suffix;
    }

    private String ensureUniqueEmail(String normalizedLineId, String role) {
        String base = normalizedLineId + "." + role.toLowerCase(Locale.ROOT) + LINE_LOCAL;
        if (!userDataRepo.existsByEmail(base)) {
            return base;
        }

        int suffix = 1;
        while (userDataRepo.existsByEmail(normalizedLineId + suffix + "." + role.toLowerCase(Locale.ROOT) + LINE_LOCAL)) {
            suffix++;
        }
        return normalizedLineId + suffix + "." + role.toLowerCase(Locale.ROOT) + LINE_LOCAL;
    }
}
