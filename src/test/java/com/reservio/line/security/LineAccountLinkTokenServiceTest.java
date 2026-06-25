package com.reservio.line.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LineAccountLinkTokenServiceTest {

    private final LineAccountLinkTokenService service = new LineAccountLinkTokenService();

    @Test
    void generatesDistinctUrlSafeTokensAndStableHashes() {
        String first = service.generateToken();
        String second = service.generateToken();

        assertThat(first).isNotEqualTo(second);
        assertThat(first).matches("[A-Za-z0-9_-]+");
        assertThat(service.hash(first))
                .isEqualTo(service.hash(first))
                .isNotEqualTo(service.hash(second))
                .hasSize(64);
    }
}
