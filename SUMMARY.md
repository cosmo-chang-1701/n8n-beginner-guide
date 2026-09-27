# Summary

* [前言與導讀](README.md)

## 第一篇：邁入現代自動化世界
* [01. 什麼是 n8n？2026 現代自動化全貌與核心架構](01-getting-started/01-n8n-overview.md)
* [02. 快速起步：Docker 與 Docker Compose 一鍵部署](01-getting-started/02-docker-quickstart.md)
* [03. 全新空間畫布與介面導覽（草稿、發布與自動儲存）](01-getting-started/03-canvas-and-editor.md)

## 第二篇：n8n 核心觀念與資料流架構
* [04. 核心資料結構：Array of JSON Objects 與 pairedItem 溯源機制](02-core-concepts/01-data-structure.md)
* [05. 節點分類與觸發機制（Webhook、Cron、Polling、Error Trigger）](02-core-concepts/02-triggers-and-nodes.md)
* [06. 現代表達式語法與 Luxon 時間處理實戰](02-core-concepts/03-expressions-and-luxon.md)

## 第三篇：邏輯控制與資料轉換實戰
* [07. 資料轉換必備節點：Edit Fields, Filter, Sort, Aggregate, Split](03-workflow-logic/01-data-transformation.md)
* [08. 條件控制與流程分支：If 條件評估與 Switch 模式匹配](03-workflow-logic/02-conditional-branching.md)
* [09. Code 節點進階：JavaScript 與 Python 雙引擎實戰](03-workflow-logic/03-code-node-mastery.md)
* [10. 迴圈處理與子工作流程（Loop Over Items & Sub-workflows）](03-workflow-logic/04-loops-and-subworkflows.md)

## 第四篇：外部整合與 API 通訊
* [11. 現代 HTTP Request 節點深度實戰（OAuth 2.0 PKCE 與指數退避）](04-api-and-integrations/01-http-request-node.md)
* [12. Webhook 整合與端點防護（CIDR 白名單與 HMAC 簽名）](04-api-and-integrations/02-webhooks-and-security.md)
* [13. 憑證與機密管理最佳實踐（加密金鑰與外部 Secret Store）](04-api-and-integrations/03-credentials-management.md)

## 第五篇：2026 現代 AI Agent 與智慧編排
* [14. AI Agent 核心架構：Reasoning + Memory + Tools 三層結構](05-ai-agents-orchestration/01-ai-agent-fundamentals.md)
* [15. LLM 模型接入與原生 Tool Calling（Claude, GPT-4o, Gemini, Ollama）](05-ai-agents-orchestration/02-llm-and-tool-calling.md)
* [16. 企業級 RAG 實戰：向量資料庫整合（PGVector / Qdrant）](05-ai-agents-orchestration/03-rag-and-vector-stores.md)
* [17. 多 Agent 協作與 Human-in-the-Loop 人機協同](05-ai-agents-orchestration/04-multi-agent-and-hitl.md)

## 第六篇：生產環境運維與企業級架構
* [18. 生產級 Docker Compose 架構：PostgreSQL 連線池優化](06-devops-and-production/01-production-deployment.md)
* [19. 高併發擴展：Redis Queue Mode 實戰](06-devops-and-production/02-queue-mode-scaling.md)
* [20. 監控告警與日誌審計（Prometheus、健康檢查與 Data Pruning）](06-devops-and-production/03-monitoring-and-logging.md)
* [21. 工作流程版本控制與 CI/CD（Git Sync 與 REST API 自動化）](06-devops-and-production/04-cicd-and-git-sync.md)

## 第七篇：企業實戰專案食譜
* [22. 案例一：全自動智慧客服（RAG 知識庫問答 + 敏感操作主管審批）](07-practical-cookbook/01-case-ai-customer-care.md)
* [23. 案例二：高容錯 ETL 資料管道（多來源採集 + 批次清洗 + 重試機制）](07-practical-cookbook/02-case-etl-data-pipeline.md)
* [24. 案例三：DevOps 智慧監控與自愈工作流（Sentry 警報聚合與通知）](07-practical-cookbook/03-case-devops-automation.md)

## 附錄
* [附錄 A：常見錯誤代碼與除錯速查手冊](appendices/appendix-a-troubleshooting.md)
* [附錄 B：完整 Docker Compose 與生產設定檔清單](appendices/appendix-b-docker-compose.md)
* [附錄 C：本書 GitBook 規範與開源貢獻指南](appendices/appendix-c-gitbook-standards.md)
