# 19. 高併發擴展：Redis Queue Mode 實戰

當企業每日工作流執行次數突破數萬次，或者特定高頻 Webhook 流量在短時間內瞬間湧入時，單一節點架構往往會面臨瓶頸：UI 畫布載入卡頓、排程任務延遲觸發、甚至因單一大型資料運算吃滿 CPU 導致整體服務失聯。

為了解決這個難題，n8n 提供了專為大規模生產環境設計的**佇列模式 (Queue Mode)**。

---

## 一、Queue Mode 分散式架構全景

```mermaid
flowchart TD
    subgraph 流量入口與控制層
        Proxy["負載均衡器 / 反向代理"] -->|存取 UI / API| Main["n8n 主節點 (Main Instance)<br/>負責 UI 編輯、Cron 定時調度與憑證管理"]
        Proxy -->|接收 Webhook| WW["專屬 Webhook 節點 (Webhook Workers)<br/>極致輕量，僅負責接單並塞入佇列"]
    end

    subgraph 訊息與狀態中樞
        Redis[("Redis 7+ 記憶體快取<br/>(BullMQ 高性能任務排程佇列)")]
        PG[("PostgreSQL 叢集<br/>(共享工作流定義與執行紀錄)")]
    end

    subgraph 分散式執行層 (可動態擴展)
        Worker1["n8n 運算節點 1 (Worker)"]
        Worker2["n8n 運算節點 2 (Worker)"]
        WorkerN["n8n 運算節點 N (Worker)"]
    end

    Main --> Redis
    WW --> Redis
    Redis --> Worker1
    Redis --> Worker2
    Redis --> WorkerN
    Worker1 --> PG
    Worker2 --> PG
    WorkerN --> PG
    Main --> PG
```

### 1.1 各角色職責明確劃分
- **Main 節點**：僅供工程師登入編輯畫布、查看歷史記錄，並負責定時排程（Cron）調度。即便 Worker 節點運算負載 100%，UI 依然流暢不卡頓！
- **Webhook Worker 節點**：專門暴露於公網接收 HTTP Webhook，毫秒級將請求轉換為任務寫入 Redis 佇列，立即向客戶端回傳 200/202，絕不阻塞。
- **Execution Worker 節點**：純後台運算節點。從 Redis 中爭搶任務進行真實的資料清洗、API 調用與 AI 推理。可隨業務負載隨時水平擴容（Scale Out）至數十台！

---

## 二、Queue Mode 核心配置參數

要將 n8n 切換為 Queue 模式，所有容器必須共享相同的 PostgreSQL 與 Redis 設定，並聲明：

```yaml
environment:
  - EXECUTIONS_MODE=queue
  - QUEUE_BULL_REDIS_HOST=redis
  - QUEUE_BULL_REDIS_PORT=6379
  - QUEUE_BULL_REDIS_PASSWORD=${REDIS_PASSWORD}
```

---

## 三、Docker Compose 多節點編排示範 (精簡版)

```yaml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass RedisSecret2026!
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    # ...PostgreSQL 基本環境變數配置...

  # 1. Main 節點 (提供 Web UI)
  n8n-main:
    image: docker.n8n.io/n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      # ...DB 連線與金鑰...

  # 2. Worker 運算節點 (無暴露 Port，純背景運算)
  n8n-worker:
    image: docker.n8n.io/n8nio/n8n:latest
    command: n8n worker --concurrency=10
    restart: unless-stopped
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      # ...DB 連線與金鑰...

  # 3. Webhook 專屬接收節點
  n8n-webhook:
    image: docker.n8n.io/n8nio/n8n:latest
    command: n8n webhook
    restart: unless-stopped
    ports:
      - "5679:5678"
    environment:
      - EXECUTIONS_MODE=queue
      - QUEUE_BULL_REDIS_HOST=redis
      # ...DB 連線與金鑰...
```

---

## 四、秒級水平彈性擴展 (Horizontal Scaling)

在黑色星期五大促銷或業務高峰期，只需在終端機執行一行 Docker 指令，即可將背景運算 Worker 節點由 1 台無縫擴展至 5 台：

```bash
docker compose up -d --scale n8n-worker=5
```

所有新加入的 Worker 節點會自動連線至 Redis 佇列，協同消化積壓的任務，完全無需重啟 Main 節點或中斷線上服務！

---

## 五、本章總結

- 單節點瓶頸可透過 **Queue Mode (Main + Redis + Workers)** 徹底解決。
- 專門的 Webhook Worker 確保在高併發流量下 100% 不丟單。
- 支援一鍵水平擴充 Worker，是企業級 SLA 保障的黃金架構。

在下一章中，我們將探討系統的可觀測性——**Prometheus 指標監控、日誌審計與資料修剪策略**。
