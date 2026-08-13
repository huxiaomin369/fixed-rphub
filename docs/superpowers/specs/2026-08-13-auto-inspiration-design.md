# 续写完成自动生成 AI 灵感设计

- **日期**: 2026-08-13
- **状态**: 已批准(静默生成 + 红点提示)
- **关联**: `novel/index.html`(AI 小说创作页)

## 背景与目标

续写章节完成后,用户需要手动点击右上角「AI 灵感」按钮并点「生成灵感」才能获得后续剧情走向建议。目标:每次续写(整批)完成后自动生成灵感,静默进行、不打断写作,通过灵感按钮红点提示用户有新灵感可看。

## 现状关键事实

- 多章生成 = **多次 API 调用**:`generateLoop`(novel/index.html:2315)每次流式调用生成一章 → push → `count--` → 有余量则 `setTimeout(generateLoop, 1000)` 递归下一章;整批完成时走 `else` 分支置 `isGenerating = false`(2482-2486)
- `generateInspirations`(约 2100 行)已有守卫:模型/apiUrl/apiKey 缺失时 toast+打开设置、`chapters.length === 0` toast、`isGeneratingInspiration` 防重入
- 灵感悬浮按钮:`showInspirationModal = true` 的 @click(680 行),hover 有文字提示
- 灵感弹窗模板已有 `isGeneratingInspiration` 生成中分支与 `inspirations` 列表渲染(715-729 行)

## 设计

### 1. 触发时机(整批完成后一次)

`startGeneration` 的批次结束分支(2482-2486):

```js
if (count > 0 && isGenerating.value) {
    setTimeout(generateLoop, 1000);
} else {
    isGenerating.value = false;
    generateInspirations(true); // 新增: 整批完成后自动静默生成灵感
}
```

- 仅整批**全部成功完成**时触发一次;中断(AbortError)/报错路径(2488-2497)不触发
- 重写单章 `regenerateChapter`(1463)不触发

### 2. `generateInspirations(silent = false)` 静默模式

- `silent === false`(手动点击):现有行为完全不变
- `silent === true`(自动触发):
  - apiUrl/apiKey/model 未配置、无章节、或正在生成 → **静默 return**(不 toast、不打开设置)
  - 生成成功 → 填充 `inspirations`、`hasNewInspiration.value = true`,不弹 toast
  - 生成失败 → 仅 `console.error`,不打扰写作
- 实现:函数签名加参数;开头守卫按 silent 分流;成功/失败提示按 silent 分流

### 3. 红点提示

- 新状态 `hasNewInspiration = ref(false)`,在 setup() 返回值导出
- 灵感悬浮按钮(680 行)右上角加红点:

```html
<span v-if="hasNewInspiration" class="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
```

- 点亮:仅自动(silent)生成成功后
- 清除:打开灵感弹窗时(680 行 @click 改为同时置 `hasNewInspiration = false`)

### 4. 改动范围

仅 `novel/index.html` 单文件 4 处:
1. `generateInspirations` 签名 + silent 分流(守卫/成功/失败三处)
2. `startGeneration` 批次结束分支加 `generateInspirations(true)`
3. `hasNewInspiration` 状态 + 导出
4. 灵感按钮红点 span + 弹窗打开时清除红点

不加设置开关(YAGNI)。

## 边界与错误处理

- 自动触发时模型未配置 → 静默跳过(与手动路径的引导性 toast 区分)
- 自动灵感生成与用户手动操作并发 → `isGeneratingInspiration` 防重入守卫已覆盖
- 红点在用户打开弹窗后清除;若自动生成仍在进行中,弹窗内展示现有「生成中...」状态
- 多章连写:批次中间每章完成不触发,仅最后全部完成触发一次

## 测试与验证

1. `node` 提取内联 script 语法检查(与上次灵感修复相同方法)
2. 浏览器手动验证:
   - 单章续写完成 → 无 toast 弹扰 → 灵感按钮出现红点 → 点开弹窗:5 条走向已就绪、红点消失
   - 多章连写(如 3 章)→ 每章完成时无红点,第 3 章完成后才出现红点
   - 中断/报错路径 → 无红点、无灵感请求
   - 未配置 API → 静默,无 toast/无弹设置
   - 手动点击「生成灵感」行为与修复后一致
