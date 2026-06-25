package com.reservio.line.service;

import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.util.Base64;

@Component
public class LineSignatureVerifier {

    public boolean isValid(String body, String providedSignature, String channelSecret) {
        if (body == null || providedSignature == null || channelSecret == null) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(channelSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            byte[] provided = Base64.getDecoder().decode(providedSignature);
            return MessageDigest.isEqual(expected, provided);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            return false;
        }
    }
}
