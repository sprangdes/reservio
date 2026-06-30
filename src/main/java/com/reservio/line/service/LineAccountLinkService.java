package com.reservio.line.service;

import com.reservio.entity.UserData;
import com.reservio.enums.ReservationSource;
import com.reservio.line.entity.BusinessLineChannel;
import com.reservio.line.entity.LineAccountLink;
import com.reservio.line.entity.LineAccountLinkStatus;
import com.reservio.line.entity.LineCustomer;
import com.reservio.line.controller.response.LineAccountLinkStatusResponse;
import com.reservio.line.controller.response.LinkedLineBusinessResponse;
import com.reservio.line.repo.LineAccountLinkRepo;
import com.reservio.line.repo.BusinessLineChannelRepo;
import com.reservio.line.repo.LineCustomerRepo;
import com.reservio.line.security.LineAccountLinkTokenService;
import com.reservio.line.security.LineCredentialCipher;
import com.reservio.repo.ReservationRepo;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class LineAccountLinkService {

    private static final Logger log = LoggerFactory.getLogger(LineAccountLinkService.class);
    private static final int EXPIRY_MINUTES = 10;

    private final LineAccountLinkRepo linkRepo;
    private final LineCustomerRepo customerRepo;
    private final ReservationRepo reservationRepo;
    private final BusinessLineChannelRepo channelRepo;
    private final LineMessagingClient messagingClient;
    private final LineRichMenuService richMenuService;
    private final LineCredentialCipher cipher;
    private final LineAccountLinkTokenService tokenService;
    private final Clock clock;

    @Autowired
    public LineAccountLinkService(
            LineAccountLinkRepo linkRepo,
            LineCustomerRepo customerRepo,
            ReservationRepo reservationRepo,
            BusinessLineChannelRepo channelRepo,
            LineMessagingClient messagingClient,
            LineRichMenuService richMenuService,
            LineCredentialCipher cipher,
            LineAccountLinkTokenService tokenService) {
        this(linkRepo, customerRepo, reservationRepo, channelRepo, messagingClient,
                richMenuService, cipher, tokenService, Clock.systemUTC());
    }

    LineAccountLinkService(
            LineAccountLinkRepo linkRepo,
            LineCustomerRepo customerRepo,
            ReservationRepo reservationRepo,
            BusinessLineChannelRepo channelRepo,
            LineMessagingClient messagingClient,
            LineRichMenuService richMenuService,
            LineCredentialCipher cipher,
            LineAccountLinkTokenService tokenService,
            Clock clock) {
        this.linkRepo = linkRepo;
        this.customerRepo = customerRepo;
        this.reservationRepo = reservationRepo;
        this.channelRepo = channelRepo;
        this.messagingClient = messagingClient;
        this.richMenuService = richMenuService;
        this.cipher = cipher;
        this.tokenService = tokenService;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public String create(BusinessLineChannel channel, LineCustomer customer) {
        if (customer.getLinkedUser() != null) {
            throw new IllegalStateException("LINE 客戶已綁定 Reservio 帳號");
        }
        String requestToken = tokenService.generateToken();
        String lineLinkToken = messagingClient.issueLinkToken(channel, customer.getLineUserId());
        LocalDateTime now = now();
        LineAccountLink link = LineAccountLink.builder()
                .business(channel.getBusiness())
                .lineCustomer(customer)
                .requestTokenHash(tokenService.hash(requestToken))
                .lineLinkTokenCiphertext(cipher.encrypt(lineLinkToken))
                .status(LineAccountLinkStatus.CREATED)
                .createdAt(now)
                .expiresAt(now.plusMinutes(EXPIRY_MINUTES))
                .build();
        linkRepo.save(link);
        log.info("line_account_link_created business_id={} request_id={}",
                channel.getBusiness().getId(), link.getId());
        return requestToken;
    }

    @Transactional
    public String confirm(String requestToken, UserData targetUser) {
        if (targetUser == null || !"ROLE_USER".equals(targetUser.getRole())) {
            throw new IllegalArgumentException("必須使用 Reservio 客戶帳號進行綁定");
        }
        if (targetUser.getLineUserId() == null || targetUser.getLineUserId().isBlank()) {
            throw new IllegalArgumentException("必須使用 LINE 登入進行綁定");
        }
        LineAccountLink link = requireActiveRequest(requestToken);
        LineCustomer customer = link.getLineCustomer();
        if (customer.getLinkedUser() != null
                && !customer.getLinkedUser().getId().equals(targetUser.getId())) {
            throw new IllegalStateException("此 LINE 客戶已綁定其他 Reservio 帳號");
        }
        String nonce = tokenService.generateToken();
        link.setNonceHash(tokenService.hash(nonce));
        link.setTargetUser(targetUser);
        link.setStatus(LineAccountLinkStatus.AWAITING_LINE);
        linkRepo.save(link);
        log.info("line_account_link_confirmed business_id={} request_id={} target_user_id={}",
                link.getBusiness().getId(), link.getId(), targetUser.getId());
        return UriComponentsBuilder
                .fromUriString("https://access.line.me/dialog/bot/accountLink")
                .queryParam("linkToken", cipher.decrypt(link.getLineLinkTokenCiphertext()))
                .queryParam("nonce", nonce)
                .build()
                .toUriString();
    }

    @Transactional
    public LineAccountLinkStatusResponse status(String requestToken) {
        LineAccountLink link = linkRepo.findByRequestTokenHash(tokenService.hash(requestToken))
                .orElseThrow(() -> new IllegalArgumentException("找不到 LINE 帳號綁定請求"));
        if (link.getStatus() == LineAccountLinkStatus.CREATED
                && link.getExpiresAt().isBefore(now())) {
            link.setStatus(LineAccountLinkStatus.EXPIRED);
            linkRepo.save(link);
        }
        return new LineAccountLinkStatusResponse(
                link.getBusiness().getName(),
                link.getStatus().name(),
                link.getExpiresAt()
        );
    }

    @Transactional(readOnly = true)
    public List<LinkedLineBusinessResponse> linkedBusinesses(UserData currentUser) {
        return customerRepo.findAllByLinkedUser(currentUser).stream()
                .map(customer -> new LinkedLineBusinessResponse(
                        customer.getId(),
                        customer.getBusiness().getId(),
                        customer.getBusiness().getName(),
                        customer.getLinkedAt()
                ))
                .toList();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int complete(
            BusinessLineChannel channel,
            String lineUserId,
            String result,
            String nonce) {
        LineAccountLink link = linkRepo.findByNonceHash(tokenService.hash(nonce))
                .orElseThrow(() -> new IllegalArgumentException("找不到 LINE 帳號綁定請求"));
        if (link.getStatus() == LineAccountLinkStatus.COMPLETED) {
            return 0;
        }
        if (link.getExpiresAt().isBefore(now())) {
            throw new IllegalStateException("LINE 帳號綁定連結已過期");
        }
        if (!"ok".equals(result)) {
            link.setStatus(LineAccountLinkStatus.FAILED);
            linkRepo.save(link);
            return 0;
        }
        validateCallback(link, channel, lineUserId);
        LineCustomer customer = link.getLineCustomer();
        UserData targetUser = link.getTargetUser();
        if (targetUser.getLineUserId() == null || targetUser.getLineUserId().isBlank()) {
            throw new IllegalStateException("LINE 帳號綁定缺少 LINE Login 身分");
        }
        if (customer.getLinkedUser() != null
                && !customer.getLinkedUser().getId().equals(targetUser.getId())) {
            throw new IllegalStateException("此 LINE 客戶已綁定其他 Reservio 帳號");
        }
        if (customerRepo.existsByBusinessIdAndLinkedUserAndIdNot(
                link.getBusiness().getId(),
                targetUser,
                customer.getId())) {
            throw new IllegalStateException(
                    "此 LINE Login 帳號已在同一商家綁定其他 LINE 使用者，請先解除原綁定");
        }
        customer.setLinkedUser(targetUser);
        customer.setLinkedAt(now());
        customer.setUpdatedAt(now());
        customerRepo.save(customer);
        int transferred = reservationRepo.transferLineReservations(
                link.getBusiness(),
                customer.getUser(),
                targetUser,
                ReservationSource.LINE
        );
        link.setStatus(LineAccountLinkStatus.COMPLETED);
        link.setCompletedAt(now());
        linkRepo.save(link);
        log.info(
                "line_account_link_completed business_id={} request_id={} target_user_id={} transferred={}",
                link.getBusiness().getId(), link.getId(), targetUser.getId(), transferred);
        return transferred;
    }

    @Transactional
    public void unlink(Long lineCustomerId, UserData currentUser) {
        LineCustomer customer = customerRepo.findByIdAndLinkedUser(lineCustomerId, currentUser)
                .orElseThrow(() -> new IllegalArgumentException("找不到可解除的 LINE 帳號綁定"));
        BusinessLineChannel channel = channelRepo.findByBusinessId(customer.getBusiness().getId())
                .orElseThrow(() -> new IllegalStateException("尚未設定 LINE Messaging API"));
        richMenuService.removeLinkedMenu(channel, customer.getLineUserId());
        UserData linkedUser = customer.getLinkedUser();
        LocalDateTime linkedAt = customer.getLinkedAt();
        LocalDateTime updatedAt = customer.getUpdatedAt();
        try {
            customer.setLinkedUser(null);
            customer.setLinkedAt(null);
            customer.setUpdatedAt(now());
            customerRepo.save(customer);
        } catch (RuntimeException exception) {
            customer.setLinkedUser(linkedUser);
            customer.setLinkedAt(linkedAt);
            customer.setUpdatedAt(updatedAt);
            try {
                richMenuService.assignLinkedMenu(channel, customer.getLineUserId());
            } catch (RuntimeException compensationFailure) {
                log.warn(
                        "line_rich_menu_compensation_failed business_id={} line_customer_id={} error_type={}",
                        customer.getBusiness().getId(),
                        customer.getId(),
                        compensationFailure.getClass().getSimpleName()
                );
            }
            throw exception;
        }
        log.info("line_account_unlinked business_id={} line_customer_id={} user_id={}",
                customer.getBusiness().getId(), customer.getId(), currentUser.getId());
    }

    private LineAccountLink requireActiveRequest(String requestToken) {
        LineAccountLink link = linkRepo.findByRequestTokenHash(tokenService.hash(requestToken))
                .orElseThrow(() -> new IllegalArgumentException("找不到 LINE 帳號綁定請求"));
        if (link.getExpiresAt().isBefore(now())) {
            link.setStatus(LineAccountLinkStatus.EXPIRED);
            linkRepo.save(link);
            throw new IllegalStateException("LINE 帳號綁定連結已過期");
        }
        if (link.getStatus() != LineAccountLinkStatus.CREATED) {
            throw new IllegalStateException("LINE 帳號綁定連結已使用");
        }
        return link;
    }

    private void validateCallback(
            LineAccountLink link,
            BusinessLineChannel channel,
            String lineUserId) {
        if (link.getStatus() != LineAccountLinkStatus.AWAITING_LINE) {
            throw new IllegalStateException("LINE 帳號綁定狀態不正確");
        }
        if (!link.getBusiness().getId().equals(channel.getBusiness().getId())
                || !link.getLineCustomer().getLineUserId().equals(lineUserId)) {
            throw new IllegalArgumentException("LINE 帳號綁定資料不一致");
        }
        if (link.getTargetUser() == null) {
            throw new IllegalStateException("LINE 帳號綁定缺少目標帳號");
        }
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC);
    }
}
