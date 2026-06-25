package com.reservio.line.message;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class LineMessageFactoryTest {

    private final LineMessageFactory factory = new LineMessageFactory();

    @Test
    void createsQuickReplyMessage() {
        LineReplyMessage message = factory.quickReply("請選擇服務", List.of("剪髮", "染髮"));

        assertThat(message.text()).isEqualTo("請選擇服務");
        assertThat(message.options()).containsExactly("剪髮", "染髮");
    }

    @Test
    void limitsQuickRepliesToLineMaximum() {
        LineReplyMessage message = factory.quickReply(
                "請選擇",
                java.util.stream.IntStream.rangeClosed(1, 20).mapToObj(String::valueOf).toList()
        );

        assertThat(message.options()).hasSize(13);
    }

    @Test
    void createsUriButtonMessage() {
        LineReplyMessage message = factory.uriButton(
                "預約已送出",
                "綁定 Reservio 帳號",
                "https://www.reserv-io.com/line/account-link?request=token"
        );

        assertThat(message.text()).isEqualTo("預約已送出");
        assertThat(message.actionLabel()).isEqualTo("綁定 Reservio 帳號");
        assertThat(message.actionUri())
                .isEqualTo("https://www.reserv-io.com/line/account-link?request=token");
    }
}
