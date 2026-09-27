# 附錄 A：常見錯誤代碼與除錯速查手冊

在維運與開發 n8n 的過程中，遇到報錯在所難免。本附錄彙整了全球社群與企業中最常見的高頻錯誤代碼、根本原因分析與立即可用的修復方案。

---

## 一、高頻報錯與解決方案對照表

### 1. `SQLITE_BUSY: database is locked`
- **根本原因**：在高併發環境下，多個工作流同時嘗試寫入單一 SQLite 資料庫檔案觸發鎖定。
- **解決方案**：
  1. 正式生產環境請立即遷移至 **PostgreSQL**（參考 [第 18 章](file:///home/cosmo_chang/Projects/n8n-beginner-guide/06-devops-and-production/01-production-deployment.md)）。
  2. 若暫時無法遷移，在環境變數加入 `DB_SQLITE_VACUUM_ON_STARTUP=true`。

---

### 2. `JavaScript heap out of memory (OOM)`
- **根本原因**：Node.js 預設記憶體上限通常為 1.4GB ~ 2GB。當單次讀取超大 JSON 或未分批處理 10 萬筆資料時，觸發垃圾回收崩潰。
- **解決方案**：
  1. 在 Docker 環境變數中調高 Node 記憶體上限：
     ```yaml
     environment:
       - NODE_OPTIONS=--max-old-space-size=4096 # 調高至 4GB
     ```
  2. 架構層面重構：嚴禁一次全載入，改用 **Split In Batches**（每批 1,000 筆）進行分批處理。

---

### 3. `Webhook 504 Gateway Timeout`
- **根本原因**：第三方服務（Stripe / GitHub）發送 Webhook 後未能在 5 秒內收到 200 回應，而工作流後續掛載了耗時的 AI 模型或大量運算。
- **解決方案**：
  - 開啟 Webhook 節點設定，將「Respond」改為 **Immediately** 或在流程前置處插入 **Respond to Webhook** 節點立即返回 ACK（參考 [第 12 章](file:///home/cosmo_chang/Projects/n8n-beginner-guide/04-api-and-integrations/02-webhooks-and-security.md)）。

---

### 4. `Cannot read properties of undefined (reading 'json')`
- **根本原因**：
  1. 上游節點名稱曾經更名，但下游表達式未同步更新。
  2. 在 Code 節點重組資料時**未保留 `pairedItem`**，導致下游節點執行 `$('Node').item` 逆向溯源時指針斷裂。
- **解決方案**：
  - 檢查 Code 節點輸出，確保封裝了 `pairedItem: { item: index }`（參考 [第 04 章](file:///home/cosmo_chang/Projects/n8n-beginner-guide/02-core-concepts/01-data-structure.md)）。

---

### 5. `401 Unauthorized / Invalid Credentials (解密失敗)`
- **根本原因**：容器重啟或換機後，環境變數 `N8N_ENCRYPTION_KEY` 遺失或被重新隨機生成，導致無法解密既有資料庫中的憑證。
- **解決方案**：
  - 找回備份的原有 `N8N_ENCRYPTION_KEY` 並填回 `.env` 檔案；若金鑰已徹底遺失，只能重新在 UI 中依序重新輸入各項外部 API 密碼。

---

### 6. `Worker not picking up jobs (Queue 模式任務積壓)`
- **根本原因**：
  1. Worker 容器與 Main 容器連接的 Redis 主機或密碼不一致。
  2. Main 節點忘記設定 `EXECUTIONS_MODE=queue`，導致工作流依然在 Main 節點本機執行而非拋入 Redis。
- **解決方案**：
  - 透過 `docker exec -it redis redis-cli -a <password> monitor` 檢視是否有任務推入 Bull 佇列。
