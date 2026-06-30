package com.reservio.line.service;

import com.reservio.entity.BusinessData;
import com.reservio.entity.UserData;
import com.reservio.enums.ReservationSource;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.entity.LineAccountLink;
import com.reservio.line.entity.LineAccountLinkStatus;
import com.reservio.line.entity.LineCustomer;
import com.reservio.line.repo.LineAccountLinkRepo;
import com.reservio.line.repo.BusinessLineChannelRepo;
import com.reservio.line.repo.LineCustomerRepo;
import com.reservio.line.security.LineAccountLinkTokenService;
import com.reservio.line.security.LineCredentialCipher;
import com.reservio.repo.ReservationRepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class LineAccountLinkServiceTest {

    @Mock private LineAccountLinkRepo linkRepo;
    @Mock private LineCustomerRepo customerRepo;
    @Mock private ReservationRepo reservationRepo;
    @Mock private LineMessagingClient messagingClient;
    @Mock private BusinessLineChannelRepo channelRepo;
    @Mock private LineRichMenuService richMenuService;

    private final Clock clock = Clock.fixed(
            Instant.parse("2026-06-25T02:00:00Z"),
            ZoneOffset.UTC
    );
    private final LineAccountLinkTokenService tokenService = new LineAccountLinkTokenService();
    private final LineCredentialCipher cipher = new LineCredentialCipher(
            Base64.getEncoder().encodeToString(new byte[32])
    );
    private LineAccountLinkService service;
    private BusinessData business;
    private BusinessLineChannel channel;
    private LineCustomer customer;

    @BeforeEach
    void setUp() {
        service = new LineAccountLinkService(
                linkRepo,
                customerRepo,
                reservationRepo,
                channelRepo,
                messagingClient,
                richMenuService,
                cipher,
                tokenService,
                clock
        );
        business = BusinessData.builder().id(8L).name("Reservio Salon").build();
        channel = BusinessLineChannel.builder().id(4L).business(business).build();
        customer = LineCustomer.builder()
                .id(3L)
                .business(business)
                .user(UserData.builder().id(30L).build())
                .lineUserId("U123")
                .build();
    }

    @Test
    void createsTenMinuteSingleUseRequest() {
        when(messagingClient.issueLinkToken(channel, "U123")).thenReturn("line-link-token");
        when(linkRepo.save(org.mockito.ArgumentMatchers.any()))
                .thenAnswer(invocation -> invocation.getArgument(0));

        String requestToken = service.create(channel, customer);

        ArgumentCaptor<LineAccountLink> captor = ArgumentCaptor.forClass(LineAccountLink.class);
        verify(linkRepo).save(captor.capture());
        LineAccountLink link = captor.getValue();
        assertThat(link.getRequestTokenHash()).isEqualTo(tokenService.hash(requestToken));
        assertThat(cipher.decrypt(link.getLineLinkTokenCiphertext())).isEqualTo("line-link-token");
        assertThat(link.getStatus()).isEqualTo(LineAccountLinkStatus.CREATED);
        assertThat(link.getExpiresAt()).isEqualTo(LocalDateTime.ofInstant(
                clock.instant().plusSeconds(600), ZoneOffset.UTC));
    }

    @Test
    void authenticatedCustomerConfirmationCreatesNonceAndLineUrl() {
        String requestToken = tokenService.generateToken();
        UserData target = UserData.builder().id(40L).role("ROLE_USER")
                .lineUserId("line-login-user").build();
        LineAccountLink link = pendingLink(requestToken);
        when(linkRepo.findByRequestTokenHash(tokenService.hash(requestToken)))
                .thenReturn(Optional.of(link));

        String url = service.confirm(requestToken, target);

        String nonce = url.substring(url.indexOf("nonce=") + 6);
        assertThat(url).startsWith(
                "https://access.line.me/dialog/bot/accountLink?linkToken=line-link-token&nonce=");
        assertThat(link.getNonceHash()).isEqualTo(tokenService.hash(nonce));
        assertThat(link.getTargetUser()).isSameAs(target);
        assertThat(link.getStatus()).isEqualTo(LineAccountLinkStatus.AWAITING_LINE);
        verify(linkRepo).save(link);
    }

    @Test
    void completionLinksCustomerAndTransfersMatchingLineReservations() {
        UserData target = UserData.builder().id(40L).role("ROLE_USER")
                .lineUserId("line-login-user").build();
        String nonce = tokenService.generateToken();
        LineAccountLink link = pendingLink("request-token");
        link.setNonceHash(tokenService.hash(nonce));
        link.setTargetUser(target);
        link.setStatus(LineAccountLinkStatus.AWAITING_LINE);
        when(linkRepo.findByNonceHash(tokenService.hash(nonce))).thenReturn(Optional.of(link));
        when(reservationRepo.transferLineReservations(
                business, customer.getUser(), target, ReservationSource.LINE)).thenReturn(2);

        int transferred = service.complete(channel, "U123", "ok", nonce);

        assertThat(transferred).isEqualTo(2);
        assertThat(customer.getLinkedUser()).isSameAs(target);
        assertThat(customer.getLinkedAt()).isNotNull();
        assertThat(link.getStatus()).isEqualTo(LineAccountLinkStatus.COMPLETED);
        verify(customerRepo).save(customer);
        verify(linkRepo).save(link);
    }

    @Test
    void rejectsCallbackFromDifferentLineUser() {
        String nonce = tokenService.generateToken();
        LineAccountLink link = pendingLink("request-token");
        link.setNonceHash(tokenService.hash(nonce));
        link.setTargetUser(UserData.builder().id(40L).role("ROLE_USER")
                .lineUserId("line-login-user").build());
        link.setStatus(LineAccountLinkStatus.AWAITING_LINE);
        when(linkRepo.findByNonceHash(tokenService.hash(nonce))).thenReturn(Optional.of(link));

        assertThatThrownBy(() -> service.complete(channel, "OTHER", "ok", nonce))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("不一致");
    }

    @Test
    void completedWebhookRedeliveryDoesNotTransferAgain() {
        String nonce = tokenService.generateToken();
        LineAccountLink link = pendingLink("request-token");
        link.setNonceHash(tokenService.hash(nonce));
        link.setStatus(LineAccountLinkStatus.COMPLETED);
        when(linkRepo.findByNonceHash(tokenService.hash(nonce))).thenReturn(Optional.of(link));

        int transferred = service.complete(channel, "U123", "ok", nonce);

        assertThat(transferred).isZero();
        verify(reservationRepo, never()).transferLineReservations(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    void linkedUserCanUnlinkWithoutMovingHistoricalReservationsBack() {
        UserData target = UserData.builder().id(40L).role("ROLE_USER")
                .lineUserId("line-login-user").build();
        customer.setLinkedUser(target);
        customer.setLinkedAt(LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC));
        when(customerRepo.findByIdAndLinkedUser(3L, target)).thenReturn(Optional.of(customer));
        when(channelRepo.findByBusinessId(8L)).thenReturn(Optional.of(channel));

        service.unlink(3L, target);

        assertThat(customer.getLinkedUser()).isNull();
        assertThat(customer.getLinkedAt()).isNull();
        verify(richMenuService).removeLinkedMenu(channel, "U123");
        verify(customerRepo).save(customer);
        verify(reservationRepo, never()).transferLineReservations(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any()
        );
    }

    @Test
    void menuFailureLeavesDatabaseLinkIntact() {
        UserData target = UserData.builder().id(40L).role("ROLE_USER")
                .lineUserId("line-login-user").build();
        customer.setLinkedUser(target);
        LocalDateTime linkedAt = LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
        customer.setLinkedAt(linkedAt);
        when(customerRepo.findByIdAndLinkedUser(3L, target)).thenReturn(Optional.of(customer));
        when(channelRepo.findByBusinessId(8L)).thenReturn(Optional.of(channel));
        org.mockito.Mockito.doThrow(new IllegalStateException("LINE API 503"))
                .when(richMenuService).removeLinkedMenu(channel, "U123");

        assertThatThrownBy(() -> service.unlink(3L, target))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("503");

        assertThat(customer.getLinkedUser()).isSameAs(target);
        assertThat(customer.getLinkedAt()).isEqualTo(linkedAt);
        verify(customerRepo, never()).save(customer);
    }

    @Test
    void persistenceFailureRestoresLinkedMenuAndInMemoryState() {
        UserData target = UserData.builder().id(40L).role("ROLE_USER")
                .lineUserId("line-login-user").build();
        customer.setLinkedUser(target);
        LocalDateTime linkedAt = LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
        customer.setLinkedAt(linkedAt);
        when(customerRepo.findByIdAndLinkedUser(3L, target)).thenReturn(Optional.of(customer));
        when(channelRepo.findByBusinessId(8L)).thenReturn(Optional.of(channel));
        org.mockito.Mockito.doThrow(new IllegalStateException("database unavailable"))
                .when(customerRepo).save(customer);

        assertThatThrownBy(() -> service.unlink(3L, target))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("database");

        assertThat(customer.getLinkedUser()).isSameAs(target);
        assertThat(customer.getLinkedAt()).isEqualTo(linkedAt);
        verify(richMenuService).assignLinkedMenu(channel, "U123");
    }

    @Test
    void createAndCompleteUseIndependentTransactions() throws Exception {
        Transactional create = LineAccountLinkService.class
                .getMethod("create", BusinessLineChannel.class, LineCustomer.class)
                .getAnnotation(Transactional.class);
        Transactional complete = LineAccountLinkService.class
                .getMethod(
                        "complete",
                        BusinessLineChannel.class,
                        String.class,
                        String.class,
                        String.class)
                .getAnnotation(Transactional.class);

        assertThat(create.propagation()).isEqualTo(Propagation.REQUIRES_NEW);
        assertThat(complete.propagation()).isEqualTo(Propagation.REQUIRES_NEW);
    }

    @Test
    void rejectsExpiredCallback() {
        String nonce = tokenService.generateToken();
        LineAccountLink link = pendingLink("request-token");
        link.setNonceHash(tokenService.hash(nonce));
        link.setTargetUser(UserData.builder().id(40L).role("ROLE_USER")
                .lineUserId("line-login-user").build());
        link.setStatus(LineAccountLinkStatus.AWAITING_LINE);
        link.setExpiresAt(LocalDateTime.ofInstant(clock.instant().minusSeconds(1), ZoneOffset.UTC));
        when(linkRepo.findByNonceHash(tokenService.hash(nonce))).thenReturn(Optional.of(link));

        assertThatThrownBy(() -> service.complete(channel, "U123", "ok", nonce))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("過期");
    }

    @Test
    void doesNotOverwriteAnotherLinkedReservioUser() {
        String nonce = tokenService.generateToken();
        UserData target = UserData.builder().id(40L).role("ROLE_USER")
                .lineUserId("line-login-user").build();
        customer.setLinkedUser(UserData.builder().id(41L).role("ROLE_USER")
                .lineUserId("other-line-login-user").build());
        LineAccountLink link = pendingLink("request-token");
        link.setNonceHash(tokenService.hash(nonce));
        link.setTargetUser(target);
        link.setStatus(LineAccountLinkStatus.AWAITING_LINE);
        when(linkRepo.findByNonceHash(tokenService.hash(nonce))).thenReturn(Optional.of(link));

        assertThatThrownBy(() -> service.complete(channel, "U123", "ok", nonce))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("其他 Reservio 帳號");
    }

    @Test
    void confirmationRequiresLineLoginIdentity() {
        String requestToken = tokenService.generateToken();
        UserData passwordUser = UserData.builder().id(40L).role("ROLE_USER").build();

        assertThatThrownBy(() -> service.confirm(requestToken, passwordUser))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("LINE 登入");
        verify(linkRepo, never()).findByRequestTokenHash(
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void rejectsSameLoginIdentityForAnotherMessagingUserInBusiness() {
        String nonce = tokenService.generateToken();
        UserData target = UserData.builder().id(40L).role("ROLE_USER")
                .lineUserId("line-login-user").build();
        LineAccountLink link = pendingLink("request-token");
        link.setNonceHash(tokenService.hash(nonce));
        link.setTargetUser(target);
        link.setStatus(LineAccountLinkStatus.AWAITING_LINE);
        when(linkRepo.findByNonceHash(tokenService.hash(nonce))).thenReturn(Optional.of(link));
        when(customerRepo.existsByBusinessIdAndLinkedUserAndIdNot(8L, target, 3L))
                .thenReturn(true);

        assertThatThrownBy(() -> service.complete(channel, "U123", "ok", nonce))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("同一商家");

        verify(customerRepo, never()).save(customer);
        verify(reservationRepo, never()).transferLineReservations(
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    private LineAccountLink pendingLink(String requestToken) {
        return LineAccountLink.builder()
                .id(9L)
                .business(business)
                .lineCustomer(customer)
                .requestTokenHash(tokenService.hash(requestToken))
                .lineLinkTokenCiphertext(cipher.encrypt("line-link-token"))
                .status(LineAccountLinkStatus.CREATED)
                .createdAt(LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC))
                .expiresAt(LocalDateTime.ofInstant(
                        clock.instant().plusSeconds(600), ZoneOffset.UTC))
                .build();
    }
}
