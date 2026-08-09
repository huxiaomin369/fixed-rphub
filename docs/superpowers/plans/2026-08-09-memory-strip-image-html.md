# 记忆系统剥离图片 HTML 标签 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让记忆系统（记忆浏览 + 上下文压缩摘要）展示/存储剥离图片生成 HTML 标签后的内容，聊天界面显示不受影响。

**Architecture:** 单一数据源 `chatHistory` 保持原文（聊天界面 v-html 渲染依赖），在记忆系统读取边界调用已有的 `stripImageGenHtmlFromContent` 剥离：① 记忆浏览两个展示 computed；② 压缩摘要模型返回值写入前；③ 压缩请求的旧摘要输入；④ 摘要卡片展示 computed。全部改动位于 `assets/js/app.js`。

**Tech Stack:** 原生 JS（Vue 3 Options API setup 内），无构建工具、无测试框架。验证方式为浏览器手工验证（见 AGENTS.md）。

## Global Constraints

- 不修改 `chatHistory` 中任何消息的 `content` 字段（聊天显示依赖其中的图片 HTML）
- 不修改 `index.html` 模板
- 剥离结果**不保留标记文本**：图片 HTML 一律删除为空字符串（2026-08-09 设计更新，见 spec ⓪）
- 代码风格：沿用现有 const 箭头函数 / computed 模式；注释可用中文
- 每个 Task 完成后：浏览器刷新验证 + git commit（独立提交）

---

### Task 0: 剥离函数替换串改为空字符串

**Files:**
- Modify: `assets/js/app.js:8213-8221`（`stripImageGenHtmlFromContent` 函数体与注释）

**Interfaces:**
- Consumes: 无（函数本身，被所有 API 边界与记忆读取边界共用）
- Produces: `stripImageGenHtmlFromContent(content) => string` 签名不变，行为改为删除图片 HTML（空字符串）。已核实（grep 全文件）无任何代码依赖 `[图片已生成]` / `[图片生成中]` / `[图片生成失败]` 这三个标记文本；聊天界面"图片生成中…"文案位于 HTML 构建器（8205/8211），不受影响

- [ ] **Step 1: 修改函数与注释**

原文（app.js:8213-8221）：

```js
        // 发送给 API 前剥离生成图片的 HTML 块，替换为简短标记：
        // 避免过期图片 URL 与超长内联样式占用上下文 token（存储与渲染层保持原样，不受影响）
        const stripImageGenHtmlFromContent = (content) => {
            if (typeof content !== 'string' || !content) return content;
            return content
                .replace(/<div class="img-gen-message"[\s\S]*?<\/div>/g, '[图片已生成]')
                .replace(/<div class="img-gen-inline"[\s\S]*?<\/div>/g, '[图片生成中]')
                .replace(/<div class="img-gen-error"[\s\S]*?<\/div>/g, '[图片生成失败]');
        };
```

改为：

```js
        // 发送给 API 前剥离生成图片的 HTML 块，直接删除为空字符串：
        // 避免过期图片 URL、超长内联样式与标记文本占用上下文 token（存储与渲染层保持原样，不受影响）
        const stripImageGenHtmlFromContent = (content) => {
            if (typeof content !== 'string' || !content) return content;
            return content
                .replace(/<div class="img-gen-message"[\s\S]*?<\/div>/g, '')
                .replace(/<div class="img-gen-inline"[\s\S]*?<\/div>/g, '')
                .replace(/<div class="img-gen-error"[\s\S]*?<\/div>/g, '');
        };
```

- [ ] **Step 2: 语法校验**

Run: `node --check assets/js/app.js`
Expected: 无输出（通过），随后 `echo $LASTEXITCODE` 为 0

- [ ] **Step 3: 提交**

```bash
git add assets/js/app.js
git commit -m "feat: 剥离图片HTML改为直接删除不保留标记"
```

---

### Task 1: 记忆浏览（对话原文）展示剥离

**Files:**
- Modify: `assets/js/app.js:10024-10045`（`displayedRetainedFloors` 与 `displayedConversationTurns` 两个 computed）

**Interfaces:**
- Consumes: `stripImageGenHtmlFromContent(content)` — 已存在（app.js:8215），`(content) => string`，非字符串原样返回
- Produces: 两个 computed 返回值不变形（`displayedRetainedFloors` 为消息对象数组，`displayedConversationTurns` 为轮次对象数组），仅消息 `content` 为剥离后文本；模板（index.html:3394-3421）无需改动

- [ ] **Step 1: 修改 `displayedRetainedFloors`**

原文（app.js:10024-10032）：

```js
        const displayedRetainedFloors = computed(() => {
            const state = conversationBrowseState.value;
            const source = state.compressed
                ? state.postprocessed.filter(m => Number.isFinite(m._contextFloor) && m._contextFloor > state.compressEndFloor)
                : [];
            const sorted = [...source].reverse();
            const start = (conversationPage.value - 1) * LIST_PAGE_SIZE;
            return sorted.slice(start, start + LIST_PAGE_SIZE);
        });
```

改为：

```js
        const displayedRetainedFloors = computed(() => {
            const state = conversationBrowseState.value;
            const source = state.compressed
                ? state.postprocessed.filter(m => Number.isFinite(m._contextFloor) && m._contextFloor > state.compressEndFloor)
                : [];
            const sorted = [...source].reverse();
            const start = (conversationPage.value - 1) * LIST_PAGE_SIZE;
            return sorted.slice(start, start + LIST_PAGE_SIZE)
                .map(m => ({ ...m, content: stripImageGenHtmlFromContent(m.content) }));
        });
```

- [ ] **Step 2: 修改 `displayedConversationTurns`**

原文（app.js:10040-10045）：

```js
        const displayedConversationTurns = computed(() => {
            const turns = buildConversationTurnSnapshot(chatHistory.value, { includeSystem: false }).turns;
            const sorted = [...turns].reverse();
            const start = (conversationPage.value - 1) * LIST_PAGE_SIZE;
            return sorted.slice(start, start + LIST_PAGE_SIZE);
        });
```

改为：

```js
        const displayedConversationTurns = computed(() => {
            const turns = buildConversationTurnSnapshot(chatHistory.value, { includeSystem: false }).turns;
            const sorted = [...turns].reverse();
            const start = (conversationPage.value - 1) * LIST_PAGE_SIZE;
            return sorted.slice(start, start + LIST_PAGE_SIZE)
                .map(turn => ({
                    ...turn,
                    user: turn.user ? { ...turn.user, content: stripImageGenHtmlFromContent(turn.user.content) } : null,
                    assistant: turn.assistant ? { ...turn.assistant, content: stripImageGenHtmlFromContent(turn.assistant.content) } : null
                }));
        });
```

- [ ] **Step 3: 验证**

无测试框架，按 AGENTS.md 浏览器验证：
1. 浏览器打开 `index.html`（直接打开或本地静态服务均可），刷新加载
2. 进入侧边栏「记忆系统」
3. 存在含生成图片（`<div class="img-gen-message">` / `img-gen-inline` / `img-gen-error`）对话时：
   - 未压缩状态：展开「用户原文 / AI 原文」details，无图片 HTML 标签、无标记文本
   - 已压缩状态：保留楼层同样无 HTML 标签、无标记文本
4. 回到聊天界面：历史消息中图片仍正常渲染（v-html 图片可见），"图片生成中…"占位动画正常，无裂图
5. 主对话 / UI 模板分析 / 压缩总结任一 API 请求时，控制台 `printAIRequestLogs` 输出无图片 HTML 与标记
6. 浏览器控制台无报错

- [ ] **Step 4: 提交**

```bash
git add assets/js/app.js
git commit -m "feat: 记忆浏览对话原文剥离图片HTML标签"
```

---

### Task 2: 压缩摘要链路剥离（写入前 / 旧输入 / 展示卡片）

**Files:**
- Modify: `assets/js/app.js:6380-6385`（previousSummary 输入）
- Modify: `assets/js/app.js:6429`（摘要返回值）
- Modify: `assets/js/app.js:10020-10023`（contextSummaryCard）

**Interfaces:**
- Consumes: `stripImageGenHtmlFromContent`（同上）；`requestContextCompressionSummary` 返回值类型不变（string）；`contextSummaryCard` 结构不变（`{ summary, endFloor }` 或 null）
- Produces: `context_summary` 缓存中摘要无图片 HTML；压缩请求（含旧摘要背景）无图片 HTML

- [ ] **Step 1: 修改 `previousSummary` 输入剥离**

原文（app.js:6380-6385）：

```js
            if (previousSummary) {
                requestMessages.push({
                    role: 'user',
                    content: `【历史背景：这是上一版总结，仅作为理解基础。新总结必须完整承接其中所有信息，并纳入下面新对话的内容。】\n${previousSummary}`
                });
            }
```

改为：

```js
            if (previousSummary) {
                requestMessages.push({
                    role: 'user',
                    content: `【历史背景：这是上一版总结，仅作为理解基础。新总结必须完整承接其中所有信息，并纳入下面新对话的内容。】\n${stripImageGenHtmlFromContent(previousSummary)}`
                });
            }
```

- [ ] **Step 2: 修改摘要返回值剥离**

原文（app.js:6429）：

```js
            return trimMemoryText(summary, 4000);
```

改为：

```js
            return trimMemoryText(stripImageGenHtmlFromContent(summary), 4000);
```

- [ ] **Step 3: 修改 `contextSummaryCard` 展示剥离**

原文（app.js:10020-10023）：

```js
        const contextSummaryCard = computed(() => {
            const state = conversationBrowseState.value;
            return state.compressed ? { summary: String(contextSummaryCache.value.summary), endFloor: state.compressEndFloor } : null;
        });
```

改为：

```js
        const contextSummaryCard = computed(() => {
            const state = conversationBrowseState.value;
            return state.compressed ? { summary: stripImageGenHtmlFromContent(String(contextSummaryCache.value.summary)), endFloor: state.compressEndFloor } : null;
        });
```

- [ ] **Step 4: 验证**

1. 浏览器刷新 `index.html`
2. 触发上下文压缩（让上下文超过阈值后发消息），或手动检查：`context_summary` 缓存（IndexedDB / localforage `rphub` 库）中的摘要不含 `img-gen-` 字样
3. 记忆系统页面：摘要卡片文本无图片 HTML；若旧缓存摘要含残留 HTML，显示时被剥离为 `[图片已生成]` 等标记
4. 触发一次主对话请求，控制台 `printAIRequestLogs` 输出的请求消息中无 `img-gen-` HTML（压缩消息 + 主对话消息均验证）
5. 浏览器控制台无报错

- [ ] **Step 5: 提交**

```bash
git add assets/js/app.js
git commit -m "feat: 压缩摘要链路剥离图片HTML标签"
```

---

## 计划自检

- **Spec 覆盖**：① 记忆浏览 ✓（Task 1）；② 摘要写入前 ✓（Task 2 Step 2）；③ 旧摘要输入 ✓（Task 2 Step 1）；④ 摘要卡片 ✓（Task 2 Step 3）；范围外保留（导出/统计/聊天界面）✓ 未触碰
- **占位符扫描**：无 TBD/TODO，所有步骤含完整代码
- **类型一致性**：`stripImageGenHtmlFromContent` 签名唯一且一致；computed 返回结构不变，模板零改动
