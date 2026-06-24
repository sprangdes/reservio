package com.reservio.line.security;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LineCredentialCipherTest {

    private final LineCredentialCipher cipher = new LineCredentialCipher(
            Base64.getEncoder().encodeToString(new byte[32])
    );

    @Test
    void encryptsAndDecryptsCredentialWithoutStoringPlaintext() {
        String encrypted = cipher.encrypt("line-secret-value");

        assertThat(encrypted).doesNotContain("line-secret-value");
        assertThat(cipher.decrypt(encrypted)).isEqualTo("line-secret-value");
    }

    @Test
    void rejectsTamperedCiphertext() {
        String encrypted = cipher.encrypt("line-secret-value");
        char replacement = encrypted.endsWith("A") ? 'B' : 'A';
        String tampered = encrypted.substring(0, encrypted.length() - 1) + replacement;

        assertThatThrownBy(() -> cipher.decrypt(tampered))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("LINE 憑證解密失敗");
    }

    @Test
    void rejectsEncryptionKeyThatIsNot256Bits() {
        String shortKey = Base64.getEncoder().encodeToString(new byte[16]);

        assertThatThrownBy(() -> new LineCredentialCipher(shortKey))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("LINE 憑證加密金鑰必須是 Base64 編碼的 32 bytes 金鑰");
    }
}
