# 24. 案例三：DevOps 智慧監控與自愈工作流（Sentry 警報聚合與通知）

在微服務時代，系統異常往往會在一秒鐘內引爆數百則連鎖告警（Alert Storm），導致 On-call 工程師疲於奔命。本案例將建構一套具備**告警風暴聚合**、**AI 智慧根因分析 (RCA)** 與**自動化自愈操作**的企業級 DevOps 事件中樞。

配套工作流檔案：[`workflows/03-devops-incident-bot.json`](file:///home/cosmo_chang/Projects/n8n-beginner-guide/workflows/03-devops-incident-bot.json)

---

## 一、DevOps 智慧事件響應體系

```mermaid
flowchart TD
    Sentry["Sentry 錯誤日誌"] --> Webhook["n8n 告警接收 Webhook"]
    Prom["Prometheus Alertmanager"] --> Webhook
    
    Webhook --> Group["Code 節點：5 分鐘滑動窗口告警聚合 (防止通知風暴)"]
    Group --> AIAgent["AI 診斷 Agent (Reasoning)"]
    
    AIAgent --> Git["GitHub Tool: 查詢最近 2 小時合入的 Commit 與作者"]
    AIAgent --> Metrics["Prometheus Tool: 查詢該服務 CPU/記憶體飆升曲線"]
    
    AIAgent --> Classify{"評估自愈等級"}
    Classify -->|等級 1: 記憶體洩漏/殭屍進程| AutoFix["呼叫 Docker / K8s API 重啟 Pod 自愈"]
    Classify -->|等級 2: 程式碼崩潰 (Bug)| Slack["發送 Slack 深度分析卡片 (包含可能肇事 Commit)"]
    Classify -->|等級 3: 資料庫崩潰| PagerDuty["觸發 PagerDuty 電話呼叫 SRE 主管"]
```

---

## 二、防止告警風暴的聚合演算法

當資料庫斷線時，Sentry 會瞬間拋出 500 個報錯。若直接逐筆寄信，團隊頻道會被淹沒。
- 透過 Redis 或 n8n 記憶體快取維護一個 5 分鐘時間窗口。
- 計算錯誤訊息指紋（Error Fingerprint）：`md5(service + errorName + errorStackLine)`。
- 若指紋已存在，僅將計數器加 1；在 5 分鐘結束後，輸出單一聚合摘要卡片：
  > 🚨 **【告警聚合通知】訂單服務 (Order-Service) 在過去 5 分鐘內發生 324 次 DB Connection Timeout！**

---

## 三、AI Agent 進行智慧根因分析 (RCA)

將聚合後的錯誤日誌交由掛載了 GitHub 工具的 AI Agent 進行秒級診斷：
```text
【AI 診斷報告】
- 錯誤類型：NullPointerException in PaymentGateway.process()
- 肇事代碼：line 42 嘗試存取 user.getBillingAddress().country
- 關聯 Commit：Commit 3a89f1 "重構會員地址欄位" (由 dev_john 於 20 分鐘前合入)
- 建議措施：已自動通知 @dev_john；點擊下方按鈕可執行 GitHub Actions 一鍵回滾！
```

---

## 四、成果與營運價值

- **MTTR (平均修復時間) 降低 65%**：常見的記憶體打滿或微服務掛起實現了 0 人工介入自動重啟。
- **告警疲勞消除**：90% 的重複報錯被聚合壓縮，讓工程師聚焦於高價值的架構與核心業務修復。
