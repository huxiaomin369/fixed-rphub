# Roleplay Hub — 默认角色卡（开箱即用）设计

**日期**：2026-08-11
**状态**：已获用户批准，待写入实现计划
**范围**：内置几张默认角色卡，首次运行自动播种 + 设置页"恢复默认角色卡"按钮（追加去重）

---

## 1. 目标与背景

RP-Hub 首次启动时角色列表为空（`characters = ref([])`，IndexedDB `RPHubDB` → `rp_hub_characters` 无数据）。目标：让玩家开箱即用——预置几张默认角色卡。

**决策记录**（与用户确认）：
- **生效范围**：Web 版与桌面版（Electron 只是同一 Web 应用的包装）都生效，播种逻辑放共享 `app.js`
- **卡内容**：用户自己的 PNG v2 角色卡（用户手动命名后拷入 `cards/default/`，不经重命名脚本）
- **播种时机**：仅首次（角色列表为空）自动播种 + 设置页"恢复默认角色卡"按钮
- **恢复语义**：追加 + 按 name 去重，绝不删除用户自己的卡

**方案选型**：内嵌 JS 产物（`assets/js/default-cards.js`），而非运行时 fetch 卡文件——浏览器 file:// 直接打开（官方支持用法）时 fetch 本地文件被 CORS 拦截，内嵌是唯一全环境（file:// / http 托管 / Electron）可靠的做法。

---

## 2. 架构

### 2.1 文件结构

```
RP-Hub/
├── cards/
│   └── default/                ← 新增：用户放置 PNG v2 卡的目录（不进桌面包）
│       └── <命名的卡>.png
├── build_default_cards.py      ← 新增：提取 PNG 内嵌 chara JSON + 压缩头像 → 生成 default-cards.js
├── assets/js/
│   └── default-cards.js        ← 新增（生成产物，提交进仓库）：window.RPHubDefaultCards
├── index.html                  ← 修改：在 app.js 前加载 default-cards.js
├── assets/js/app.js            ← 修改：播种逻辑 + 恢复按钮 + 解析函数提取
└── desktop/copy-web.js         ← 修改：SKIP_NAMES 增加 'cards'
```

### 2.2 生成脚本 `build_default_cards.py`

- 扫描 `cards/default/*.png`（按文件名排序，即默认卡顺序）
- 提取 PNG tEXt 块中的 `chara` JSON（V2 卡规范）
- 头像：用 Pillow 压缩（仅缩小不放大：最长边超过 1024 才缩到 1024；**含透明通道的图保留 PNG 格式**，不透明图转 JPEG quality 85）；**Pillow 缺失时原样内嵌 PNG，不报错**
- 输出 `assets/js/default-cards.js`：
  - `window.RPHubDefaultCards = [{ ...原始 V2 字段, avatar: "data:..." }, ...]`
  - **保留原始 V2 结构**，运行时复用现有导入管线归一化（单一解析来源）
  - 无 `chara` 块的 PNG → 警告并跳过，结束时汇总报告
- 与 `rename_cards.py` 无关，不承担任何重命名职责

### 2.3 运行时加载顺序（index.html）

`utils.js` → `card-utils.js` → `ui-select.js` → **`default-cards.js`（新增）** → `app.js`

### 2.4 app.js 改动（3 处）

1. **提取解析函数**：把 `importCharacter` 内的 `processCharacterData` 解析逻辑提取为可复用函数 `parseExternalCardData(rawData, avatarUrl)`（V2 字段映射、worldInfo / regexScripts / uiTemplates 归一化保持不变），导入与播种共用
2. **首次播种**：`loadData()` 中 `getStoredValue('characters')` 为空/不存在 → 逐张调用 `parseExternalCardData` → push → `setStoredValue('characters', ...)`
3. **恢复默认**：新增 `restoreDefaultCards()`——过滤 name 已存在的卡 → 解析 → 追加 → 保存 → toast 反馈"已添加 N 张默认卡，M 张已存在跳过"

### 2.5 设置页 UI

设置面板新增"默认角色卡"分区（沿用现有卡片式分区样式，置于用户设置分区附近）：说明文字 + "恢复默认角色卡"按钮（loading 态防连点）。

---

## 3. 数据流

- **首次启动**：`loadData()` → `characters` 为空 → 遍历 `RPHubDefaultCards` → `parseExternalCardData()` 归一化 → push → 持久化 → 正常渲染。与手工导入路径一致，卡片行为与手工导入完全一致
- **恢复默认**：按钮 → 按 name 去重过滤 → 解析 → 追加 → 保存 → toast
- **后续更新默认卡内容**：重新运行生成脚本 + 已播种过的用户需点"恢复默认"才能拿到新卡（预期行为，不做自动补卡）

---

## 4. 错误处理

- **脚本侧**：无 `chara` 块 → 警告跳过 + 汇总报告；无 Pillow → 原样内嵌；输出目录自动创建
- **运行时**：
  - `RPHubDefaultCards` 未定义（加载失败/老缓存）→ 静默跳过播种，启动不受影响
  - 单张卡解析失败 → 跳过该卡继续
  - 播种位于 `loadData` 的 try/catch 内，异常不打断主流程
  - 恢复按钮重复点击 → loading 态防连点；同名单据已在客户端去重，重复点击不产生重复卡

---

## 5. 验证（无自动化测试基建，手动验证）

1. `python3 build_default_cards.py` 跑通，抽查 `default-cards.js`：JSON 可解析、头像 data URL 有效
2. **浏览器**（file:// 打开）：
   - 清空 IndexedDB → 默认卡出现、头像正常、可直接开聊
   - 已有用户卡 → 不受影响
   - "恢复默认" → 追加去重生效，重复点击不重复追加
3. **Electron 桌面**：同上流程各验证一遍
4. `desktop/copy-web.js` 的 SKIP_NAMES 增加 `cards`，`npm run stage` 后确认 `dist-stage/` 不含 `cards/`（原始 PNG 不进包）

---

## 6. 明确不做（YAGNI）

- 不做"缺卡自动补"（用户删掉的默认卡不复活）
- 不做默认卡编辑/删除的二次确认（复用现有卡片管理交互）
- 不做 Web 版/桌面版差异化（播种逻辑共享）
- 不做运行时 fetch 卡文件（CORS 不可行）
- 生成脚本不做卡重命名（用户手动管理）
