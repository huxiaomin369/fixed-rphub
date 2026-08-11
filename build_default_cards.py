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
import binascii
import json
import os
import struct
import sys

# Windows 控制台默认 GBK，卡片文件名/卡名含 emoji 时 print 会崩溃；
# 统一以 UTF-8 输出，无法编码的字符用 ? 替代。
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except (AttributeError, ValueError):
        pass

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


def parse_chara_text(text):
    """解析 chara 块文本为 JSON。

    兼容两种写法（与 card-utils.js 的 parseCharacterPayload 行为一致）：
    1. 原始 JSON（v2 标准）
    2. base64 编码的 JSON（部分工具导出，如 eyJzcGVj... 开头）
    """
    text = text.strip()
    if not text:
        raise ValueError("chara 文本为空")
    try:
        # 优先按 base64 解码（validate=False 会丢弃非 base64 字符，原始 JSON 走此路径会解码成乱码并在后续解析失败）
        decoded = base64.b64decode(text, validate=False).decode("utf-8")
        return json.loads(decoded)
    except (binascii.Error, UnicodeDecodeError, json.JSONDecodeError):
        return json.loads(text)


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
                raw = parse_chara_text(chara_text)
                avatar_b64, mime = compress_avatar(png_bytes)
                cards.append({**raw, "avatar": f"data:{mime};base64,{base64.b64encode(avatar_b64).decode('ascii')}"})
                card_name = raw.get("name") or raw.get("data", {}).get("name") or "(未命名)"
                print(f"[ok]   {fname} -> {card_name}")
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
