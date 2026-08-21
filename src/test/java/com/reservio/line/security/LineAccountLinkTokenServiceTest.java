package com.reservio.line.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LineAccountLinkTokenServiceTest {

    private final LineAccountLinkTokenService service = new LineAccountLinkTokenService();

    @Test
    void generatesDistinctUrlSafeTokensAndStableHashes() {
        String first = service.generateToken();
        String second = service.generateToken();

        String firstHash = service.hash(first);
        String firstHashAgain = service.hash(first);
        String secondHash = service.hash(second);

        assertThat(first)
                .isNotEqualTo(second)
                .matches("[A-Za-z0-9_-]+");

        assertThat(firstHash)
                .isEqualTo(firstHashAgain)
                .isNotEqualTo(secondHash)
                .hasSize(64);
    }
}
