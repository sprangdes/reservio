package com.reservio.line.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.security.LineCredentialCipher;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Base64;

import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

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
}
