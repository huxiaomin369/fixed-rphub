# 角色卡上下文 token 数压缩触发 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每张角色卡保存 API 真实 `prompt_tokens`（字段 `contextTokens`，初始 0），并以其作为上下文压缩的唯一触发条件（严格使用，不兜底估算）。

**Architecture:** 角色卡对象新增 `contextTokens: 0` 字段（默认对象 + 导入构造处初始化）；每次 API 成功响应后把归一化的 `inputTokens` 写入 `currentCharacter.value.contextTokens`（利用现有 `watch([characters,...], {deep:true})` → debouncedSave 自动持久化）；发送请求前的压缩触发判断从 `estimateContextTokens(messages) >= maxContextSize` 改为 `storedContextTokens >= maxContextSize`；移除无引用的 `estimateContextTokens`。压缩逻辑本体（`compressContextForRequest` 等）不变。

**Tech Stack:** 原生 JS（Vue 3 Options API，单文件 `assets/js/app.js`），无测试框架、无构建工具，浏览器直接打开 `index.html` 验证。

## Global Constraints

- 零构建：改动只发生在 `assets/js/app.js`，不新增文件、不改其他 JS/HTML 文件。
- 旧数据兼容：所有读取处 `Number.isFinite(char.contextTokens) ? char.contextTokens : 0`，不做迁移。
- 严格触发：存储值未达阈值（含初始 0、API 不报 usage）时绝不触发压缩，不引入任何估算兜底。
- 压缩自校正：压缩后不手动重置存储值，等待下一次响应回落。
- UI 语言 zh-CN，注释沿用中文。
- 验证方式：`node --check` 语法检查 + 浏览器手动验证（项目无测试框架）。

---

### Task 1: 角色卡新增 `contextTokens` 字段并在成功响应后写入真实 token 数

**Files:**
- Modify: `assets/js/app.js:9595-9605`（createNewCharacter 默认对象）
- Modify: `assets/js/app.js:10758-10771`（导入卡构造对象）
- Modify: `assets/js/app.js:6660-6661`（成功响应路径）

**Interfaces:**
- Produces: 角色卡对象字段 `contextTokens: number`（初始 0，成功后为 API 归一化 `inputTokens`）。Task 2 依赖此字段。

- [ ] **Step 1: 在 createNewCharacter 默认对象加入 `contextTokens: 0`**

`assets/js/app.js:9604` 处，在 `uiTemplates: []` 之后：

```js
                uuid: generateUUID(),
                createdAt: Date.now(),
                uiTemplates: [],
                contextTokens: 0
            };
```

- [ ] **Step 2: 在导入卡构造对象加入 `contextTokens: 0`**

`assets/js/app.js:10768` 处，在 `recentGenerationTimes: [],` 之后：

```js
                        recentGenerationTimes: [],
                        contextTokens: 0,
                        uuid: generateUUID(),
                        createdAt: Date.now()
```

- [ ] **Step 3: 成功响应路径写入真实 token 数**

`assets/js/app.js:6660-6661`，把：

```js
                        const normalizedUsage = normalizeApiUsage(responseUsage);
                        if (normalizedUsage.reported) lastContextTokens.value = normalizedUsage.inputTokens;
```

改为：

```js
                        const normalizedUsage = normalizeApiUsage(responseUsage);
                        if (normalizedUsage.reported) {
                            lastContextTokens.value = normalizedUsage.inputTokens;
                            // 写入当前角色卡：作为上下文压缩的触发依据（随角色卡持久化）
                            if (currentCharacter.value) currentCharacter.value.contextTokens = normalizedUsage.inputTokens;
                        }
```

- [ ] **Step 4: 语法检查**

Run: `node --check assets/js/app.js`
Expected: 无输出，退出码 0

- [ ] **Step 5: 浏览器验证**

1. 打开 `index.html`，新建一张角色卡（角色管理 → 新建），保存。
2. DevTools → Application → IndexedDB → `characters` store → 该角色记录包含 `contextTokens: 0`。
3. 选择该角色发一条消息，等待完整响应。
4. 再次查看 `characters` store 该角色记录：`contextTokens` 等于该次响应的 `prompt_tokens`（可与设置 → Token 用量面板中该记录的「输入 tokens」比对）。
5. 切换另一张角色卡：其 `contextTokens` 互不影响（未对话过的保持 0 或自身旧值）。

- [ ] **Step 6: Commit**

```bash
git add assets/js/app.js
git commit -m "feat: 角色卡保存 API 真实上下文 token 数（contextTokens，初始 0）"
```

---

### Task 2: 压缩触发改用存储值，移除 `estimateContextTokens`

**Files:**
- Modify: `assets/js/app.js:6178-6183`（发送前触发判断）
- Modify: `assets/js/app.js:6994-7000`（删除 `estimateContextTokens`）

**Interfaces:**
- Consumes: Task 1 的角色卡字段 `contextTokens: number`
- Produces: 无新接口；`estimateContextTokens` 被删除（全文件唯一引用点是本次修改的 6180 行）

- [ ] **Step 1: 触发判断改用存储值**

`assets/js/app.js:6178-6183`，把：

```js
            // 上下文压缩：估算 tokens（总字数/4）达到 maxContextSize 阈值时，把旧对话总结为一条 User 消息
            const contextSizeLimit = Number(settings.maxContextSize);
            if (Number.isFinite(contextSizeLimit) && contextSizeLimit > 0 && estimateContextTokens(messages) >= contextSizeLimit) {
                const compressionResult = await compressContextForRequest(messages, postprocessedChatHistory, abortController.value.signal);
                if (compressionResult.compressed) messages = compressionResult.messages;
            }
```

改为：

```js
            // 上下文压缩：角色卡保存的真实上下文 token 数（API 上报 prompt_tokens）达到 maxContextSize 阈值时，把旧对话总结为一条 User 消息
            const contextSizeLimit = Number(settings.maxContextSize);
            const storedContextTokens = Number.isFinite(currentCharacter.value?.contextTokens)
                ? currentCharacter.value.contextTokens : 0;
            if (Number.isFinite(contextSizeLimit) && contextSizeLimit > 0 && storedContextTokens >= contextSizeLimit) {
                const compressionResult = await compressContextForRequest(messages, postprocessedChatHistory, abortController.value.signal);
                if (compressionResult.compressed) messages = compressionResult.messages;
            }
```

- [ ] **Step 2: 移除无引用的 `estimateContextTokens`**

`assets/js/app.js:6994-7000`，删除整个函数及其注释：

```js
        // 字数估算：所有消息 content 字符总数 / 4，向上取整
        const estimateContextTokens = (messages) => {
            const totalChars = (Array.isArray(messages) ? messages : []).reduce((sum, m) => {
                return sum + String(m?.content || '').length;
            }, 0);
            return Math.ceil(totalChars / 4);
        };
```

（保留上方 `// ========== 上下文压缩（MAX_CONTEXT_SIZE 阈值触发） ==========` 分区注释。）

- [ ] **Step 3: 确认无残留引用**

Run: `grep -n "estimateContextTokens" assets/js/app.js`
Expected: 无输出（0 匹配）

- [ ] **Step 4: 语法检查**

Run: `node --check assets/js/app.js`
Expected: 无输出，退出码 0

- [ ] **Step 5: 浏览器验证**

1. 打开 `index.html`，选择 Task 1 中已对话过的角色（`contextTokens` 已知）。
2. 设置 → 上下文：把 `maxContextSize` 临时调低到小于该角色当前 `contextTokens`（例如当前 8000 → 调成 1000）。
3. 发一条消息 → 应出现「上下文超过阈值，旧对话已总结压缩」toast；继续发消息不再重复压缩（无可压缩楼层，静默跳过）。
4. 把 `maxContextSize` 调回默认 200000 → 发送消息 → 不出现压缩 toast。
5. 区分性验证（关键）：新建角色卡（`contextTokens: 0`）聊 1-2 条短消息后把 `maxContextSize` 调成很小的值（如 10）再发消息 → 不应触发压缩（旧逻辑用估算值会触发，新逻辑严格按存储值不触发），确认无估算兜底。
6. 压缩后继续对话，查看 `characters` store：`contextTokens` 回落为压缩后请求的真实 `prompt_tokens`（自校正）。

- [ ] **Step 6: Commit**

```bash
git add assets/js/app.js
git commit -m "feat: 上下文压缩触发条件改用角色卡存储的真实 token 数，移除估算函数"
```
