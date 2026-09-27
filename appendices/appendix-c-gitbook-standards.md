# 附錄 C：本書 GitBook 規範與開源貢獻指南

本書遵循現代 **GitBook Documentation Best Practices** 與 **GitHub Flavored Markdown (GFM)** 雙重標準撰寫，以確保在 GitBook 官方雲端平台、本地 Honkit 預覽引擎及 GitHub 網頁端均能呈現最優雅的閱讀體驗。

---

## 一、GitBook 區塊語法規範 (Block Syntax)

### 1. 提示塊 (Hints)
用於標註警示、操作密技或注意事項：
```markdown
{% hint style="info" %}
此處為一般性補充知識與架構原理。
{% endhint %}

{% hint style="warning" %}
此處為高風險操作或常見配置陷阱。
{% endhint %}

{% hint style="danger" %}
此處為可能導致資料遺失或系統崩潰的致命錯誤警告。
{% endhint %}

{% hint style="success" %}
此處為架構選型結論或推薦最佳實踐。
{% endhint %}
```

### 2. 標籤頁 (Tabs)
用於展示多系統（如 Linux vs Mac）或多語言代碼對比：
```markdown
{% tabs %}
{% tab title="JavaScript 實作" %}
// JavaScript 代碼
{% endtab %}

{% tab title="Python 實作" %}
# Python 代碼
{% endtab %}
{% endtabs %}
```

### 3. 步驟導航 (Steppers)
用於引導讀者進行具備明確前後依賴的操作流程：
```markdown
{% stepper %}
{% step %}
### 步驟 1：標題
步驟說明內容。
{% endstep %}
{% endstepper %}
```

---

## 二、Mermaid 圖表繪製規範

所有架構拓撲、時序圖與狀態機均採用 Mermaid 代碼塊：
- 節點名稱若包含括號、斜線或特殊字元，必須以引號雙重包裹：`Node["節點名稱 (額外資訊)"]`。
- 避免在節點文字中使用未轉義的 HTML 標籤。

---

## 三、本地預覽與驗證

本專案提供了基於 Node.js 的全自動文檔校驗腳本：

```bash
# 執行全書目錄、檔案存在性與標籤閉合檢驗
npm run validate

# 本地啟動 Honkit 即時預覽伺服器 (連接埠 4000)
npm run serve:honkit
```

---

## 四、如何參與貢獻

我們熱烈歡迎全球開發者共同完善本手冊：
1. Fork 本倉庫並建立您的功能分支 (`git checkout -b feature/amazing-chapter`)。
2. 遵循繁體中文技術名詞規範（如「工作流程」、「節點」、「表達式」、「佇列」）。
3. 執行 `npm run validate` 確保所有鏈接與 GitBook 標籤完全閉合。
4. 提交 Pull Request，我們將在 24 小時內完成審查與合入！
