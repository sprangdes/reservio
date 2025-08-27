package org.machi.reservio.handler;

import com.linecorp.bot.model.event.Event;
import com.linecorp.bot.model.event.MessageEvent;
import com.linecorp.bot.model.event.message.TextMessageContent;
import com.linecorp.bot.model.message.TextMessage;
import com.linecorp.bot.spring.boot.annotation.EventMapping;
import com.linecorp.bot.spring.boot.annotation.LineMessageHandler;
import jakarta.annotation.Resource;
import org.machi.reservio.service.AccountService;

@LineMessageHandler
public class Handler {

    @Resource
    private AccountService userService;

    @EventMapping
    public TextMessage handleTextMessageEvent(MessageEvent<TextMessageContent> event) {

        String userId = event.getSource().getUserId();
        String message = event.getMessage().getText();
        userService.registerUser(userId);
        return new TextMessage(message);
    }

    @EventMapping
    public void handleDefaultMessageEvent(Event event) {
        // do nothing
    }
}
