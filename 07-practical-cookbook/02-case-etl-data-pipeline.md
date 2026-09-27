# 23. 案例二：高容錯 ETL 資料管道（多來源採集 + 批次清洗 + 重試機制）

企業往往同時自多個電商渠道（Shopify、Amazon、內部 ERP）接收巨量訂單數據。資料欄位命名不一、格式混亂、甚至常有惡意重複請求。本案例將指導您構建一個高容錯、防重複寫入且具備死信佇列（Dead Letter Queue）的現代化 ETL 資料管道。

配套工作流檔案：[`workflows/01-basic-webhook-etl.json`](file:///home/cosmo_chang/Projects/n8n-beginner-guide/workflows/01-basic-webhook-etl.json)

---

## 一、ETL 管道全景架構

```mermaid
flowchart TD
    W1["Shopify Webhook"] --> Standardize["Code 節點：資料欄位統一標準化"]
    W2["Amazon SQS 觸發"] --> Standardize
    W3["每日 CSV 定時匯入"] --> Standardize
    
    Standardize --> Dedup{"Redis 去重檢查：Key 是否已存在？"}
    Dedup -->|重複資料| LogDiscard["標記為重複並寫入審計日誌"]
    Dedup -->|新資料| Batch["Split In Batches (每批 50 筆)"]
    
    Batch --> PG["PostgreSQL 批次 UPSERT (ON CONFLICT DO UPDATE)"]
    PG -->|成功| BatchNext["繼續下一批次直至完成"]
    PG -->|失敗 (重試超過上限)| DLQ[("寫入死信佇列 DLQ<br/>觸發緊急維運通知")]
```

---

## 二、關鍵技術要點深度剖析

### 2.1 資料標準化 (Code 節點)
不同來源對時間戳與金額命名各異：
```javascript
// 標準化為企業通用 Unified Schema
const items = $input.all();

return items.map((item, index) => {
  const raw = item.json;
  return {
    json: {
      orderId: raw.order_number || raw.Id || raw.order_id,
      customerEmail: (raw.customer_email || raw.email || '').trim().toLowerCase(),
      totalAmount: parseFloat(raw.total_price || raw.amount || 0),
      currency: (raw.currency_code || raw.currency || 'TWD').toUpperCase(),
      createdAt: raw.created_at ? new Date(raw.created_at).toISOString() : new Date().toISOString()
    },
    pairedItem: { item: index }
  };
});
```

### 2.2 Redis 原子操作防止重複消費 (Deduplication)
在將訂單寫入資料庫前，呼叫 Redis `SET order:ID "1" NX EX 86400`：
- 若 Redis 回傳 `OK`，代表該訂單在過去 24 小時內首次出現，准予放行。
- 若回傳 `null`，代表為重複送達的 Webhook 事件，立即略過，100% 杜絕重複扣款或重複開單！

### 2.3 資料庫批次寫入 (PostgreSQL Upsert)
使用 PostgreSQL 節點的 **Upsert** 操作，將 `orderId` 指定為唯一約束鍵（Conflict Column）：
```sql
INSERT INTO orders (order_id, customer_email, total_amount, currency, created_at)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (order_id) 
DO UPDATE SET 
  total_amount = EXCLUDED.total_amount,
  updated_at = NOW();
```

---

## 三、死信佇列 (DLQ - Dead Letter Queue) 機制

若資料庫連線因短暫網路故障或磁碟鎖死導致寫入失敗：
- 節點配置重試 3 次（搭配指數退避）。
- 若仍持續失敗，將失敗的原始 Item 導向至專屬的 `failed_orders_dlq` 資料表，並發送 Alert 至工程師通訊群。
- 資料絕不無端消失，待系統修復後可一鍵重放（Replay）。
