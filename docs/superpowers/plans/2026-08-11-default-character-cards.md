# 默认角色卡（开箱即用）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 内置几张默认角色卡：首次启动自动播种，设置页提供"恢复默认角色卡"按钮（追加+按 name 去重）。

**Architecture:** 用户把命名好的 PNG v2 卡放入 `cards/default/`（已被 .gitignore 忽略，不提交）；`build_default_cards.py` 提取 PNG 内嵌 `chara` JSON + 头像，生成 `assets/js/default-cards.js`（`window.RPHubDefaultCards`，产物提交）；`app.js` 在首次启动（`characters` 从未保存过）时复用现有导入管线归一化后播种；设置页新增"默认角色卡"分区 + 恢复按钮。桌面打包 `copy-web.js` 跳过 `cards/`。

**Tech Stack:** Python 3（标准库 + 可选 Pillow）、Vue 3 Options API（app.js 单文件 ~10K 行）、原生 IndexedDB、Electron（desktop/ 子项目）。

**Spec:** `docs/superpowers/specs/2026-08-11-default-character-cards-design.md`

## Global Constraints

- 零构建工具：不引入 package.json / npm；产物 `default-cards.js` 直接提交进仓库
- 播种只在 `characters` **从未保存过**（`savedChars === undefined || savedChars === null`）时发生；用户删光后重启**不**自动复活
- 恢复按钮 = 追加 + 按 name 去重，绝不删除用户自己的卡
- 解析必须复用现有导入管线（`parseExternalCardData`），不复制第二份字段映射逻辑
- 脚本不承担重命名职责，只扫描 `cards/default/*.png`
- UI 语言 zh-CN；注释中文
- 单张卡失败只跳过该张，不阻塞整体；`RPHubDefaultCards` 未定义时静默跳过播种
- 语法检查：`node --check assets/js/app.js`（无 linter/typecheck/测试框架）

---

### Task 1: 生成脚本 build_default_cards.py + 初始产物

**Files:**
- Create: `build_default_cards.py`
- Create: `assets/js/default-cards.js`（脚本生成的空产物）

**Interfaces:**
- Produces: `window.RPHubDefaultCards = [...]`（数组元素 = 原始 V2 chara JSON + `avatar` data URL 字段），供 Task 3/4 消费

- [ ] **Step 1: 编写脚本**

```python
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
默认角色卡生成脚本
扫描 cards/default/ 下的 PNG v2 角色卡，提取内嵌 chara JSON 与头像，
生成 assets/js/default-cards.js（window.RPHubDefaultCards）。
用法:
    python3 build_default_cards.py            # 生成
    python3 build_default_cards.py --dry-run  # 只报告，不写文件
    python3 build_default_cards.py --src X --out Y
"""

import argparse
import base64
import json
import os
import struct

CONFIG = {
    "src_dir": os.path.join("cards", "default"),
    "out_file": os.path.join("assets", "js", "default-cards.js"),
    "max_avatar_edge": 1024,
    "jpeg_quality": 85,
}

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def extract_chara_json(png_bytes):
    """从 PNG 字节中提取 tEXt 块 keyword='chara' 的 JSON 文本。"""
    if not png_bytes.startswith(PNG_SIGNATURE):
        raise ValueError("不是有效的 PNG 文件")
    pos = 8
    while pos + 8 <= len(png_bytes):
        length = struct.unpack(">I", png_bytes[pos:pos + 4])[0]
        chunk_type = png_bytes[pos + 4:pos + 8]
        data = png_bytes[pos + 8:pos + 8 + length]
        if chunk_type == b"IEND":
            break
        if chunk_type == b"tEXt" and b"\x00" in data:
            keyword, _, text = data.partition(b"\x00")
            if keyword == b"chara":
                return text.decode("latin-1")
        pos += 12 + length
    raise ValueError("未找到 chara 文本块（不是 V2 角色卡？）")


def compress_avatar(png_bytes):
    """头像压缩：仅缩小不放大（最长边 > 1024 才缩）；含透明通道保留 PNG，否则 JPEG q85。
    Pillow 缺失时原样返回 PNG。"""
    try:
        from PIL import Image
    except ImportError:
        return png_bytes, "image/png"
    import io
    img = Image.open(io.BytesIO(png_bytes))
    if max(img.size) > CONFIG["max_avatar_edge"]:
        resample = getattr(Image, "Resampling", Image).LANCZOS
        img.thumbnail((CONFIG["max_avatar_edge"], CONFIG["max_avatar_edge"]), resample)
    has_alpha = img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info)
    buf = io.BytesIO()
    if has_alpha:
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        img.save(buf, "PNG")
        mime = "image/png"
    else:
        if img.mode != "RGB":
            img = img.convert("RGB")
        img.save(buf, "JPEG", quality=CONFIG["jpeg_quality"])
        mime = "image/jpeg"
    return buf.getvalue(), mime


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", default=CONFIG["src_dir"])
    parser.add_argument("--out", default=CONFIG["out_file"])
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    cards = []
    skipped = []
    if os.path.isdir(args.src):
        for fname in sorted(os.listdir(args.src)):
            if not fname.lower().endswith(".png"):
                continue
            fpath = os.path.join(args.src, fname)
            with open(fpath, "rb") as f:
                png_bytes = f.read()
            try:
                chara_text = extract_chara_json(png_bytes)
                raw = json.loads(chara_text)
                avatar_b64, mime = compress_avatar(png_bytes)
                cards.append({**raw, "avatar": f"data:{mime};base64,{base64.b64encode(avatar_b64).decode('ascii')}"})
                print(f"[ok]   {fname} -> {raw.get('name', '(未命名)')}")
            except Exception as e:
                skipped.append((fname, str(e)))
                print(f"[skip] {fname}: {e}")
    else:
        print(f"[warn] 源目录不存在: {args.src}，生成空列表")

    out_js = "window.RPHubDefaultCards = " + json.dumps(cards, ensure_ascii=False) + ";\n"
    print(f"[summary] {len(cards)} 张卡，跳过 {len(skipped)} 张")
    if args.dry_run:
        return
    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        f.write(out_js)
    print(f"[write] {args.out}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: 运行脚本生成初始空产物**

Run: `python3 build_default_cards.py`
Expected: `[warn] 源目录不存在: cards/default，生成空列表` + `[summary] 0 张卡` + `[write] assets/js/default-cards.js`；文件内容为 `window.RPHubDefaultCards = [];`

- [ ] **Step 3: 验证提取逻辑（合成 PNG 自测）**

Run:
```bash
python3 - <<'EOF'
import build_default_cards as m
import struct, zlib, json

def chunk(typ, data):
    return struct.pack(">I", len(data)) + typ + data + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)

ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 6, 0, 0, 0)
png = m.PNG_SIGNATURE + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(b"\x00\xff\x00\x00\xff"))
chara = json.dumps({"name": "测试卡", "description": "desc"}).encode("latin-1")
png += chunk(b"tEXt", b"chara\x00" + chara) + chunk(b"IEND", b"")
assert json.loads(m.extract_chara_json(png))["name"] == "测试卡"
print("extract_chara_json OK")
EOF
```
Expected: `extract_chara_json OK`

- [ ] **Step 4: 语法检查 + 提交**

Run: `python3 -m py_compile build_default_cards.py`（Expected: 无输出）
Run:
```bash
git add build_default_cards.py assets/js/default-cards.js
git commit -m "feat: 默认角色卡生成脚本与初始产物"
```

---

### Task 2: app.js 提取 parseExternalCardData

**Files:**
- Modify: `assets/js/app.js:8798-9009`（`importCharacter` 内的 `processCharacterData`）

**Interfaces:**
- Consumes: 无（纯提取）
- Produces: `parseExternalCardData(rawData, avatarUrl) => Promise<Object>` — 解析并归一化 V2 卡数据，返回内部格式 char 对象（`{name, description, first_mes, avatar, personality, creator_notes, worldInfo, regexScripts, uiTemplates, recentGenerationTimes, contextTokens, uuid, createdAt}`）；解析失败**抛错**（不吞）。Task 3/4 均调用它。

- [ ] **Step 1: 重构**

把 `const processCharacterData = async (rawData, avatarUrl) => {`（8798 行）到 `};`（9009 行）拆成两个函数：

```js
const parseExternalCardData = async (rawData, avatarUrl) => {
    // 【原样搬移】原 8800-8996 行的解析体（从 `let charData = rawData;` 开始，
    // 到 regexScripts 处理块结束的 `}` 为止），去掉外层 try/catch 包裹，
    // 末尾把 `characters.value.push(char);`（8998 行）改为 `return char;`
    // 注意：原始字段映射、normalizeWorldInfoEntry/normalizeRegexScript/
    // normalizeUiTemplate/sanitizeUiTemplateImportEntry 调用全部保持不动
};

const processCharacterData = async (rawData, avatarUrl) => {
    try {
        const char = await parseExternalCardData(rawData, avatarUrl);
        if (!char) return;
        characters.value.push(char);

        // Auto-select the new character and enter chat immediately.
        const newCharacterIndex = characters.value.length - 1;
        showAddCharacterMenu.value = false;
        await selectCharacter(newCharacterIndex, true);

    } catch (err) {
        console.error("Character processing error:", err);
        showToast('解析角色数据失败: ' + err.message, 'error');
    }
};
```

注意：解析体内部用到的 `defaultAvatar`、`generateUUID`、各 normalize 函数都在 setup() 闭包内，无需改动作用域；解析体没有引用 `characters`（push 在原 8998 行，属于被拆出部分）。

- [ ] **Step 2: 语法检查**

Run: `node --check assets/js/app.js`
Expected: 无输出，退出码 0

- [ ] **Step 3: 手动验证导入路径未破坏**

浏览器打开 `index.html` → 导入一张 PNG/JSON 角色卡 → 卡片正常出现、自动进入聊天、无报错。
（验证后无需清理：此步只验证现有功能不变）

- [ ] **Step 4: 提交**

```bash
git add assets/js/app.js
git commit -m "refactor: 提取 parseExternalCardData 供导入与播种共用"
```

---

### Task 3: app.js 首次启动播种

**Files:**
- Modify: `assets/js/app.js:2309-2311`（`loadData()` 中 `if (savedChars) {...}` 块之后、`const savedSettings` 之前）

**Interfaces:**
- Consumes: `parseExternalCardData`（Task 2）、`window.RPHubDefaultCards`（Task 1 产物）、`setStoredValue`、`getStoredValue`（已存在）
- Produces: 首次启动时 `characters.value` 被填充默认卡并持久化

- [ ] **Step 1: 在 loadData 中加入播种逻辑**

在 2309 行（`if (savedChars) { ... }` 的收尾 `}`）与 2311 行（`const savedSettings = ...`）之间插入：

```js
                // --- Seed default character cards (首次启动开箱即用) ---
                if ((savedChars === undefined || savedChars === null)
                    && typeof window.RPHubDefaultCards !== 'undefined'
                    && Array.isArray(window.RPHubDefaultCards)
                    && window.RPHubDefaultCards.length > 0) {
                    let seeded = 0;
                    for (const rawCard of window.RPHubDefaultCards) {
                        try {
                            const char = await parseExternalCardData(rawCard, rawCard.avatar || null);
                            if (char) {
                                characters.value.push(char);
                                seeded++;
                            }
                        } catch (e) {
                            console.warn('Skip default card:', rawCard.name || 'unknown', e);
                        }
                    }
                    if (seeded > 0) {
                        await setStoredValue('characters', characters.value);
                        console.log(`Seeded ${seeded} default character cards`);
                    }
                }
```

注意：播种**不**调用 `selectCharacter`，不打断 loadData 后续流程；单卡失败仅 console.warn 跳过。

- [ ] **Step 2: 语法检查**

Run: `node --check assets/js/app.js`
Expected: 无输出，退出码 0

- [ ] **Step 3: 手动验证**

浏览器打开 `index.html`：先清空 IndexedDB（DevTools → Application → IndexedDB → RPHubDB → 删除）与 localStorage，刷新页面 → 若 default-cards.js 非空，Console 出现 `Seeded N default character cards`，侧边栏出现默认卡、头像正常、可直接开聊。若为空的初始产物，可把一张合成测试卡放入 `cards/default/` 重跑 Task 1 脚本后再验证。

- [ ] **Step 4: 提交**

```bash
git add assets/js/app.js
git commit -m "feat: 首次启动自动播种默认角色卡"
```

---

### Task 4: app.js 恢复默认按钮逻辑

**Files:**
- Modify: `assets/js/app.js` — 新增函数（放在 `importCharacter` 定义结束处 9076 行 `};` 之后、`buildCharacterExportData` 之前）
- Modify: `assets/js/app.js:10173` 附近 — setup() 返回对象

**Interfaces:**
- Consumes: `parseExternalCardData`（Task 2）、`window.RPHubDefaultCards`
- Produces: `restoreDefaultCards()`（追加+去重，toast 反馈）、`restoreDefaultCardsBusy`（ref，防连点）、`defaultCardCount`（computed）— 三者均加入 setup() 返回对象，供 Task 5 模板消费

- [ ] **Step 1: 新增函数与状态**

在 `importCharacter` 定义结束（9076 行 `};`）之后、`buildCharacterExportData`（9078 行）之前插入：

```js
        const restoreDefaultCardsBusy = ref(false);

        const defaultCardCount = computed(() => {
            return (typeof window.RPHubDefaultCards !== 'undefined' && Array.isArray(window.RPHubDefaultCards))
                ? window.RPHubDefaultCards.length
                : 0;
        });

        const restoreDefaultCards = async () => {
            if (restoreDefaultCardsBusy.value) return;
            const defaults = window.RPHubDefaultCards;
            if (!defaults || !Array.isArray(defaults) || defaults.length === 0) {
                showToast('没有可恢复的默认角色卡', 'warning');
                return;
            }
            restoreDefaultCardsBusy.value = true;
            try {
                const existingNames = new Set(characters.value.map(c => c.name));
                let added = 0, skipped = 0;
                for (const rawCard of defaults) {
                    const name = rawCard.name || rawCard.char_name || 'Unknown';
                    if (existingNames.has(name)) { skipped++; continue; }
                    try {
                        const char = await parseExternalCardData(rawCard, rawCard.avatar || null);
                        if (char) {
                            characters.value.push(char);
                            existingNames.add(char.name);
                            added++;
                        } else {
                            skipped++;
                        }
                    } catch (e) {
                        console.warn('Skip default card:', name, e);
                        skipped++;
                    }
                }
                if (added > 0) {
                    await setStoredValue('characters', characters.value);
                }
                showToast(
                    `已添加 ${added} 张默认角色卡${skipped > 0 ? `，${skipped} 张已存在/跳过` : ''}`,
                    added > 0 ? 'success' : 'info'
                );
            } finally {
                restoreDefaultCardsBusy.value = false;
            }
        };
```

（app.js 为 Vue 3 Options API，`ref`/`computed` 已可用——全文件已有 45 处 `computed(`、大量 `ref(` 使用，无需新增导入。）

- [ ] **Step 2: 加入 setup() 返回对象**

在返回对象（`handleAvatarUpload, importCharacter, exportCharacter,` 所在行，约 10173 行）中追加：

```js
            restoreDefaultCards,
            restoreDefaultCardsBusy,
            defaultCardCount,
```

- [ ] **Step 3: 语法检查**

Run: `node --check assets/js/app.js`
Expected: 无输出，退出码 0

- [ ] **Step 4: 提交**

```bash
git add assets/js/app.js
git commit -m "feat: 恢复默认角色卡（追加去重）逻辑"
```

---

### Task 5: 设置页"默认角色卡"分区

**Files:**
- Modify: `index.html:2302-2303`（`<!-- Advanced Settings -->` 注释之前插入）

**Interfaces:**
- Consumes: `restoreDefaultCards`、`restoreDefaultCardsBusy`、`defaultCardCount`（Task 4 返回值）

- [ ] **Step 1: 插入分区 HTML**

在 `<!-- Advanced Settings -->`（2303 行）之前插入：

```html
                    <!-- Default Character Cards -->
                    <div class="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                        <div class="h-16 bg-gradient-to-r from-teal-500 to-cyan-600 relative overflow-hidden flex items-center px-6">
                            <div class="absolute inset-0 opacity-10">
                                <svg class="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path d="M0 0 L100 0 L100 100 L0 100 Z" fill="transparent" />
                                    <path d="M0 50 Q 50 100 100 50" stroke="white" stroke-width="2" fill="none" />
                                </svg>
                            </div>
                            <div class="text-white font-semibold flex items-center text-lg relative z-10">
                                <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h10" />
                                </svg>
                                默认角色卡
                            </div>
                        </div>
                        <div class="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                            <div class="text-sm text-gray-600 leading-relaxed">
                                <p>应用内置 {{ defaultCardCount }} 张默认角色卡，首次启动时自动加入角色列表。</p>
                                <p class="text-xs text-gray-400 mt-1">删除后可随时从这里重新导入，不会影响你已有的角色。</p>
                            </div>
                            <button @click="restoreDefaultCards" :disabled="restoreDefaultCardsBusy"
                                class="flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm whitespace-nowrap">
                                <svg v-if="restoreDefaultCardsBusy" class="w-4 h-4 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>{{ restoreDefaultCardsBusy ? '导入中...' : '恢复默认角色卡' }}</span>
                            </button>
                        </div>
                    </div>
```

- [ ] **Step 2: 浏览器验证**

打开设置页 → "默认角色卡"分区显示在"高级设置"上方 → 显示正确张数 → 点击按钮：加载态出现 → toast"已添加 N 张默认角色卡"（首次）/ "N 张已存在/跳过"（重复点击）→ 侧边栏角色列表相应变化。

- [ ] **Step 3: 提交**

```bash
git add index.html
git commit -m "feat: 设置页新增默认角色卡分区"
```

---

### Task 6: 脚本加载顺序 + AGENTS.md

**Files:**
- Modify: `index.html:5106-5110`（document.write 缓存击穿加载块）
- Modify: `AGENTS.md`（JS 加载顺序清单）

- [ ] **Step 1: 插入 default-cards.js 加载**

在 `ui-select.js` 与 `app.js` 两行之间插入（当前 5109-5110 行之间）：

```js
        document.write('<script src="assets/js/default-cards.js?v=' + new Date().getTime() + '"><\/script>');
```

- [ ] **Step 2: 更新 AGENTS.md 加载顺序清单**

在 `assets/js/ui-select.js — IIFE, exposes window.RPHubCustomSelect` 与 `assets/js/app.js` 之间插入一行，并把后续条目序号顺延（app.js 变为 5）：

```
4. `assets/js/default-cards.js` — 生成产物，暴露 `window.RPHubDefaultCards`（默认角色卡，由 `build_default_cards.py` 生成）
```

- [ ] **Step 3: 验证**

浏览器打开页面 → Console 无 `default-cards.js` 404 → `window.RPHubDefaultCards` 可访问。

- [ ] **Step 4: 提交**

```bash
git add index.html AGENTS.md
git commit -m "feat: 加载 default-cards.js 并更新 AGENTS.md 加载顺序"
```

---

### Task 7: 桌面包跳过 cards/ 目录

**Files:**
- Modify: `desktop/copy-web.js:11-25`（SKIP_NAMES）
- Modify: `desktop/copy-web.test.js`（新增跳过断言）

**Interfaces:**
- Consumes: 无
- Produces: `desktop/dist-stage/` 不含 `cards/`（原始 PNG 不进桌面包）

- [ ] **Step 1: 写失败测试**

在 `copy-web.test.js` 的 `makeFakeSource()` 中加入：

```js
  fs.mkdirSync(path.join(tmp, 'cards', 'default'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'cards', 'default', 'test.png'), 'fake-png');
```

并在第二个测试（`skips proxy-worker.js...`）中追加断言：

```js
  assert.ok(!fs.existsSync(path.join(dst, 'cards')), 'cards should NOT be copied');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd desktop && npm test`
Expected: 第二个测试 FAIL（`cards should NOT be copied`）

- [ ] **Step 3: 实现**

在 `desktop/copy-web.js` 的 `SKIP_NAMES` 中加入 `'cards',`。

- [ ] **Step 4: 运行测试确认通过**

Run: `cd desktop && npm test`
Expected: 全部 PASS

- [ ] **Step 5: 提交**

```bash
git add desktop/copy-web.js desktop/copy-web.test.js
git commit -m "feat(desktop): 打包跳过 cards/ 目录"
```

---

## 最终验收（跨 Task 手动清单）

1. `python3 build_default_cards.py` 重跑：产物随卡变化，`node --check` 通过的 app.js 中 Console 输出 `Seeded N default character cards`
2. 浏览器（file:// 直接打开）：
   - 全新环境（清空 IndexedDB + localStorage）→ 默认卡出现、头像正常、可直接开聊
   - 已有用户卡的存量环境 → 不出现默认卡（未播种），点"恢复默认"→ 追加去重、toast 正确、重复点击不重复追加
   - 删除全部角色 → 重启不自动复活，恢复按钮可重新导入
3. Electron 桌面：`cd desktop && npm run start` 复验上述 2 项
4. 桌面打包：`cd desktop && npm run stage` → `dist-stage/` 无 `cards/`、有 `assets/js/default-cards.js`；`npm test` 全绿
5. 用户放置真实卡到 `cards/default/` 后重跑脚本再验证一次真实卡播种
