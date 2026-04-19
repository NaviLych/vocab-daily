"""
搜索验证模块
使用 DuckDuckGo 免费搜索，用于：
1. 选题阶段：获取当前英语热门表达/热梗
2. 生成阶段：查词典确认用法
3. 校验阶段：验证例句是否地道
"""
import json
import time
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def search_web(query: str, max_results: int = 5) -> list[dict]:
    """
    DuckDuckGo 搜索，返回 [{title, href, body}, ...]
    依赖: pip install duckduckgo-search
    """
    try:
        from duckduckgo_search import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
            return results
    except ImportError:
        logger.warning("duckduckgo-search not installed, trying fallback...")
        return _fallback_search(query, max_results)
    except Exception as e:
        logger.warning(f"DuckDuckGo search failed: {e}")
        return []


def _fallback_search(query: str, max_results: int = 5) -> list[dict]:
    """
    备用搜索：直接用 requests 请求 DuckDuckGo HTML 版
    简单粗暴但能用
    """
    try:
        import requests
        from urllib.parse import quote_plus
        url = f"https://html.duckduckgo.com/html/?q={quote_plus(query)}"
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(url, headers=headers, timeout=10)
        # 简单提取结果片段
        snippets = []
        for block in resp.text.split("result__snippet")[1:max_results + 1]:
            text = block.split(">", 1)[-1].split("<", 1)[0].strip()
            if text:
                snippets.append({"title": "", "href": "", "body": text})
        return snippets
    except Exception as e:
        logger.warning(f"Fallback search also failed: {e}")
        return []


def search_trending_slang() -> str:
    """搜索当前流行的英语口语/俚语，用于选题参考"""
    queries = [
        "trending English slang 2026",
        "popular TikTok phrases English",
        "new English expressions young people",
        "viral English words social media",
    ]
    all_results = []
    for q in queries:
        results = search_web(q, max_results=3)
        all_results.extend(results)
        time.sleep(0.5)  # 礼貌延迟

    if not all_results:
        return "（搜索未返回结果，请基于你的知识推荐）"

    context_parts = []
    for r in all_results[:10]:
        title = r.get("title", "")
        body = r.get("body", "")
        if body:
            context_parts.append(f"- {title}: {body}" if title else f"- {body}")

    return "\n".join(context_parts)


def search_word_usage(word: str) -> str:
    """搜索某个词的释义和真实用法，用于生成和校验"""
    queries = [
        f"{word} meaning Cambridge Dictionary",
        f"{word} Urban Dictionary definition",
        f'"{word}" example sentences English',
    ]
    all_results = []
    for q in queries:
        results = search_web(q, max_results=3)
        all_results.extend(results)
        time.sleep(0.5)

    if not all_results:
        return "（搜索未返回结果，请基于你的知识生成）"

    context_parts = []
    for r in all_results[:8]:
        title = r.get("title", "")
        body = r.get("body", "")
        if body:
            context_parts.append(f"- {title}: {body}" if title else f"- {body}")

    return "\n".join(context_parts)


def verify_expression(expression: str, example_sentences: list[str]) -> str:
    """验证表达和例句是否在真实英语语境中被使用"""
    results_text = []

    # 搜索表达本身
    res = search_web(f'"{expression}" usage examples', max_results=3)
    if res:
        results_text.append(f"### 表达 '{expression}' 的搜索结果：")
        for r in res:
            body = r.get("body", "")
            if body:
                results_text.append(f"  - {body}")

    # 抽检例句（最多验证2句，节省时间）
    for sent in example_sentences[:2]:
        # 提取关键短语搜索
        key_phrase = expression
        res = search_web(f'"{key_phrase}" in a sentence', max_results=2)
        if res:
            results_text.append(f"### 例句关键词验证：")
            for r in res:
                body = r.get("body", "")
                if body:
                    results_text.append(f"  - {body}")
        time.sleep(0.5)

    return "\n".join(results_text) if results_text else "（验证搜索未返回足够结果）"
