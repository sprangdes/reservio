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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class LineMessagingClient {

    private static final Logger log = LoggerFactory.getLogger(LineMessagingClient.class);
    private static final String REPLY_URL = "https://api.line.me/v2/bot/message/reply";
    private static final String BOT_INFO_URL = "https://api.line.me/v2/bot/info";
    private static final String WEBHOOK_ENDPOINT_URL =
            "https://api.line.me/v2/bot/channel/webhook/endpoint";
    private static final String RICH_MENU_URL = "https://api.line.me/v2/bot/richmenu";
    public static final String BEARER = "Bearer ";

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
        Map<String, Object> message;
        if (replyMessage.flexContents() != null && !replyMessage.flexContents().isEmpty()) {
            message = Map.of(
                    "type", "flex",
                    "altText", replyMessage.text(),
                    "contents", replyMessage.flexContents()
            );
        } else if (replyMessage.actionUri() != null && !replyMessage.actionUri().isBlank()) {
            message = Map.of(
                    "type", "template",
                    "altText", replyMessage.text(),
                    "template", Map.of(
                            "type", "buttons",
                            "text", replyMessage.text(),
                            "actions", List.of(Map.of(
                                    "type", "uri",
                                    "label", replyMessage.actionLabel(),
                                    "uri", replyMessage.actionUri()
                            ))
                    )
            );
        } else {
            message = new LinkedHashMap<>();
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
        }
        String requestBody = serialize(Map.of(
                "replyToken", replyToken,
                "messages", List.of(message)
        ));
        execute(channel, "reply", () -> {
            restClient.post()
                    .uri(REPLY_URL)
                    .header(HttpHeaders.AUTHORIZATION, BEARER + accessToken)
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

    public String issueLinkToken(BusinessLineChannel channel, String lineUserId) {
        String response = execute(channel, "issue_link_token", () -> restClient.post()
                .uri("https://api.line.me/v2/bot/user/{userId}/linkToken", lineUserId)
                .header(HttpHeaders.AUTHORIZATION, BEARER + accessToken(channel))
                .retrieve()
                .body(String.class));
        String linkToken = parse(response).path("linkToken").asText();
        if (linkToken.isBlank()) {
            throw new IllegalStateException("LINE API 未回傳 Account Link Token");
        }
        return linkToken;
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
        String response = execute(channel, "create_rich_menu", () -> restClient.post()
                .uri(RICH_MENU_URL)
                .header(HttpHeaders.AUTHORIZATION, BEARER + accessToken)
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
        execute(channel, "upload_rich_menu_image", () -> {
            restClient.post()
                    .uri("https://api-data.line.me/v2/bot/richmenu/{richMenuId}/content", richMenuId)
                    .header(HttpHeaders.AUTHORIZATION, BEARER + accessToken(channel))
                    .contentType(MediaType.IMAGE_PNG)
                    .body(image)
                    .retrieve()
                    .toBodilessEntity();
            return null;
        });
    }

    public void setDefaultRichMenu(BusinessLineChannel channel, String richMenuId) {
        execute(channel, "set_default_rich_menu", () -> {
            restClient.post()
                    .uri("https://api.line.me/v2/bot/user/all/richmenu/{richMenuId}", richMenuId)
                    .header(HttpHeaders.AUTHORIZATION, BEARER + accessToken(channel))
                    .retrieve()
                    .toBodilessEntity();
            return null;
        });
    }

    public void linkRichMenuToUser(
            BusinessLineChannel channel,
            String lineUserId,
            String richMenuId) {
        execute(channel, "link_rich_menu_to_user", () -> {
            restClient.post()
                    .uri(
                            "https://api.line.me/v2/bot/user/{userId}/richmenu/{richMenuId}",
                            lineUserId,
                            richMenuId
                    )
                    .header(HttpHeaders.AUTHORIZATION, BEARER + accessToken(channel))
                    .retrieve()
                    .toBodilessEntity();
            return null;
        });
    }

    public void unlinkRichMenuFromUser(BusinessLineChannel channel, String lineUserId) {
        execute(channel, "unlink_rich_menu_from_user", () -> {
            restClient.delete()
                    .uri("https://api.line.me/v2/bot/user/{userId}/richmenu", lineUserId)
                    .header(HttpHeaders.AUTHORIZATION, BEARER + accessToken(channel))
                    .retrieve()
                    .toBodilessEntity();
            return null;
        });
    }

    public void deleteRichMenu(BusinessLineChannel channel, String richMenuId) {
        execute(channel, "delete_rich_menu", () -> {
            restClient.delete()
                    .uri("https://api.line.me/v2/bot/richmenu/{richMenuId}", richMenuId)
                    .header(HttpHeaders.AUTHORIZATION, BEARER + accessToken(channel))
                    .retrieve()
                    .toBodilessEntity();
            return null;
        });
    }

    private String authorizedGet(BusinessLineChannel channel, String url) {
        return execute(channel, operationName(url), () -> restClient.get()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, BEARER + accessToken(channel))
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

    private String operationName(String url) {
        if (BOT_INFO_URL.equals(url)) {
            return "get_bot_info";
        }
        if (WEBHOOK_ENDPOINT_URL.equals(url)) {
            return "get_webhook_endpoint";
        }
        return "get";
    }

    private <T> T execute(
            BusinessLineChannel channel,
            String operation,
            Supplier<T> request) {
        long startedAt = System.nanoTime();
        Long businessId = channel.getBusiness() == null
                ? null
                : channel.getBusiness().getId();
        try {
            T response = request.get();
            log.info(
                    "line_api business_id={} operation={} latency_ms={} outcome=SUCCESS",
                    businessId,
                    operation,
                    elapsedMillis(startedAt)
            );
            return response;
        } catch (RestClientResponseException exception) {
            int status = exception.getStatusCode().value();
            if (status == 401 || status == 403) {
                logFailure(businessId, operation, startedAt, LineApiError.AUTHORIZATION);
                throw new LineApiException(
                        LineApiError.AUTHORIZATION, "LINE API authorization failed", exception);
            }
            if (status == 429) {
                logFailure(businessId, operation, startedAt, LineApiError.RATE_LIMIT);
                throw new LineApiException(
                        LineApiError.RATE_LIMIT, "LINE API rate limit exceeded", exception);
            }
            logFailure(businessId, operation, startedAt, LineApiError.OTHER);
            throw new LineApiException(
                    LineApiError.OTHER, "LINE API request failed: " + status, exception);
        } catch (ResourceAccessException exception) {
            logFailure(businessId, operation, startedAt, LineApiError.TIMEOUT);
            throw new LineApiException(
                    LineApiError.TIMEOUT, "LINE API request timed out", exception);
        }
    }

    private void logFailure(
            Long businessId,
            String operation,
            long startedAt,
            LineApiError error) {
        log.warn(
                "line_api business_id={} operation={} latency_ms={} outcome=FAILED error_type={}",
                businessId,
                operation,
                elapsedMillis(startedAt),
                error
        );
    }

    private long elapsedMillis(long startedAt) {
        return (System.nanoTime() - startedAt) / 1_000_000;
    }

    private String serialize(Map<String, Object> body) {
        try {
            return objectMapper.writeValueAsString(body);
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("LINE reply message 序列化失敗", exception);
        }
    }
}
