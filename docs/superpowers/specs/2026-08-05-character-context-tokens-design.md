# 设计：角色卡保存真实上下文 token 数并作为压缩触发条件

日期：2026-08-05
状态：已批准

## 背景与目标

当前上下文压缩的触发条件是每次发送前用本地估算 `estimateContextTokens(messages)`（总字符数 ÷ 4）与 `settings.maxContextSize` 比较（app.js:6178-6183）。估算对中文内容偏差大（中文约 1-1.5 token/字，÷4 低估 2-4 倍）。

目标：

1. 每张角色卡保存「当前 token 数」，初始值为 0。
2. 该存储值作为上下文压缩的唯一触发条件（严格使用，不兜底估算）。
3. token 数来源为 API 响应的真实 `prompt_tokens`（经 `normalizeApiUsage` 归一化的 `inputTokens`）。

## 设计

### 1. 数据模型

角色卡对象新增字段 `contextTokens: 0`：

- `createNewCharacter`（app.js:9596 附近默认对象）加入 `contextTokens: 0`。
- 导入角色卡构造对象（app.js:10758 `const char = {...}`）加入 `contextTokens: 0`。
- 旧数据兼容：所有读取处使用 `Number.isFinite(char.contextTokens) ? char.contextTokens : 0`，不做数据迁移。
- 导出天然排除：card-utils.js 的 `buildCharacterCardData` 为白名单字段导出，新字段不会进入导出的卡片（无需改动该文件）。

持久化：直接修改 `char.contextTokens` 会触发 `watch([characters, ...], { deep: true })`（app.js:2894）→ `debouncedSave()`（1s 防抖）→ `saveData()` → `setStoredValue('characters', ...)`。无需新增保存逻辑。

### 2. 更新时机

app.js:6661 成功响应路径（`normalizedUsage.reported` 为 true 时）追加：

```js
if (normalizedUsage.reported) {
    lastContextTokens.value = normalizedUsage.inputTokens;
    if (currentCharacter.value) currentCharacter.value.contextTokens = normalizedUsage.inputTokens;
}
```

- `normalizedUsage.inputTokens`：优先 `prompt_tokens`；Gemini 风格 `input_tokens` 时叠加 cache read/write（已有 normalizeApiUsage 处理，app.js:2075-2079）。
- 工具续写（`activeToolDepth > 0`）响应同样更新，最后一次为准。
- 请求失败/中断不更新（该代码位于成功分支内）。
- 无 `currentCharacter`（未选角色）时不写。

### 3. 触发条件

替换 app.js:6178-6183 的判断：

```js
const storedContextTokens = Number.isFinite(currentCharacter.value?.contextTokens)
    ? currentCharacter.value.contextTokens : 0;
if (Number.isFinite(contextSizeLimit) && contextSizeLimit > 0
    && storedContextTokens >= contextSizeLimit) {
    const compressionResult = await compressContextForRequest(messages, postprocessedChatHistory, abortController.value.signal);
    if (compressionResult.compressed) messages = compressionResult.messages;
}
```

压缩逻辑本身（`compressContextForRequest`、楼层保留 `CONTEXT_COMPRESS_KEEP_ROUNDS`、按角色摘要缓存 `context_summary`）完全不变。

### 4. 清理

`estimateContextTokens`（app.js:6995-7000）改后无引用，移除。

## 行为特性（无需额外代码，由设计自动成立）

- **压缩后自校正**：压缩后存储值仍是旧高值，下一次响应后自然回落到压缩后的真实 prompt_tokens。
- **首次对话**（存储 0）：不触发压缩，直到第一次成功响应写入真实值。若初始上下文超过模型限制，首次请求可能失败——用户已确认接受（严格只用存储值）。
- **重复触发无害**：压缩后若存储值仍 ≥ 阈值，下次请求再次进入 `compressContextForRequest`，无可压缩消息（`replaceable.length === 0`）时返回 `compressed: false`，无副作用。
- **API 不报 usage**：存储值保持 0，永不触发压缩（用户已确认接受）。
- 全局 `lastContextTokens` 状态栏显示逻辑保持不变。

## 验证（无测试框架，浏览器手动验证）

1. 新建角色卡 → 角色对象含 `contextTokens: 0`。
2. 发一条消息 → 检查角色对象 `contextTokens` 等于该次响应的 prompt_tokens。
3. 把 `maxContextSize` 临时调低到小于当前存储值 → 下一条消息触发「旧对话已总结压缩」toast。
4. 压缩后继续对话 → 存储值回落到压缩后的真实值。
5. 切换角色 → 各角色卡的存储值互不影响、随角色卡持久化（localforage `characters` 键）。

## 改动范围

仅 `assets/js/app.js`，共 4 处修改 + 1 处移除：

| 位置 | 改动 |
|---|---|
| `createNewCharacter` 默认对象（~9604） | 加 `contextTokens: 0` |
| 导入卡构造对象（10768 附近） | 加 `contextTokens: 0` |
| 成功响应路径（6661） | 写入 `currentCharacter.value.contextTokens` |
| 触发条件（6178-6183） | 改用存储值判断 |
| `estimateContextTokens`（6995-7000） | 移除（无引用） |
