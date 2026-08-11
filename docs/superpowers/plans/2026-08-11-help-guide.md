# 使用说明（嵌入 Tab）实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在主应用侧边栏新增「使用说明」视图，以嵌入 JS 的 Markdown 内容渲染上手指南，离线可用。

**Architecture:** 新增 `assets/js/help-content.js` 暴露 `window.RPHubHelpContent`（Markdown 模板字符串），在 `index.html` 脚本加载顺序中插入（`default-cards.js` 之后、`app.js` 之前）。侧边栏新增按钮设置 `currentView = 'help'`，主内容区新增 `v-if` 视图，复用现有 `renderMarkdown(text, 'assistant', true)` + `.markdown-body` 样式渲染（与更新公告弹窗同构）。app.js 仅需读取全局字符串并在 `setup()` 返回。

**Tech Stack:** 原生 JS + Vue 3（Options API）+ Tailwind CDN + marked + DOMPurify。零构建工具。

## Global Constraints

- UI 语言 zh-CN；注释可用中文或英文（AGENTS.md）
- 零构建工具：无 package.json、无测试框架；验证用 `node --check`（语法）+ 浏览器手动验证
- 内容必须嵌入 JS 源码（`file://` 下浏览器 CORS 拦截 fetch 本地文件）
- 视图 id 用 `help`，不得与现有 `usage`（Token 统计）混淆
- 脚本加载顺序不可打乱，`help-content.js` 只能插在 `default-cards.js` 与 `app.js` 之间
- 复用现有 `renderMarkdown(text, 'assistant', true)`；渲染结果用 `.markdown-body` 容器（样式已存在于 styles.css）
- 内容为初稿，用户后续会审改（用户提供素材、开发者组织初稿的分工约定）；不改动既有功能
- 不做首次启动弹窗、不做外部文档站、不覆盖 character/index.html

---

### Task 1: 创建 `assets/js/help-content.js`（内容初稿）

**Files:**
- Create: `assets/js/help-content.js`

**Interfaces:**
- Consumes: 无（纯数据文件，无依赖）
- Produces: `window.RPHubHelpContent` — Markdown 模板字符串，供 Task 2 加载、Task 4 渲染

- [ ] **Step 1: 创建文件**

创建 `assets/js/help-content.js`，内容如下（IIFE 包裹，与 `card-utils.js` 命名空间模式一致；内容为初稿，涵盖四大节：快速开始 / 核心功能一览 / 常见问题 / 数据存储说明）：

```js
// help-content.js — 「使用说明」内容（Markdown 字符串）
// 暴露 window.RPHubHelpContent，供主应用渲染。
// 注意：内容为初稿，可随时在此审改；如内容中出现反引号需转义为 \`。
(function () {
    'use strict';
    window.RPHubHelpContent = `
# 使用说明

## 快速开始

1. 打开左侧「角色卡管理」，点击导入按钮，选择角色卡图片（PNG）或 JSON 文件导入角色
2. 回到「聊天」页面，在顶部选择你导入的角色
3. 输入消息，开始与角色对话

## 核心功能一览

- **聊天**：与角色对话的主界面，支持 Markdown 渲染、正则处理与 UI 模板美化
- **记忆系统**：浏览长期记忆与对话历史，可压缩总结，保持跨会话连贯性
- **角色卡管理**：导入、编辑、整理你的角色卡
- **角色卡生成**：内置角色卡工坊，可视化编辑角色卡内容
- **UI 模板**：自定义聊天界面外观与排版
- **统计**：查看 Token 用量等运行数据
- **高级**：预设、世界书、正则脚本等进阶配置
- **设置**：模型接入、密钥与应用偏好配置

## 常见问题

**Q：我的数据存在哪里？会丢失吗？**
数据保存在当前浏览器的本地存储（IndexedDB / localforage）中，不会上传到服务器。清理浏览器数据前，请先在「角色卡管理」中导出重要角色卡。

**Q：如何换设备使用？**
角色卡可以导出后在新设备导入；对话记录与设置暂不支持云同步。

## 数据存储说明

所有数据（角色卡、对话记录、记忆、设置）均保存在浏览器本地，与应用部署位置无关。删除浏览器站点数据将清空全部内容，请谨慎操作。
`;
})();
```

- [ ] **Step 2: 语法验证**

Run: `node --check assets/js/help-content.js`
Expected: 无输出、退出码 0（语法合法）

- [ ] **Step 3: 提交**

```bash
git add assets/js/help-content.js
git commit -m "feat: 新增使用说明内容文件"
```

---

### Task 2: index.html 加载 `help-content.js`

**Files:**
- Modify: `index.html:5119-5120`（脚本加载区，`default-cards.js` 与 `app.js` 两行之间）

**Interfaces:**
- Consumes: Task 1 的 `window.RPHubHelpContent`
- Produces: 全局可用的 `window.RPHubHelpContent`（先于 app.js 执行）

- [ ] **Step 1: 插入脚本标签**

在 `index.html` 底部脚本加载序列中，在 `default-cards.js` 行与 `app.js` 行之间插入（保持 document.write + 时间戳缓存清除模式）：

```html
        document.write('<script src="assets/js/help-content.js?v=' + new Date().getTime() + '"><\/script>');
```

即加载顺序变为：utils.js → card-utils.js → ui-select.js → default-cards.js → **help-content.js** → app.js

- [ ] **Step 2: 验证加载顺序**

Run: `grep -n "document.write" index.html`
Expected: 6 行输出，顺序为 utils.js, card-utils.js, ui-select.js, default-cards.js, help-content.js, app.js

- [ ] **Step 3: 提交**

```bash
git add index.html
git commit -m "feat: 加载使用说明内容脚本"
```

---

### Task 3: 侧边栏新增「使用说明」按钮

**Files:**
- Modify: `index.html:313`（「设置」按钮之前插入）

**Interfaces:**
- Consumes: `currentView`（已存在于 app.js setup）、`closeMobileMenu()`（已存在）
- Produces: `currentView = 'help'` 切换入口，Task 4 的视图据此显示

- [ ] **Step 1: 插入按钮**

在「设置」按钮（`@click="currentView = 'settings'..."`）之前插入，完全仿照现有导航按钮模式（active 态 `bg-primary-50 text-primary-700`、折叠态 `w-12 h-12 mx-auto justify-center p-0`、图标问号）：

```html
                <button @click="currentView = 'help'; closeMobileMenu()"
                    title="使用说明"
                    :class="['sidebar-nav-button flex items-center rounded-xl transition-all duration-200 font-medium', currentView === 'help' ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900', isSidebarCollapsed ? 'w-12 h-12 mx-auto justify-center p-0' : 'w-full px-3 py-2.5']">
                    <svg class="w-5 h-5" :class="isSidebarCollapsed ? 'mr-0' : 'mr-3'" fill="none" stroke="currentColor"
                        viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                        </path>
                    </svg>
                    <span v-show="!isSidebarCollapsed" class="whitespace-nowrap overflow-hidden">使用说明</span>
                </button>
```

- [ ] **Step 2: 浏览器验证**

打开 `index.html`（file:// 即可），点击「使用说明」按钮：
Expected: 主内容区切换为空白视图（Task 4 未完成属预期），按钮出现 active 高亮；再点「聊天」可返回

- [ ] **Step 3: 提交**

```bash
git add index.html
git commit -m "feat: 侧边栏新增使用说明入口"
```

---

### Task 4: app.js 注入内容 + 主内容区 help 视图

**Files:**
- Modify: `assets/js/app.js`（两处：`latestUpdate` 定义附近 + `setup()` 返回对象）
- Modify: `index.html`（settings 视图区块之后新增 help 视图区块）

**Interfaces:**
- Consumes: `window.RPHubHelpContent`（Task 1/2）、`renderMarkdown`（app.js 已有，`(text, role='assistant', skipRegex=false)`）
- Produces: `helpContent` — setup 返回属性，模板中用于 `renderMarkdown(helpContent, 'assistant', true)`

- [ ] **Step 1: app.js 读取全局内容**

在 `setup()` 内 `latestUpdate` reactive 定义（约 app.js:286）附近添加：

```js
        const helpContent = window.RPHubHelpContent || '';
```

- [ ] **Step 2: app.js setup 返回 `helpContent`**

在 `setup()` 返回对象（约 app.js:10212 的 `return {` 块）中，与 `latestUpdate` 相邻处添加 `helpContent,`。

- [ ] **Step 3: index.html 新增 help 视图**

在 settings 视图区块（`currentView === 'settings'` 的 `v-if` 块，index.html:1565 起）**结束后**新增，仿照其容器结构（`h-full overflow-y-auto` + `max-w-3xl mx-auto` + 标题栏），内容复用公告弹窗的渲染结构（`.prose` + `.markdown-body` + `v-html`）：

```html
            <div v-if="currentView === 'help'" class="p-4 md:p-6 h-full overflow-y-auto animate-fade-in">
                <div class="max-w-3xl mx-auto flex items-center mb-4 md:mb-6">
                    <button @click="toggleMobileMenu"
                        class="md:hidden mr-3 text-gray-500 md:hover:text-gray-700 active:text-gray-700 transition-colors">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 6h16M4 12h16m-7 6h7"></path>
                        </svg>
                    </button>
                    <h2 class="text-xl md:text-2xl font-bold text-gray-800 flex items-center">
                        <svg class="w-6 h-6 md:w-7 md:h-7 mr-2 text-primary-600" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z">
                            </path>
                        </svg>
                        使用说明
                    </h2>
                </div>
                <div class="max-w-3xl mx-auto">
                    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                        <div class="prose prose-sm prose-gray max-w-none">
                            <div class="markdown-body" v-html="renderMarkdown(helpContent, 'assistant', true)"></div>
                        </div>
                    </div>
                </div>
            </div>
```

- [ ] **Step 4: 语法验证**

Run: `node --check assets/js/app.js`
Expected: 无输出、退出码 0

- [ ] **Step 5: 浏览器验证（file:// 下完整验证）**

1. 打开 `index.html`，点击侧边栏「使用说明」：标题与 Markdown 内容完整渲染，标题/列表/粗体样式正确
2. 依次点击各既有视图（聊天、记忆、统计、设置）再返回「使用说明」：切换正常、内容不丢失
3. 控制台无报错（重点确认 help-content.js 加载顺序正确、`helpContent` 未 undefined）
4. 侧边栏折叠（点击收起按钮）后再次展开，入口正常
5. 刷新页面后「使用说明」内容仍正常渲染（无缓存问题）

- [ ] **Step 6: 提交**

```bash
git add assets/js/app.js index.html
git commit -m "feat: 主应用新增使用说明视图"
```

---
