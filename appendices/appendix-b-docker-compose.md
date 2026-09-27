# 附錄 B：完整 Docker Compose 與生產設定檔清單

本附錄提供三套完全可開箱即用、經過生產驗證的 Docker Compose 設定檔，所有檔案均同步保存在專案的 [`docker/`](file:///home/cosmo_chang/Projects/n8n-beginner-guide/docker) 目錄中。

---

## 一、方案一：單節點高可用生產版 (Single Node + PostgreSQL)

- 適用：中小型團隊、每日執行量 < 5 萬次。
- 儲存庫對應檔案：[`docker/docker-compose.single.yml`](file:///home/cosmo_chang/Projects/n8n-beginner-guide/docker/docker-compose.single.yml)

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
      - POSTGRES_USER=${POSTGRES_USER:-n8n_admin}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-SuperSecretDBPass2026!}
      - POSTGRES_DB=${POSTGRES_DB:-n8n_prod}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h localhost -U ${POSTGRES_USER:-n8n_admin} -d ${POSTGRES_DB:-n8n_prod}"]
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
      - "5678:5678"
    environment:
      - NODE_ENV=production
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=${WEBHOOK_URL:-https://n8n.yourcompany.com/}
      - GENERIC_TIMEZONE=Asia/Taipei
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=${POSTGRES_DB:-n8n_prod}
      - DB_POSTGRESDB_USER=${POSTGRES_USER:-n8n_admin}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD:-SuperSecretDBPass2026!}
      - DB_POSTGRESDB_POOL_SIZE=50
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - N8N_RUNNERS_ENABLED=true
      - EXECUTIONS_DATA_PRUNE=true
      - EXECUTIONS_DATA_MAX_AGE=168
      - EXECUTIONS_DATA_PRUNE_MAX_COUNT=50000
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  postgres_data:
  n8n_data:
```

---

## 二、方案二：企業分散式佇列模式 (Redis Queue Mode)

- 適用：大型企業、高頻 Webhook 流量、需要無停機水平擴展。
- 儲存庫對應檔案：[`docker/docker-compose.queue.yml`](file:///home/cosmo_chang/Projects/n8n-beginner-guide/docker/docker-compose.queue.yml)

```yaml
version: '3.8'

networks:
  n8n-cluster:
    driver: bridge

services:
  redis:
    image: redis:7-alpine
    container_name: n8n-redis
    restart: unless-stopped
    networks:
      - n8n-cluster
    command: redis-server --requirepass ${REDIS_PASSWORD:-RedisSuperPass2026!}
    volumes:
      - redis_data:/data

  postgres:
    image: postgres:16-alpine
    container_name: n8n-postgres
    restart: unless-stopped
    networks:
      - n8n-cluster
    environment:
      - POSTGRES_USER=${POSTGRES_USER:-n8n_admin}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-SuperSecretDBPass2026!}
      - POSTGRES_DB=${POSTGRES_DB:-n8n_prod}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -h localhost -U ${POSTGRES_USER:-n8n_admin} -d ${POSTGRES_DB:-n8n_prod}"]
      interval: 5s
      timeout: 5s
      retries: 10

  n8n-main:
    image: docker.n8n.io/n8nio/n8n:latest
    container_name: n8n-main
    restart: unless-stopped
    networks:
      - n8n-cluster
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    ports:
      - "5678:5678"
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - QUEUE_BULL_REDIS_PASSWORD=${REDIS_PASSWORD:-RedisSuperPass2026!}
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=${POSTGRES_DB:-n8n_prod}
      - DB_POSTGRESDB_USER=${POSTGRES_USER:-n8n_admin}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD:-SuperSecretDBPass2026!}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
      - WEBHOOK_URL=${WEBHOOK_URL:-https://n8n.yourcompany.com/}
    volumes:
      - n8n_data:/home/node/.n8n

  n8n-worker:
    image: docker.n8n.io/n8nio/n8n:latest
    command: n8n worker --concurrency=10
    restart: unless-stopped
    networks:
      - n8n-cluster
    depends_on:
      - n8n-main
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      - QUEUE_BULL_REDIS_PORT=6379
      - QUEUE_BULL_REDIS_PASSWORD=${REDIS_PASSWORD:-RedisSuperPass2026!}
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=postgres
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=${POSTGRES_DB:-n8n_prod}
      - DB_POSTGRESDB_USER=${POSTGRES_USER:-n8n_admin}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD:-SuperSecretDBPass2026!}
      - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
    volumes:
      - n8n_data:/home/node/.n8n

volumes:
  postgres_data:
  redis_data:
  n8n_data:
```

---

## 三、部署與擴容指令速查

```bash
# 1. 複製環境變數範本並填寫秘密金鑰
cp docker/.env.example docker/.env

# 2. 啟動單機版
docker compose -f docker/docker-compose.single.yml up -d

# 3. 啟動 Queue 佇列版
docker compose -f docker/docker-compose.queue.yml up -d

# 4. 一鍵動態擴充至 4 個背景 Worker
docker compose -f docker/docker-compose.queue.yml up -d --scale n8n-worker=4
```
