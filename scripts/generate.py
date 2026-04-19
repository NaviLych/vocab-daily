#!/usr/bin/env python3
"""
Vocab Daily - 每日口语卡片自动生成脚本

流程：搜索热点 → AI选题 → 搜索验证用法 → AI生成卡片 → 搜索校验 → AI审查 → 写入数据
API：任何 OpenAI 兼容接口（豆包/DeepSeek/Moonshot/Ollama/...）
"""
import json
import os
import sys
import re
import logging
from datetime import datetime
from pathlib import Path

from openai import OpenAI

from config import (
    API_BASE_URL, API_KEY, MODEL_NAME, REVIEW_MODEL,
    DATA_DIR, DAYS_DIR, HISTORY_FILE, INDEX_FILE,
    MAX_CANDIDATES, MAX_HISTORY_IN_PROMPT, THEME_COLORS,
    PROMPT_TOPIC_SELECTION, PROMPT_CARD_GENERATION, PROMPT_REVIEW,
)
from search import search_trending_slang, search_word_usage, verify_expression

# ─── 日志 ────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ─── 初始化 API 客户端 ───────────────────────────────────────
client = OpenAI(
    api_key=API_KEY,
    base_url=API_BASE_URL,
)


def chat(prompt: str, model: str = MODEL_NAME, temperature: float = 0.8) -> str:
    """统一的 API 调用封装"""
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=4096,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        logger.error(f"API call failed: {e}")
        raise


def extract_json(text: str):
    """从 LLM 回复中提取 JSON（兼容 markdown 代码块）"""
    # 尝试提取 ```json ... ``` 块
    match = re.search(r"```(?:json)?\s*\n?(.*?)\n?\s*```", text, re.DOTALL)
    if match:
        text = match.group(1)

    # 尝试提取最外层 JSON
    text = text.strip()
    if not (text.startswith("{") or text.startswith("[")):
        # 找第一个 { 或 [
        for i, ch in enumerate(text):
            if ch in "{[":
                text = text[i:]
                break

    return json.loads(text)


def load_history() -> dict:
    """加载历史记录"""
    if os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"words": [], "themes": [], "totalDays": 0, "lastUpdated": ""}


def save_history(history: dict):
    """保存历史记录"""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def update_index(day_number: int, word: str, theme: str, date: str):
    """更新前端用的索引文件"""
    if os.path.exists(INDEX_FILE):
        with open(INDEX_FILE, "r", encoding="utf-8") as f:
            index = json.load(f)
    else:
        index = {"days": [], "lastUpdated": ""}

    index["days"].append({
        "day": day_number,
        "word": word,
        "theme": theme,
        "date": date,
        "file": f"days/day{day_number:03d}.json",
    })
    index["lastUpdated"] = date

    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index, f, ensure_ascii=False, indent=2)


# ═══════════════════════════════════════════════════════════════
# 阶段一：选题
# ═══════════════════════════════════════════════════════════════
def stage_topic_selection(history: dict, today: str) -> dict:
    logger.info("━━━ 阶段一：选题 ━━━")

    # 1. 搜索当前热门表达
    logger.info("搜索当前英语流行表达...")
    search_context = search_trending_slang()
    logger.info(f"获取到 {len(search_context.splitlines())} 条参考信息")

    # 2. 准备已用词列表（截断防 token 爆）
    used_words = history.get("words", [])
    if len(used_words) > MAX_HISTORY_IN_PROMPT:
        used_list = ", ".join(used_words[-MAX_HISTORY_IN_PROMPT:])
        used_list = f"（仅展示最近 {MAX_HISTORY_IN_PROMPT} 个）\n" + used_list
    else:
        used_list = ", ".join(used_words) if used_words else "（暂无，这是第一期）"

    # 3. 调 API 选题
    prompt = PROMPT_TOPIC_SELECTION.format(
        date=today,
        used_list=used_list,
        search_context=search_context,
        count=MAX_CANDIDATES,
    )
    logger.info("请求 AI 推荐候选词汇...")
    response = chat(prompt, temperature=0.9)

    candidates = extract_json(response)
    if not candidates:
        raise ValueError("AI 未返回有效候选词")

    # 4. 过滤已用词（双重保险）
    filtered = [c for c in candidates if c["word"].lower() not in
                [w.lower() for w in used_words]]
    if not filtered:
        logger.warning("所有候选词都已使用过，使用第一个候选")
        filtered = candidates

    selected = filtered[0]
    logger.info(f"✓ 选中：{selected['word']}（{selected['theme']}）- {selected['reason']}")
    return selected


# ═══════════════════════════════════════════════════════════════
# 阶段二：生成卡片数据
# ═══════════════════════════════════════════════════════════════
def stage_card_generation(topic: dict, day_number: int) -> dict:
    logger.info("━━━ 阶段二：生成卡片 ━━━")

    # 1. 搜索该词的权威释义和用法
    logger.info(f"搜索 '{topic['word']}' 的释义和用法...")
    search_context = search_word_usage(topic["word"])
    logger.info(f"获取到 {len(search_context.splitlines())} 条参考")

    # 2. 调 API 生成
    prompt = PROMPT_CARD_GENERATION.format(
        word=topic["word"],
        theme=topic["theme"],
        day_number=day_number,
        search_context=search_context,
    )
    logger.info("请求 AI 生成卡片数据...")
    response = chat(prompt, temperature=0.7)

    card = extract_json(response)

    # 3. 补充元数据
    color_index = (day_number - 1) % len(THEME_COLORS)
    card["day"] = day_number
    card["themeColor"] = THEME_COLORS[color_index]
    card["generatedAt"] = datetime.now().isoformat()

    logger.info(f"✓ 卡片生成完成：{card.get('word', '?')} / {card.get('theme', '?')}")
    return card


# ═══════════════════════════════════════════════════════════════
# 阶段三：质量校验
# ═══════════════════════════════════════════════════════════════
def stage_review(card: dict) -> dict:
    logger.info("━━━ 阶段三：质量校验 ━━━")

    word = card.get("word", "")

    # 1. 搜索验证表达的真实用法
    logger.info(f"搜索验证 '{word}' 的真实用法...")
    example_sentences = [ex.get("en", "") for ex in card.get("examples", [])]
    search_context = verify_expression(word, example_sentences)

    # 2. 调 API 审查
    card_json = json.dumps(card, ensure_ascii=False, indent=2)
    prompt = PROMPT_REVIEW.format(
        card_json=card_json,
        search_context=search_context,
    )
    logger.info("请求 AI 审查卡片质量...")
    response = chat(prompt, model=REVIEW_MODEL, temperature=0.3)

    reviewed_card = extract_json(response)

    # 保留元数据
    reviewed_card["day"] = card["day"]
    reviewed_card["themeColor"] = card["themeColor"]
    reviewed_card["generatedAt"] = card["generatedAt"]
    reviewed_card["reviewedAt"] = datetime.now().isoformat()

    logger.info("✓ 审查完成")
    return reviewed_card


# ═══════════════════════════════════════════════════════════════
# 主流程
# ═══════════════════════════════════════════════════════════════
def main():
    today = datetime.now().strftime("%Y-%m-%d")
    logger.info(f"═══ Vocab Daily 生成开始 | {today} ═══")

    # 检查 API Key
    if not API_KEY:
        logger.error("请设置 API_KEY 环境变量")
        sys.exit(1)

    # 确保目录存在
    os.makedirs(DAYS_DIR, exist_ok=True)

    # 加载历史
    history = load_history()
    day_number = history["totalDays"] + 1

    # 检查今天是否已生成
    if history.get("lastUpdated") == today:
        logger.info("今天已经生成过了，跳过")
        return

    try:
        # 阶段一：选题
        topic = stage_topic_selection(history, today)

        # 阶段二：生成
        card = stage_card_generation(topic, day_number)

        # 阶段三：校验
        card = stage_review(card)

        # ─── 写入数据 ────────────────────────────────────────
        # 保存当天卡片
        day_file = os.path.join(DAYS_DIR, f"day{day_number:03d}.json")
        with open(day_file, "w", encoding="utf-8") as f:
            json.dump(card, f, ensure_ascii=False, indent=2)
        logger.info(f"✓ 卡片已保存: {day_file}")

        # 更新历史
        history["words"].append(card["word"])
        history["themes"].append(card["theme"])
        history["totalDays"] = day_number
        history["lastUpdated"] = today
        save_history(history)

        # 更新索引
        update_index(day_number, card["word"], card["theme"], today)
        logger.info(f"✓ 索引已更新")

        logger.info(f"═══ 完成！Day {day_number}: {card['word']}（{card['theme']}）═══")

    except Exception as e:
        logger.error(f"生成失败: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
