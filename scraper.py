#!/usr/bin/env python3
"""
角色卡爬虫 - 从 rphforum.zeabur.app 获取所有已审核角色卡
支持：列表缓存、多线程下载、断点续传
"""

import requests
import time
import os
import json
from typing import List, Dict, Any, Set
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

CONFIG = {
    "base_url": "https://rphforum.zeabur.app",
    "output_dir": "cards",
    "max_workers": 10,
    "max_retries": 3,
    "retry_delay": 2,
    "timeout": 60,
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
}

# 线程安全的计数器
lock = threading.Lock()
success_count = 0
fail_count = 0

def get_all_cards() -> List[Dict[str, Any]]:
    """从API获取所有已审核角色卡"""
    url = f"{CONFIG['base_url']}/api/cards?sort=latest&zone=reviewed"
    headers = {"User-Agent": CONFIG["user_agent"]}
    try:
        response = requests.get(url, timeout=CONFIG["timeout"], headers=headers)
        response.raise_for_status()
        data = response.json()
        if isinstance(data, list):
            return data
        elif isinstance(data, dict) and "items" in data:
            return data["items"]
        else:
            print(f"未知的响应格式: {type(data)}")
            return []
    except requests.exceptions.Timeout:
        print("请求超时，请检查网络连接")
        return []
    except requests.exceptions.RequestException as e:
        print(f"请求失败: {e}")
        return []
    except json.JSONDecodeError:
        print("JSON解析失败")
        return []

def load_or_fetch_cards() -> List[Dict[str, Any]]:
    """加载或获取角色卡列表（带缓存）"""
    os.makedirs(CONFIG["output_dir"], exist_ok=True)
    cache_file = os.path.join(CONFIG["output_dir"], "allcards.json")
    
    if os.path.exists(cache_file):
        print("发现本地缓存，正在加载...")
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                cards = json.load(f)
            print(f"从缓存加载了 {len(cards)} 个角色卡")
            return cards
        except (json.JSONDecodeError, IOError) as e:
            print(f"缓存文件损坏，重新获取: {e}")
    
    print("正在从API获取角色卡列表...")
    cards = get_all_cards()
    if cards:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(cards, f, ensure_ascii=False, indent=2)
        print(f"已缓存 {len(cards)} 个角色卡到 {cache_file}")
    return cards

def get_existing_cards() -> Set[str]:
    """获取已下载的卡片ID集合"""
    existing = set()
    if os.path.exists(CONFIG["output_dir"]):
        for f in os.listdir(CONFIG["output_dir"]):
            if f.endswith(".png"):
                card_id = f[:-4]  # 移除 .png 后缀
                existing.add(card_id)
    return existing

def download_card(card_id: str) -> bool:
    """下载单个角色卡"""
    url = f"{CONFIG['base_url']}/api/cards/{card_id}/download/file"
    headers = {"User-Agent": CONFIG["user_agent"]}
    for attempt in range(CONFIG["max_retries"]):
        try:
            response = requests.get(url, timeout=CONFIG["timeout"], headers=headers)
            response.raise_for_status()
            filepath = os.path.join(CONFIG["output_dir"], f"{card_id}.png")
            with open(filepath, "wb") as f:
                f.write(response.content)
            return True
        except requests.exceptions.Timeout:
            if attempt < CONFIG["max_retries"] - 1:
                time.sleep(CONFIG["retry_delay"])
        except requests.exceptions.RequestException:
            if attempt < CONFIG["max_retries"] - 1:
                time.sleep(CONFIG["retry_delay"])
        except IOError:
            return False
    return False

def download_worker(card: Dict[str, Any], index: int, total: int) -> bool:
    """下载工作线程"""
    global success_count, fail_count
    card_id = card.get("id", "")
    card_name = card.get("name", "unknown")
    
    success = download_card(card_id)
    
    with lock:
        if success:
            success_count += 1
            status = "成功"
        else:
            fail_count += 1
            status = "失败"
        current = success_count + fail_count
        print(f"[{current}/{total}] {status}: {card_name}")
    
    return success

def main():
    global success_count, fail_count
    
    print("=" * 60)
    print("角色卡爬虫启动")
    print(f"目标网站: {CONFIG['base_url']}")
    print(f"输出目录: {CONFIG['output_dir']}")
    print(f"并发线程: {CONFIG['max_workers']}")
    print("=" * 60)
    
    # 加载或获取角色卡列表
    cards = load_or_fetch_cards()
    if not cards:
        print("未找到角色卡或获取失败")
        return
    
    total = len(cards)
    print(f"总计 {total} 个角色卡")
    
    # 获取已下载的卡片
    existing = get_existing_cards()
    if existing:
        print(f"已下载 {len(existing)} 个角色卡")
    
    # 过滤出未下载的卡片
    pending = [card for card in cards if card.get("id", "") not in existing]
    
    if not pending:
        print("所有角色卡已下载完成！")
        return
    
    print(f"待下载 {len(pending)} 个角色卡")
    print("-" * 60)
    
    # 重置计数器
    success_count = 0
    fail_count = 0
    
    # 多线程下载
    with ThreadPoolExecutor(max_workers=CONFIG["max_workers"]) as executor:
        futures = []
        for i, card in enumerate(pending):
            future = executor.submit(download_worker, card, i + 1, len(pending))
            futures.append(future)
        
        # 等待所有任务完成
        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                print(f"线程异常: {e}")
    
    print("-" * 60)
    print(f"下载完成: 成功 {success_count} 个, 失败 {fail_count} 个")
    print(f"文件保存在: {os.path.abspath(CONFIG['output_dir'])}")

if __name__ == "__main__":
    main()
