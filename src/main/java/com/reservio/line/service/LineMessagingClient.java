package com.reservio.line.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.security.LineCredentialCipher;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class LineMessagingClient {

    private static final String REPLY_URL = "https://api.line.me/v2/bot/message/reply";

    private final RestClient restClient;
    private final LineCredentialCipher cipher;
    private final ObjectMapper objectMapper;

    public LineMessagingClient(
            RestClient.Builder restClientBuilder,
            LineCredentialCipher cipher,
            ObjectMapper objectMapper) {
        this.restClient = restClientBuilder.build();
        this.cipher = cipher;
        this.objectMapper = objectMapper;
    }

    public void replyText(BusinessLineChannel channel, String replyToken, String text) {
        String accessToken = cipher.decrypt(channel.getAccessTokenCiphertext());
        String requestBody = serialize(Map.of(
                "replyToken", replyToken,
                "messages", List.of(Map.of("type", "text", "text", text))
        ));
        restClient.post()
                .uri(REPLY_URL)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .toBodilessEntity();
    }

    private String serialize(Map<String, Object> body) {
        try {
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("LINE reply message 序列化失敗", exception);
        }
    }
}
