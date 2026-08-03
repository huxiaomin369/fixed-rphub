# 聊天界面上下文长度显示 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在聊天输入栏模型切换按钮旁显示 API 上报的当前上下文 token 数与 `maxContextSize` 上限（如 `12,345 / 200,000`）。

**Architecture:** 最小侵入改动：新增响应式 ref `lastContextTokens`，在 `generateResponse` 成功路径（`recordApiUsage` 调用处）用 `normalizeApiUsage` 的 `inputTokens` 赋值；在清空/删除/切换角色处重置为 null；模板在模型切换按钮后追加徽章，无值时不渲染。复用现有 usage 归一化管道与 `formatTokenCount`。

**Tech Stack:** Vue 3（Options API + setup()）、原生 fetch、无构建工具（直接浏览器打开 `index.html`）、无测试框架（手动验证）。

## Global Constraints

- 零构建工具：直接编辑 JS/HTML 文件后浏览器刷新验证；不得引入 npm/打包步骤。
- 不新增文件；仅改 `assets/js/app.js` 与 `index.html`。
- 状态命名遵循现有风格：`camelCase` ref，中文注释。
- UI 语言 zh-CN；徽章样式参照现有 `typing-timer-badge`（index.html:748）。
- 复用现有 `normalizeApiUsage`（app.js:2018）、`formatTokenCount`（app.js:11563）、`settings.maxContextSize`（app.js:589）；不得改动这些现有函数。
- 失败/中止请求时不得更新 `lastContextTokens`（保留上次成功值）；仅在成功路径赋值。

---

### Task 1: 新增 `lastContextTokens` ref 并在请求成功时赋值

**Files:**
- Modify: `assets/js/app.js:542`（新增 ref）
- Modify: `assets/js/app.js:6378`（`recordApiUsage` 调用前赋值）
- Modify: `assets/js/app.js:11582`（setup 返回块，Status Exports 行附近导出）

**Interfaces:**
- Produces: `lastContextTokens` — Vue `ref<number|null>`，初始 `null`，成功响应后为归一化 `inputTokens`；模板与后续任务（Task 2 重置、Task 3 渲染）依赖它。
- Consumes: 现有 `normalizeApiUsage`（app.js:2018，返回 `{ inputTokens, outputTokens, totalTokens, cacheReadTokens, cacheWriteTokens, reasoningTokens, reported }`）、现有局部变量 `responseUsage`（app.js:6054）。

- [ ] **Step 1: 新增 ref**

在 `assets/js/app.js:542`（`const apiLatency = ref(0);` 之后）插入：

```js
const apiLatency = ref(0);
const lastContextTokens = ref(null); // 最近一次 API 成功响应上报的当前上下文 token 数（prompt_tokens）
```

- [ ] **Step 2: 成功路径赋值**

在 `assets/js/app.js:6378` 的 `recordApiUsage(responseUsage, {` 之前插入：

```js
const normalizedUsage = normalizeApiUsage(responseUsage);
lastContextTokens.value = normalizedUsage.reported ? normalizedUsage.inputTokens : null;
recordApiUsage(responseUsage, {
```

即原代码变为：

```js
                        const normalizedUsage = normalizeApiUsage(responseUsage);
                        lastContextTokens.value = normalizedUsage.reported ? normalizedUsage.inputTokens : null;
                        recordApiUsage(responseUsage, {
                            type: activeToolDepth > 0 ? 'tool_continuation' : 'chat',
                            model: requestModel,
                            detail: activeToolDepth > 0 ? `第 ${activeToolDepth} 次续写` : ''
                        });
```

注：`normalizeApiUsage(null)` 返回 `{ reported: false, ... }`，安全；`recordApiUsage` 内部会再次归一化，双次调用每请求仅一次，可忽略。

- [ ] **Step 3: setup 导出**

在 `assets/js/app.js:11605`（`apiStatus, apiLatency, imageGenStatus, imageGenLatency, checkAllStatuses, // Status Exports`）行追加：

```js
apiStatus, apiLatency, imageGenStatus, imageGenLatency, checkAllStatuses, lastContextTokens, // Status Exports
```

- [ ] **Step 4: 语法检查**

运行：`node --check assets/js/app.js`
预期输出：无错误信息（exit code 0）。

- [ ] **Step 5: 提交**

```bash
git add assets/js/app.js
git commit -m "feat: 新增 lastContextTokens 状态，记录最近一次 API 上报的上下文长度"
```

---

### Task 2: 会话生命周期重置

**Files:**
- Modify: `assets/js/app.js:4580`（`clearChat`）
- Modify: `assets/js/app.js:9503`（`deleteCharacter` 单删路径）
- Modify: `assets/js/app.js:9565`（批量删除路径）
- Modify: `assets/js/app.js:10023`（`selectCharacter`）

**Interfaces:**
- Consumes: Task 1 的 `lastContextTokens` ref。
- Produces: 无新接口；保证切角色/清空后徽章不显示过期数据。

- [ ] **Step 1: `clearChat` 重置**

在 `assets/js/app.js:4580`（`chatHistory.value = [];`）之后插入：

```js
chatHistory.value = [];
lastContextTokens.value = null;
```

- [ ] **Step 2: `deleteCharacter` 单删路径重置**

在 `assets/js/app.js:9503`（`chatHistory.value = [];`）之后插入：

```js
chatHistory.value = [];
lastContextTokens.value = null;
```

- [ ] **Step 3: 批量删除路径重置**

在 `assets/js/app.js:9565`（`if (newIndex === -1) chatHistory.value = [];`）改为：

```js
if (newIndex === -1) {
    chatHistory.value = [];
    lastContextTokens.value = null;
}
```

- [ ] **Step 4: `selectCharacter` 角色切换重置**

在 `assets/js/app.js:10023`（`chatHistory.value = loadedChatHistory;`）之后插入：

```js
chatHistory.value = loadedChatHistory;
lastContextTokens.value = null;
```

- [ ] **Step 5: 语法检查**

运行：`node --check assets/js/app.js`
预期输出：无错误信息（exit code 0）。

- [ ] **Step 6: 提交**

```bash
git add assets/js/app.js
git commit -m "feat: 切换/删除角色、清空会话时重置上下文长度显示"
```

---

### Task 3: 输入栏徽章渲染

**Files:**
- Modify: `index.html:1160-1161`（模型切换按钮 `</button>` 之后、外层 `</div>` 之前）

**Interfaces:**
- Consumes: Task 1 导出的 `lastContextTokens`、现有 `formatTokenCount`（app.js:11563，`(value) => Number.isFinite(value) ? value.toLocaleString() : '0'`）、现有 `settings.maxContextSize`。

- [ ] **Step 1: 追加徽章**

将 `index.html:1160-1161`：

```html
                                        模型
                                    </button>
                                </div>
```

改为：

```html
                                        模型
                                    </button>
                                    <div v-if="lastContextTokens !== null"
                                        class="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-mono bg-white/50 backdrop-blur-sm border border-white/50 shadow-sm text-gray-500"
                                        :title="`当前上下文 ${lastContextTokens.toLocaleString()} / 上限 ${settings.maxContextSize.toLocaleString()}`">
                                        <span class="text-teal-600 font-bold">{{ formatTokenCount(lastContextTokens) }}</span>
                                        <span class="opacity-60">/</span>
                                        <span>{{ formatTokenCount(settings.maxContextSize) }}</span>
                                    </div>
                                </div>
```

- [ ] **Step 2: 提交**

```bash
git add index.html
git commit -m "feat: 输入栏显示当前上下文/最大上下文长度徽章"
```

---

### Task 4: 浏览器手动验证

**Files:** 无改动，纯验证。

- [ ] **Step 1: 基础功能**

浏览器打开 `index.html`（直接 file:// 或本地静态服务器）。发送一条消息，等回复完成后确认：模型切换按钮右侧出现徽章，显示如 `1,234 / 200,000`（数字与设置中 maxContextSize 一致，分子为本次请求 prompt_tokens）。

- [ ] **Step 2: 流式/非流式**

设置中切换 `settings.stream`（设置面板的流式开关），各发一条消息，徽章均在回复完成后更新且与统计页 token 记录一致。

- [ ] **Step 3: 首次加载隐藏**

刷新页面，未发消息前徽章不显示。

- [ ] **Step 4: 角色切换/清空**

- 发送消息产生徽章 → 切换另一角色 → 徽章消失；在新角色发消息 → 徽章出现。
- 发送消息产生徽章 → 清空会话 → 徽章消失。
- 删除当前角色 → 徽章消失。

- [ ] **Step 5: maxContextSize 联动**

设置面板修改 maxContextSize（如 200000 → 100000），徽章分母立即变为 100,000，无需发消息。

- [ ] **Step 6: 无 usage 响应场景（如条件允许）**

若某 provider 不返回 usage（或临时在 `generateResponse` 中手动将 `responseUsage` 置 null 测试后还原），徽章不显示或保留上次值，控制台无报错。

- [ ] **Step 7: 控制台无错误**

以上操作全程 DevTools Console 无 JS 报错。
