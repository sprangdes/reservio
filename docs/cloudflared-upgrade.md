# Cloudflare Tunnel 安全更新

本專案固定使用 `cloudflare/cloudflared:2026.10.3`。
必須在正式環境拉取映像並重建容器，單純 `docker restart` 不會更新。

## 更新前檢查

1. 在 Cloudflare 的 **Networking > Tunnels** 盤點所有 tunnel 與 connector。
   本專案的 Compose 更新只涵蓋 `reservio-cloudflared`，其他主機上的 instance 也必須更新。
2. 開啟此 tunnel 的 Published application routes，逐一檢查 origin 的 Service URL。
   若使用 HTTPS，先檢查該 origin 的完整憑證鏈；若包含受影響的 eMudhra/emSign
   intermediate，先更換 origin 憑證。不要透過 `noTLSVerify` 或關閉 TLS 驗證繞過錯誤。
   公開網域的 Cloudflare edge 憑證不能代替這項 origin 檢查。
   遠端管理的 routes 並未儲存在此 repository，必須在 dashboard 確認。
3. 確認 frontend、backend 正常運作，正式環境目錄內有原本的 `.env`，
   並已取得包含這次變更的程式碼。不要把 `.env` 或 tunnel token 貼到紀錄或對話中。
4. 更新期間暫停 release 部署，避免另一個部署同時重建容器或刪除暫時 replica。
   不要執行 `docker compose down`；它會同時停止原本的服務。

## MacBook Air 正式環境（Docker Compose）：先新增暫時 replica，再更新原容器

以下命令在 MacBook Air 的 Terminal 執行，且僅適用於 Docker Compose 安裝。
先切換至該主機上包含 `docker-compose.yml` 與正式環境 `.env` 的實際專案目錄。
每個階段確認成功後才進入下一階段；
若命令失敗，停止後續步驟。

### 1. 檢查現況並拉取修正版

```bash
# 將下列路徑替換為 MacBook Air 上的實際部署目錄。
cd "/path/to/reservio"
docker compose ps
docker compose exec cloudflared cloudflared --version
docker compose pull cloudflared
```

### 2. 啟動暫時 replica

```bash
docker compose run -d --no-deps --name reservio-cloudflared-upgrade cloudflared
docker exec reservio-cloudflared-upgrade cloudflared --version
docker logs --tail 100 reservio-cloudflared-upgrade
```

此容器使用相同 tunnel token 與 Compose network，因此能連線到原本的 frontend、backend。
若同名容器已存在，先確認其用途與健康狀態，不要直接刪除。

確認版本為 `2026.10.3`、日誌出現 `Registered tunnel connection`，
且 dashboard 顯示新增的 connector 已連線、tunnel 為 **Healthy**。
再開啟正式網站並確認 API 與登入入口可用。若有 origin TLS 錯誤，
停止更新並修正憑證，保留原本的 connector。

### 3. 重建原本的 connector

```bash
docker compose up -d --no-deps --force-recreate cloudflared
docker compose exec cloudflared cloudflared --version
docker compose logs --tail 100 cloudflared
```

確認原本 connector 的版本為 `2026.10.3`，已重新連線且 tunnel 為 **Healthy**，
再驗證網站、API 與登入入口。只要原本 connector 尚未恢復，就保留暫時 replica。
不要退回此次修正前的映像。

### 4. 移除暫時 replica

只有在原本 connector 已恢復且應用驗證成功後才執行：

```bash
docker stop --time 40 reservio-cloudflared-upgrade
docker rm reservio-cloudflared-upgrade
docker compose ps cloudflared
docker compose exec cloudflared cloudflared --version
```

最後再次確認 dashboard 的 tunnel 為 **Healthy**，所有仍在執行的 connector 都已更新。
在同一台 Docker 主機上的暫時 replica 可維持更新時的新流量，但無法防護主機故障。
舊 connector 上的 WebSocket、SSH 等長連線仍可能中斷，需要客戶端重新連線。

## MacBook Air 使用原生 cloudflared 時

先在 Terminal 確認執行版本與安裝來源：

```bash
command -v cloudflared
cloudflared --version
brew list --versions cloudflared
brew services list
```

若由 Homebrew 安裝，使用 `brew update` 與 `brew upgrade cloudflared`。
若服務也由 Homebrew 管理，更新後使用 `brew services restart cloudflared`；
其他啟動方式須重新啟動對應的 launchd 服務或程序，不能只更新磁碟上的執行檔。
若使用獨立執行檔，依官方更新文件升級至至少 `2026.10.3`。
重啟原本 instance 前，仍須先啟動並確認暫時 replica 已連線。
最後確認執行版本以及 dashboard 中實際 connector 的版本與 Healthy 狀態。

## 部署自動化現況

正式部署主機已改為 MacBook Air；repository 中的
`.github/workflows/deploy-on-release-tag.yml` 與 `scripts/windows/deploy.ps1`
仍指向舊 Windows 主機，不能作為目前 Mac 的更新命令。
在確認 Mac 的實際部署目錄、runner 標籤與服務啟動方式前，不應直接觸發舊流程。

## 其他主機與安裝方式

- Docker：拉取 `cloudflare/cloudflared:2026.10.3` 並重建每個 instance；多個 replica 逐一更新，
  每次都先確認新版已連線且 tunnel 為 Healthy。
- Kubernetes：至少兩個 replica，使用 rolling update 與 `/ready` readiness probe，
  確保新版 pod 已連線後才移除舊 pod。
- 套件管理器安裝：使用原套件管理器更新並重新啟動服務，確認執行版本至少為 `2026.10.2`。
- macOS 非 Homebrew 安裝：至少更新至 `2026.10.3`，並重新啟動實際執行的 instance。

## 官方來源

- [eMudhra 憑證事件](https://blog.cloudflare.com/emudhra-certificate-compromise/)
- [更新 cloudflared](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/update-cloudflared/)
- [部署 replicas](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/tunnel-availability/deploy-replicas/)
