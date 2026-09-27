# 18. 生產級 Docker Compose 架構：PostgreSQL 連線池優化

雖然 SQLite 適合本機快速體驗，但在正式的企業生產環境中，高頻併發寫入極易觸發 `SQLITE_BUSY: database is locked` 錯誤，導致工作流掛起或崩潰。自 n8n 2.0 起官方已移除 MySQL 相容層，**PostgreSQL 成為官方唯一推薦且深度優化的生產級關聯資料庫**。

本章將給出完整的企業級單節點 Docker Compose 生產部署範本，並深入連線池調優與安全加固。

---

## 一、生產架構拓撲

```mermaid
flowchart TD
    Internet["外部 HTTPS 流量 (443)"] --> Proxy["反向代理 (Nginx / Caddy / Traefik)<br/>處理 SSL 憑證終止與 Rate Limit"]
    Proxy -->|內部轉發 (5678)| N8N["n8n 核心容器 (Non-root 執行)<br/>NODE_ENV=production"]
    N8N -->|專用內部 Docker 網路 (n8n-net)| PG[("PostgreSQL 16+ 容器<br/>專用資料庫與高效連線池")]
    PG --> VolPG[("本機磁碟具名卷 postgres_data")]
    N8N --> VolN8N[("本機磁碟具名卷 n8n_data")]
```

---

## 二、生產級 docker-compose.single.yml 實戰設定

在伺服器目錄建立 `docker-compose.yml`：

```yaml
version: '3.8'

networks:
  n8n-network:
    driver: bridge

services:
  postgres:
    image: postgres:16-alpine
    container_name: n8n-postgres
    restart: unless-stopped
    networks:
      - n8n-network
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-n8n_db_user}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-SuperSecurePassword2026!}
      - POSTGRES_DB=${POSTGRES_DB:-n8n_production}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h localhost -U ${POSTGRES_USER:-n8n_db_user} -d ${POSTGRES_DB:-n8n_production}"]
      interval: 5s
      timeout: 5s
      retries: 10

  n8n:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: n8n-server
    restart: unless-stopped
    networks:
      - n8n-network
    depends_on:
      postgres:
        condition: service_healthy
    ports:
      - "127.0.0.1:5678:5678" # 僅綁定本機 Loopback，由外層反向代理暴露
    environment:
      # 基礎環境配置
      - NODE_ENV=production
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - N8N_HOST=n8n.yourcompany.com
      - WEBHOOK_URL=https://n8n.yourcompany.com/
      - GENERIC_TIMEZONE=Asia/Taipei
      
      # 資料庫連線配置
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=${POSTGRES_DB:-n8n_production}
      - DB_POSTGRESDB_USER=${POSTGRES_USER:-n8n_db_user}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD:-SuperSecurePassword2026!}
      - DB_POSTGRESDB_POOL_SIZE=50 # 連線池大小調優 (預設 24)
      
      # 憑證加密與安全
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_RUNNERS_ENABLED=true
      
      # 資料生命週期清理
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168 # 保留 7 天
      - EXECUTIONS_DATA_PRUNE_MAX_COUNT=50000
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  postgres_data:
    external: false
  n8n_data:
    external: false
```

---

## 三、關鍵生產環境調優項說明

### 3.1 連線池大小 (DB_POSTGRESDB_POOL_SIZE)
預設連線池大小為 24。在每秒有數十個 Webhook 或定時任務併發時，連線可能耗盡等待。
- 建議設定為 `50` ~ `100`。
- 同時請確保 PostgreSQL 容器的 `max_connections` 大於該數值（PostgreSQL 16 預設為 100）。

### 3.2 網路安全與連接埠綁定
請注意上面設定中的：
```yaml
ports:
  - "127.0.0.1:5678:5678"
```
{% hint style="warning" %}
**嚴禁將 5678 直接開放至公網 `0.0.0.0:5678`**！  
綁定 `127.0.0.1` 能強制所有外部存取必須經由具備 TLS 憑證的反向代理（如 Nginx），從而隔絕未加密的明文 HTTP 傳輸。
{% endhint %}

---

## 四、資料庫自動備份策略 (Cron Backup)

定時備份 PostgreSQL 是企業不可妥協的底線。您可以在主機建立一組簡易備份腳本：

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/n8n"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"

# 透過 pg_dump 備份為壓縮檔
docker exec -t n8n-postgres pg_dump -U n8n_db_user n8n_production | gzip > "$BACKUP_DIR/n8n_backup_$TIMESTAMP.sql.gz"

# 僅保留最近 30 天備份
find "$BACKUP_DIR" -type f -name "*.sql.gz" -mtime +30 -exec rm {} \;
```

---

## 五、本章總結

- 生產環境必須採用 **PostgreSQL** 取代 SQLite。
- 合理調整 `DB_POSTGRESDB_POOL_SIZE` 以應對高併發吞吐。
- 嚴格遵守安全性原則：僅對外暴露反向代理端口、啟動 Task Runner 沙盒與定期資料庫備份。

當單一伺服器的 CPU 與記憶體達到極限時，如何橫向擴展？在下一章中，我們將學習企業級架構的終極形態——**Redis Queue Mode 高併發擴展**！
