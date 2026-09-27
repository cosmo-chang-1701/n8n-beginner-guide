# 16. 企業級 RAG 實戰：向量資料庫整合（PGVector / Qdrant）

基礎大語言模型雖然具備通用世界知識，但並不具備貴公司的私有合約、產品規格書或最新客服 FAQ。**檢索增強生成 (RAG - Retrieval-Augmented Generation)** 是在不重新微調（Fine-tune）模型的前提下，賦予 AI Agent 精確檢索私有知識庫並抑制幻覺的最有效技術。

在 n8n 中，我們將 RAG 的構建拆分為兩大標準管線：**知識入庫管線 (Ingestion Pipeline)** 與 **智慧檢索管線 (Query Pipeline)**。

---

## 一、RAG 雙管線系統架構

```mermaid
flowchart TD
    subgraph 管線一：知識入庫 (Ingestion Pipeline)
        Doc["私有文件 (PDF / Notion / Markdown)"] --> Loader["Document Loader (載入內容)"]
        Loader --> Splitter["Text Splitter (文字切塊 Chunking)"]
        Splitter --> Embedder1["Embeddings 節點 (文字轉高維向量)"]
        Embedder1 --> VectorDB[("向量資料庫<br/>(PGVector / Qdrant / Pinecone)")]
    end

    subgraph 管線二：問答檢索 (Query Pipeline)
        UserQ["使用者提問"] --> Agent["AI Agent 核心"]
        Agent -->|調用| RetTool["Vector Store Tool (向量檢索工具)"]
        RetTool -->|計算語義相似度| VectorDB
        VectorDB -->|回傳 Top-K 相關片段| RetTool
        RetTool -->|注入脈絡 Context| Agent
        Agent --> Answer["產出帶有來源佐證的高精準回覆"]
    end
```

---

## 二、管線一：知識文件切割與向量入庫

### 2.1 文字切塊的最佳實踐 (Text Splitter)
在 n8n 中使用 **Recursive Character Text Splitter**：
- **Chunk Size (區塊大小)**：建議設定為 `500` ~ `1000` 字元。若區塊過大，檢索精度下降；若區塊過小，容易遺失上下文語義。
- **Chunk Overlap (重疊字元)**：建議設定為 `100` ~ `150` 字元。重疊機制能確保段落邊界處的關鍵概念不會被硬生生切斷。

### 2.2 向量嵌入模型 (Embeddings)
將切塊文字轉換為數學向量（如 1536 維度空間）：
- 雲端方案：`text-embedding-3-small`（極致性價比）或 Google `text-embedding-004`。
- 本地私有方案：Ollama `nomic-embed-text` 或 `bge-m3`。

### 2.3 向量資料庫選型 (2026 推薦)
{% tabs %}
{% tab title="PGVector (強烈推薦)" %}
若您的 n8n 生產環境已經架設了 PostgreSQL，直接透過 `CREATE EXTENSION vector;` 啟用 PGVector：
- 零額外維運成本，關聯資料與向量資料存放在同一個資料庫實例中。
- n8n 原生提供 **Postgres Vector Store** 節點，直接支援向量 Upsert 與 Cosine 距離搜尋。
{% endtab %}

{% tab title="Qdrant (開源專用向量庫)" %}
針對百萬級以上大規模知識檢索：
- 採用 Rust 打造，檢索速度極致，支援豐富的 Payload 中繼資料多維過濾。
- 原生整合 n8n Qdrant 節點。
{% endtab %}
{% endtabs %}

---

## 三、管線二：掛載 Vector Store Tool 至 AI Agent

當知識在庫中建立索引後，如何讓 Agent 自主查詢？

1. 在主畫布中，新增 **Question and Answer Vector Store Tool**。
2. 將其連接至 **AI Agent** 的「Tool」輸入埠。
3. 為該檢索工具配置：
   - **Name**：`search_internal_knowledge_base`。
   - **Description**：`當使用者詢問公司內部規範、產品保固條款、定價規則或技術手冊時調用此工具。`
   - **Top K**：設定為 `3` ~ `5`（每次最多檢索最相符的 3 到 5 個段落）。
4. 在 AI Agent 的 System Prompt 中加入約束：
   ```text
   你是一名專業的企業知識庫專家。請嚴格根據檢索工具回傳的內容進行回覆。
   若知識庫中無相關記載，請坦誠告知「知識庫目前無相關資料」，嚴禁捏造事實。
   在回覆文末，請附註所參考的文檔段落來源。
   ```

---

## 四、本章總結

- RAG 包含「離線入庫切塊」與「在線語義檢索」兩大部分。
- 合理的 `Chunk Size` (500-1000) 與 `Overlap` (100-150) 是檢索準確率的靈魂所在。
- 透過 PGVector 或 Qdrant 與 Vector Store Tool 搭配，Agent 即可在毫秒級內精確提取內部知識並附帶來源引用。

在下一章中，我們將跨入高階架構——探討 **多 Agent 協同作戰與 Human-in-the-Loop 人機審批流程**！
