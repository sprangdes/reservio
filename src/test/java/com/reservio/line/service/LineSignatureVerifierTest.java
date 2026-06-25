package com.reservio.line.service;

import org.junit.jupiter.api.Test;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;

class LineSignatureVerifierTest {

    private final LineSignatureVerifier verifier = new LineSignatureVerifier();

    @Test
    void acceptsValidSignature() throws Exception {
        String body = "{\"events\":[]}";
        String secret = "channel-secret";

        assertThat(verifier.isValid(body, signature(body, secret), secret)).isTrue();
    }

    @Test
    void rejectsInvalidOrMissingSignature() {
        assertThat(verifier.isValid("{\"events\":[]}", "invalid", "channel-secret")).isFalse();
        assertThat(verifier.isValid("{\"events\":[]}", null, "channel-secret")).isFalse();
    }

    private String signature(String body, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return Base64.getEncoder().encodeToString(mac.doFinal(body.getBytes(StandardCharsets.UTF_8)));
    }
}
