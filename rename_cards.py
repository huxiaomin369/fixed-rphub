#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
角色卡重命名脚本
将 cards/ 目录下以 id 命名的角色卡 (.png) 复制到 nameCards/ 目录，
并按照 cards/allcards.json 中的 name 字段重命名。
原 id 命名的文件保留不动。

规则：
- 文件名中的 Windows 非法字符 (< > : " / \\ | ? * 及控制字符) 替换为 _
- 去除文件名末尾的空格和点，保留前 120 个字符
- 重名（不同卡片同名）时，后者追加 _<id前8位> 后缀，保证唯一
- 支持 --dry-run 预览；重复运行会跳过已存在的目标文件
"""

import json
import os
import re
import shutil
import sys

CONFIG = {
    "json_file": os.path.join("cards", "allcards.json"),
    "src_dir": "cards",
    "dst_dir": "nameCards",
    "max_name_len": 120,
}

# Windows 文件名非法字符（含控制字符）
INVALID_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
# Windows 保留设备名
RESERVED_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
}


# Windows 控制台默认 GBK，无法输出部分字符，统一用 UTF-8 并容错
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except AttributeError:
    pass


def sanitize_filename(name: str) -> str:
    """清洗 name 为合法的 Windows 文件名（不含扩展名）"""
    name = INVALID_CHARS.sub("_", name)
    # 去除尾部空格和点（Windows 不允许）
    name = name.rstrip(" .")
    # 限制长度
    if len(name) > CONFIG["max_name_len"]:
        name = name[:CONFIG["max_name_len"]].rstrip(" .")
    # 保留设备名
    base = name.split(".", 1)[0].upper()
    if base in RESERVED_NAMES:
        name = "_" + name
    return name


def main():
    dry_run = "--dry-run" in sys.argv

    if not os.path.exists(CONFIG["json_file"]):
        print(f"找不到 {CONFIG['json_file']}")
        return 1

    with open(CONFIG["json_file"], "r", encoding="utf-8") as f:
        cards = json.load(f)

    id_to_name = {}
    for card in cards:
        cid = card.get("id", "")
        if cid:
            id_to_name[cid] = card.get("name", "").strip()

    png_files = sorted(
        f for f in os.listdir(CONFIG["src_dir"]) if f.endswith(".png")
    )

    os.makedirs(CONFIG["dst_dir"], exist_ok=True)

    copied = 0
    skipped = 0
    errors = 0
    used_names = set()  # 目标目录中已占用的名字（不含扩展名，小写比较，Windows 不区分大小写）
    used_names.update(
        f[:-4].lower() for f in os.listdir(CONFIG["dst_dir"]) if f.endswith(".png")
    )

    for filename in png_files:
        card_id = filename[:-4]
        name = id_to_name.get(card_id, "")

        if not name:
            # JSON 中无对应记录，回退为 id 命名
            safe_name = card_id
            print(f"[跳过] {filename}: JSON 中无对应记录，保留 id 命名")
        else:
            safe_name = sanitize_filename(name)
            if not safe_name:
                safe_name = card_id

        # 重名冲突处理：追加 id 前 8 位（大小写不敏感，Windows 文件名不区分大小写）
        target_name = safe_name
        if target_name.lower() in used_names:
            target_name = f"{safe_name}_{card_id[:8]}"
        used_names.add(target_name.lower())

        src_path = os.path.join(CONFIG["src_dir"], filename)
        dst_path = os.path.join(CONFIG["dst_dir"], f"{target_name}.png")

        if os.path.exists(dst_path):
            print(f"[已存在] {target_name}.png")
            skipped += 1
            continue

        if dry_run:
            print(f"[预览] {filename} -> {target_name}.png")
            copied += 1
            continue

        try:
            shutil.copy2(src_path, dst_path)
            copied += 1
        except OSError as e:
            print(f"[失败] {filename}: {e}")
            errors += 1

    print("-" * 60)
    mode = "预览" if dry_run else "完成"
    print(f"{mode}: 成功 {copied} 个, 跳过 {skipped} 个, 失败 {errors} 个")
    print(f"文件保存在: {os.path.abspath(CONFIG['dst_dir'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
