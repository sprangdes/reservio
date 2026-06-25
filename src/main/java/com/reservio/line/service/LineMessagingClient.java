package com.reservio.line.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.message.LineReplyMessage;
import com.reservio.line.security.LineCredentialCipher;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;

import java.util.List;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Supplier;

@Component
public class LineMessagingClient {

    private static final String REPLY_URL = "https://api.line.me/v2/bot/message/reply";
    private static final String BOT_INFO_URL = "https://api.line.me/v2/bot/info";
    private static final String WEBHOOK_ENDPOINT_URL =
            "https://api.line.me/v2/bot/channel/webhook/endpoint";
    private static final String RICH_MENU_URL = "https://api.line.me/v2/bot/richmenu";

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
        reply(channel, replyToken, new LineReplyMessage(text, List.of()));
    }

    public void reply(BusinessLineChannel channel, String replyToken, LineReplyMessage replyMessage) {
        String accessToken = cipher.decrypt(channel.getAccessTokenCiphertext());
        Map<String, Object> message = new LinkedHashMap<>();
        message.put("type", "text");
        message.put("text", replyMessage.text());
        if (replyMessage.options() != null && !replyMessage.options().isEmpty()) {
            List<Map<String, Object>> items = new ArrayList<>();
            for (String option : replyMessage.options()) {
                items.add(Map.of(
                        "type", "action",
                        "action", Map.of(
                                "type", "message",
                                "label", option,
                                "text", option
                        )
                ));
            }
            message.put("quickReply", Map.of("items", items));
        }
        String requestBody = serialize(Map.of(
                "replyToken", replyToken,
                "messages", List.of(message)
        ));
        execute(() -> {
            restClient.post()
                    .uri(REPLY_URL)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .toBodilessEntity();
            return null;
        });
    }

    public String getBotDisplayName(BusinessLineChannel channel) {
        String body = authorizedGet(channel, BOT_INFO_URL);
        return parse(body).path("displayName").asText();
    }

    public LineWebhookEndpoint getWebhookEndpoint(BusinessLineChannel channel) {
        JsonNode response = parse(authorizedGet(channel, WEBHOOK_ENDPOINT_URL));
        return new LineWebhookEndpoint(
                response.path("endpoint").asText(),
                response.path("active").asBoolean()
        );
    }

    public String createRichMenu(BusinessLineChannel channel, Map<String, Object> definition) {
        String accessToken = accessToken(channel);
        String response = execute(() -> restClient.post()
                .uri(RICH_MENU_URL)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                .contentType(MediaType.APPLICATION_JSON)
                .body(serialize(definition))
                .retrieve()
                .body(String.class));
        String richMenuId = parse(response).path("richMenuId").asText();
        if (richMenuId.isBlank()) {
            throw new IllegalStateException("LINE API 未回傳 Rich Menu ID");
        }
        return richMenuId;
    }

    public void uploadRichMenuImage(
            BusinessLineChannel channel,
            String richMenuId,
            byte[] image) {
        execute(() -> {
            restClient.post()
                    .uri("https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content", richMenuId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(channel))
                    .contentType(MediaType.IMAGE_PNG)
                    .body(image)
                    .retrieve()
                    .toBodilessEntity();
            return null;
        });
    }

    public void setDefaultRichMenu(BusinessLineChannel channel, String richMenuId) {
        execute(() -> {
            restClient.post()
                    .uri("https://api.line.me/v2/bot/user/all/richmenu/{richMenuId}", richMenuId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(channel))
                    .retrieve()
                    .toBodilessEntity();
            return null;
        });
    }

    public void deleteRichMenu(BusinessLineChannel channel, String richMenuId) {
        execute(() -> {
            restClient.delete()
                    .uri("https://api.line.me/v2/bot/richmenu/{richMenuId}", richMenuId)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(channel))
                    .retrieve()
                    .toBodilessEntity();
            return null;
        });
    }

    private String authorizedGet(BusinessLineChannel channel, String url) {
        return execute(() -> restClient.get()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken(channel))
                .retrieve()
                .body(String.class));
    }

    private String accessToken(BusinessLineChannel channel) {
        return cipher.decrypt(channel.getAccessTokenCiphertext());
    }

    private JsonNode parse(String body) {
        try {
            return objectMapper.readTree(body);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("LINE API 回應格式錯誤", exception);
        }
    }

    private <T> T execute(Supplier<T> request) {
        try {
            return request.get();
        } catch (RestClientResponseException exception) {
            int status = exception.getStatusCode().value();
            if (status == 401 || status == 403) {
                throw new LineApiException(
                        LineApiError.AUTHORIZATION, "LINE API authorization failed", exception);
            }
            if (status == 429) {
                throw new LineApiException(
                        LineApiError.RATE_LIMIT, "LINE API rate limit exceeded", exception);
            }
            throw new LineApiException(
                    LineApiError.OTHER, "LINE API request failed: " + status, exception);
        } catch (ResourceAccessException exception) {
            throw new LineApiException(
                    LineApiError.TIMEOUT, "LINE API request timed out", exception);
        }
    }

    private String serialize(Map<String, Object> body) {
        try {
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("LINE reply message 序列化失敗", exception);
        }
    }
}
