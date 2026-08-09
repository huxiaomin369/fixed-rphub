# 记忆系统剥离图片 HTML 标签 — 设计文档

日期：2026-08-09

## 背景

聊天消息内容中可能包含图片生成 HTML 块（`<div class="img-gen-message">` / `img-gen-inline` / `img-gen-error`）。当前 `stripImageGenHtmlFromContent` 仅在 API 请求前调用（主对话请求、UI 模板分析、压缩总结输入三处），记忆系统页面（记忆系统视图）中的"记忆浏览（对话原文）"直接显示 `chatHistory` 原文，图片 HTML 标签会以原始文本形式暴露；上下文压缩摘要缓存（`context_summary`）的旧数据也可能残留 HTML。

目标：在不影响聊天界面显示（聊天界面依赖 HTML 渲染图片）的前提下，让记忆系统（记忆浏览 + 压缩摘要）展示/存储剥离后的内容。

## 方案：单一来源 + 边界剥离

**不修改 `chatHistory` 存储**（聊天界面 v-html 渲染图片依赖 `content` 原文），在记忆系统的读取边界做剥离。聊天界面管道（`displayedChatMessages` → `renderedContent`）完全不受影响。

所有改动位于 `assets/js/app.js`，共 4 处：

### ① 记忆浏览（对话原文）剥离 — 展示层 computed（~L10024-10045）

- `displayedRetainedFloors`：对 `floor.content` 调 `stripImageGenHtmlFromContent` 后返回
- `displayedConversationTurns`：对 `turn.user.content` / `turn.assistant.content` 剥离后返回

这两个 computed 仅被记忆系统视图使用（已核实 index.html L3378-3414），不影响聊天界面。

### ② 压缩摘要写入前剥离（L6429）

`requestContextCompressionSummary` 返回前，对模型摘要先 `stripImageGenHtmlFromContent` 再 `trimMemoryText`。覆盖：写入 `context_summary` 缓存 + 注入请求的压缩消息，均保证干净。

### ③ 压缩请求旧摘要输入剥离（L6383）

`previousSummary`（历史背景，来自缓存）拼入请求前剥离，防止旧缓存残留 HTML 永久传播。

### ④ 摘要卡片显示剥离（L10020-10023）

`contextSummaryCard` computed 对缓存摘要剥离后展示，兜底旧缓存残留（新数据已由 ② 保证干净）。

## 范围外（有意保留原文）

- `exportConversation` 对话导出（标签为"对话原文"）
- `conversationStats` 字数统计（统计存储数据而非展示数据）
- 聊天界面本身

## 验证

1. 生成图片的对话在聊天界面仍正常显示图片
2. 记忆系统 → 记忆浏览：图片 HTML 显示为 `[图片生成中]` / `[图片已生成]` / `[图片生成失败]`
3. 上下文压缩后：摘要卡片与 API 日志（printAIRequestLogs）中无图片 HTML
4. 旧缓存摘要（含残留 HTML）显示时被剥离
