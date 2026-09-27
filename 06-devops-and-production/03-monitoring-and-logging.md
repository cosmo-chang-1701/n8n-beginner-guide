# 20. 監控告警與日誌審計（Prometheus、健康檢查與 Data Pruning）

在企業環境中，「無法衡量的系統就無法管理」。當數百個工作流程日夜不停運轉時，SRE 團隊需要清楚掌握：是否有排程失敗？平均執行延遲是多少？資料庫硬碟容量是否健康？

本章將指導您啟用 n8n 內建的 **Prometheus 效能指標**、**結構化日誌**、以及最攸關資料庫生死存亡的**資料定期清理策略 (Data Pruning)**。

---

## 一、啟用 Prometheus 指標暴露 (`/metrics`)

n8n 原生內建了符合 OpenMetrics 標準的 Prometheus 採集端點。

### 1.1 環境變數設定
```yaml
environment:
  - N8N_METRICS=true
  - N8N_METRICS_PREFIX=n8n_
```
重啟容器後，訪問 `http://localhost:5678/metrics` 即可取得即時效能指標。

### 1.2 核心監控指標清單

| 指標名稱 | 類型 | 意義說明與告警閾值 |
| :--- | :--- | :--- |
| `n8n_workflow_execution_total{status="error"}` | Counter | 累計執行失敗的工作流次數。**應配置告警規則（例如 5 分鐘內失敗數 > 5）** |
| `n8n_workflow_execution_duration_seconds` | Histogram | 工作流執行耗時分佈（P95 / P99 延遲） |
| `n8n_active_workflows_count` | Gauge | 當前處於 Active 啟用狀態的工作流總數 |
| `n8n_queue_jobs_waiting` (Queue 模式) | Gauge | Redis 佇列中積壓等待處理的任務量（積壓過高應自動擴增 Worker） |

---

## 二、容器健康檢查端點 (`/healthz`)

在 Kubernetes 或 Docker Compose 中，配置活性探針（Liveness Probe）與就緒探針（Readiness Probe）可實現故障自愈重啟：

```yaml
healthcheck:
  test: ["CMD-SHELL", "wget -qO- http://localhost:5678/healthz || exit 1"]
  interval: 10s
  timeout: 5s
  retries: 3
  start_period: 30s
```
- 當 n8n 主進程正常運行時，`/healthz` 回傳 `{"status": "ok"}`（HTTP 200）。
- 若因記憶體溢出（OOM）或資料庫斷線死鎖，探針連續 3 次失敗後，Docker 將自動重啟該容器。

---

## 三、拯救硬碟的大救星：資料定期清理 (Data Pruning)

{% hint style="danger" %}
**生產環境最大崩潰殺手：歷史資料爆滿**  
很多團隊在剛上線時一切正常，運作半年後資料庫突然崩潰——原因就是 n8n 預設會將「每一次工作流執行的完整輸入輸出 JSON」存入資料庫！  
若每天執行 10 萬次，資料庫一個月將暴增數十 GB，最終導致磁碟寫滿、查詢逾時！
{% endhint %}

### 3.1 最佳清理配置策略
在 Docker Compose 中加入以下三行關鍵設定：

```yaml
environment:
  # 1. 啟用定期自動修剪
  - EXECUTIONS_DATA_PRUNE=true
  
  # 2. 歷史記錄保存天數：168 小時 (7 天)
  - EXECUTIONS_DATA_MAX_AGE=168
  
  # 3. 限制歷史記錄最大總筆數：50,000 筆 (超過自動刪除最舊記錄)
  - EXECUTIONS_DATA_PRUNE_MAX_COUNT=50000
  
  # 4. 極致節省模式 (非必要不存成功記錄)
  - EXECUTIONS_DATA_SAVE_ON_SUCCESS=none # 或 'all' (若需要審計)
  - EXECUTIONS_DATA_SAVE_ON_ERROR=all    # 錯誤時 100% 完整保留供排錯
```

---

## 四、結構化日誌 (Structured JSON Logging)

為了方便與 Datadog、ELK (Elasticsearch) 或 Grafana Loki 對接，建議將日誌輸出格式設為 JSON：

```yaml
environment:
  - N8N_LOG_LEVEL=info
  - N8N_LOG_OUTPUT=console
  - N8N_LOG_FORMAT=json
```

這會讓每筆日誌輸出標準的結構化物件：
```json
{
  "level": "info",
  "message": "Workflow executed successfully",
  "workflowId": "W2026",
  "executionId": "99214",
  "durationMs": 142,
  "timestamp": "2026-09-27T19:30:00.123Z"
}
```

---

## 五、本章總結

- 啟用 `/metrics` 與 Grafana 儀表板連動，即時監控 P99 延遲與失敗次數。
- 配置 `/healthz` 健康檢查探針以實現容器故障自愈。
- 務必強制開啟 `EXECUTIONS_DATA_PRUNE`，杜絕磁碟空間被歷史日誌塞滿的致命隱患。

在下一章中，我們將探討現代化軟體交付的核心——**Git Sync 版本控制與 CI/CD 多環境自動遷移**！
