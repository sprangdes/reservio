package com.reservio.line.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.message.LineReplyMessage;
import com.reservio.line.security.LineCredentialCipher;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.ResourceAccessException;

import java.util.Base64;
import java.util.List;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;
import static org.springframework.http.HttpStatus.TOO_MANY_REQUESTS;

class LineMessagingClientTest {

    @Test
    void decryptsTokenOnlyWhenSendingReply() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        LineCredentialCipher cipher = new LineCredentialCipher(
                Base64.getEncoder().encodeToString(new byte[32])
        );
        LineMessagingClient client = new LineMessagingClient(builder, cipher, new ObjectMapper());
        BusinessLineChannel channel = BusinessLineChannel.builder()
                .accessTokenCiphertext(cipher.encrypt("access-token"))
                .build();
        server.expect(once(), requestTo("https://api.line.me/v2/bot/message/reply"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(content().json("""
                        {
                          "replyToken": "reply-token",
                          "messages": [{"type": "text", "text": "回覆內容"}]
                        }
                        """))
                .andRespond(withSuccess());

        client.replyText(channel, "reply-token", "回覆內容");

        server.verify();
    }

    @Test
    void sendsQuickReplyActionsWhenOptionsArePresent() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        LineCredentialCipher cipher = new LineCredentialCipher(
                Base64.getEncoder().encodeToString(new byte[32])
        );
        LineMessagingClient client = new LineMessagingClient(builder, cipher, new ObjectMapper());
        BusinessLineChannel channel = BusinessLineChannel.builder()
                .accessTokenCiphertext(cipher.encrypt("access-token"))
                .build();
        server.expect(once(), requestTo("https://api.line.me/v2/bot/message/reply"))
                .andExpect(content().json("""
                        {
                          "replyToken": "reply-token",
                          "messages": [{
                            "type": "text",
                            "text": "想預約什麼項目？",
                            "quickReply": {
                              "items": [
                                {"type":"action","action":{"type":"message","label":"剪髮","text":"剪髮"}},
                                {"type":"action","action":{"type":"message","label":"取消","text":"取消"}}
                              ]
                            }
                          }]
                        }
                        """))
                .andRespond(withSuccess());

        client.reply(channel, "reply-token",
                new LineReplyMessage("想預約什麼項目？", List.of("剪髮", "取消")));

        server.verify();
    }

    @Test
    void sendsUriButtonAsLineButtonsTemplate() {
        ClientFixture fixture = fixture();
        fixture.server.expect(once(), requestTo("https://api.line.me/v2/bot/message/reply"))
                .andExpect(content().json("""
                        {
                          "replyToken": "reply-token",
                          "messages": [{
                            "type": "template",
                            "altText": "預約已送出",
                            "template": {
                              "type": "buttons",
                              "text": "預約已送出",
                              "actions": [{
                                "type": "uri",
                                "label": "綁定 Reservio 帳號",
                                "uri": "https://www.reserv-io.com/line/account-link?request=token"
                              }]
                            }
                          }]
                        }
                        """))
                .andRespond(withSuccess());

        fixture.client.reply(fixture.channel, "reply-token",
                new LineReplyMessage(
                        "預約已送出",
                        List.of(),
                        "綁定 Reservio 帳號",
                        "https://www.reserv-io.com/line/account-link?request=token"
                ));

        fixture.server.verify();
    }

    @Test
    void sendsDatePickerQuickReplyAction() {
        ClientFixture fixture = fixture();
        fixture.server.expect(once(), requestTo("https://api.line.me/v2/bot/message/reply"))
                .andExpect(content().json("""
                        {
                          "replyToken": "reply-token",
                          "messages": [{
                            "type": "text",
                            "text": "想預約哪一天？請點選下方按鈕選擇日期。",
                            "quickReply": {
                              "items": [{
                                "type": "action",
                                "action": {
                                  "type": "datetimepicker",
                                  "label": "選擇日期",
                                  "data": "reservio.action=select_date",
                                  "mode": "date",
                                  "min": "2026-06-25",
                                  "max": "2026-09-25"
                                }
                              }]
                            }
                          }]
                        }
                        """))
                .andRespond(withSuccess());

        fixture.client.reply(fixture.channel, "reply-token",
                new LineReplyMessage(
                        "想預約哪一天？請點選下方按鈕選擇日期。",
                        List.of(),
                        null,
                        null,
                        "選擇日期",
                        "reservio.action=select_date",
                        LocalDate.of(2026, 6, 25),
                        LocalDate.of(2026, 9, 25)
                ));

        fixture.server.verify();
    }

    @Test
    void getsBotInfoToValidateAccessToken() {
        ClientFixture fixture = fixture();
        fixture.server.expect(once(), requestTo("https://api.line.me/v2/bot/info"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andRespond(withSuccess("""
                        {"userId":"U123","basicId":"@reservio","displayName":"Reservio OA"}
                        """, MediaType.APPLICATION_JSON));

        assertThat(fixture.client.getBotDisplayName(fixture.channel)).isEqualTo("Reservio OA");

        fixture.server.verify();
    }

    @Test
    void createsUploadsAndSetsDefaultRichMenu() {
        ClientFixture fixture = fixture();
        fixture.server.expect(once(), requestTo("https://api.line.me/v2/bot/richmenu"))
                .andExpect(content().json("""
                        {"name":"Reservio 預約選單","chatBarText":"預約服務","selected":true,"size":{"width":2500,"height":843},"areas":[]}
                        """))
                .andRespond(withSuccess("""
                        {"richMenuId":"richmenu-1"}
                        """, MediaType.APPLICATION_JSON));
        fixture.server.expect(once(), requestTo("https://api-data.line.me/v2/bot/richmenu/richmenu-1/content"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andRespond(withSuccess());
        fixture.server.expect(once(), requestTo(
                        "https://api.line.me/v2/bot/user/all/richmenu/richmenu-1"))
                .andRespond(withSuccess());

        String richMenuId = fixture.client.createRichMenu(fixture.channel, java.util.Map.of(
                "name", "Reservio 預約選單",
                "chatBarText", "預約服務",
                "selected", true,
                "size", java.util.Map.of("width", 2500, "height", 843),
                "areas", List.of()
        ));
        fixture.client.uploadRichMenuImage(fixture.channel, richMenuId, new byte[]{1, 2, 3});
        fixture.client.setDefaultRichMenu(fixture.channel, richMenuId);

        assertThat(richMenuId).isEqualTo("richmenu-1");
        fixture.server.verify();
    }

    @Test
    void issuesAccountLinkTokenForLineUser() {
        ClientFixture fixture = fixture();
        fixture.server.expect(once(), requestTo(
                        "https://api.line.me/v2/bot/user/U123/linkToken"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer access-token"))
                .andRespond(withSuccess("""
                        {"linkToken":"line-link-token"}
                        """, MediaType.APPLICATION_JSON));

        String linkToken = fixture.client.issueLinkToken(fixture.channel, "U123");

        assertThat(linkToken).isEqualTo("line-link-token");
        fixture.server.verify();
    }

    @Test
    void classifiesAuthorizationAndRateLimitFailures() {
        ClientFixture authorization = fixture();
        authorization.server.expect(once(), requestTo("https://api.line.me/v2/bot/info"))
                .andRespond(withStatus(UNAUTHORIZED));

        assertThatThrownBy(() -> authorization.client.getBotDisplayName(authorization.channel))
                .isInstanceOfSatisfying(LineApiException.class,
                        exception -> assertThat(exception.getError())
                                .isEqualTo(LineApiError.AUTHORIZATION));

        ClientFixture rateLimit = fixture();
        rateLimit.server.expect(once(), requestTo("https://api.line.me/v2/bot/info"))
                .andRespond(withStatus(TOO_MANY_REQUESTS));

        assertThatThrownBy(() -> rateLimit.client.getBotDisplayName(rateLimit.channel))
                .isInstanceOfSatisfying(LineApiException.class,
                        exception -> assertThat(exception.getError())
                                .isEqualTo(LineApiError.RATE_LIMIT));
    }

    @Test
    void classifiesNetworkTimeout() {
        ClientFixture fixture = fixture();
        fixture.server.expect(once(), requestTo("https://api.line.me/v2/bot/info"))
                .andRespond(request -> {
                    throw new ResourceAccessException("Read timed out");
                });

        assertThatThrownBy(() -> fixture.client.getBotDisplayName(fixture.channel))
                .isInstanceOfSatisfying(LineApiException.class,
                        exception -> assertThat(exception.getError())
                                .isEqualTo(LineApiError.TIMEOUT));
    }

    private ClientFixture fixture() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        LineCredentialCipher cipher = new LineCredentialCipher(
                Base64.getEncoder().encodeToString(new byte[32])
        );
        LineMessagingClient client = new LineMessagingClient(builder, cipher, new ObjectMapper());
        BusinessLineChannel channel = BusinessLineChannel.builder()
                .accessTokenCiphertext(cipher.encrypt("access-token"))
                .build();
        return new ClientFixture(client, channel, server);
    }

    private record ClientFixture(
            LineMessagingClient client,
            BusinessLineChannel channel,
            MockRestServiceServer server) {
    }
}
