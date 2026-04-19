"""
Vocab Daily - 配置文件
支持任何 OpenAI 兼容 API（豆包、DeepSeek、Moonshot、本地 Ollama 等）
"""
import os

# ─── API 配置 ───────────────────────────────────────────────
# 通过环境变量或 .env 设置，支持任何 OpenAI 兼容端点
API_BASE_URL = os.getenv("API_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")  # 默认豆包
API_KEY = os.getenv("API_KEY", "")
MODEL_NAME = os.getenv("MODEL_NAME", "doubao-pro-256k")  # 按需改模型名

# 备用模型（用于校验阶段，可以用更便宜的模型）
REVIEW_MODEL = os.getenv("REVIEW_MODEL", MODEL_NAME)

# ─── 路径配置 ────────────────────────────────────────────────
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(PROJECT_ROOT, "public", "data")
DAYS_DIR = os.path.join(DATA_DIR, "days")
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")
INDEX_FILE = os.path.join(DATA_DIR, "index.json")

# ─── 生成配置 ────────────────────────────────────────────────
MAX_CANDIDATES = 5          # 选题候选数
MAX_HISTORY_IN_PROMPT = 200 # prompt 里最多塞多少已用词（防 token 爆）
SEARCH_VERIFY_COUNT = 3     # 搜索验证时查几条结果

# ─── 主题色池（自动轮换）─────────────────────────────────────
THEME_COLORS = [
    "#E85D75", "#7C5CFC", "#FF8C42", "#36B37E",
    "#00B8D9", "#FF6B6B", "#6554C0", "#E06C9F",
    "#2EC4B6", "#FF9F1C", "#5C6BC0", "#EF5350",
]

# ─── Prompt 模板 ─────────────────────────────────────────────

PROMPT_TOPIC_SELECTION = """你是一个英语口语选题编辑，专门为中国年轻人挑选实用的日常英语口语表达。

今天是 {date}。

以下是已经用过的词汇/表达（不能重复）：
{used_list}

以下是近期热点参考信息：
{search_context}

请推荐 {count} 个候选英语口语词汇或短语，要求：
1. 必须是英语母语者日常高频使用的口语表达，不是书面语或 GRE 词汇
2. 不能与已用列表重复（包括近义词也尽量避免）
3. 优先选择：社交媒体热门表达 > 影视剧常见口语 > 生活场景实用词
4. 贴近年轻人生活（社交、购物、工作、情感、网络文化）

请严格以如下 JSON 格式输出，不要输出任何其他内容：
```json
[
  {{
    "word": "英文词汇或短语",
    "theme": "对应的中文主题（2-4个字）",
    "reason": "选题理由，说明为什么现在值得学",
    "source": "热度来源（如 TikTok / 影视剧 / 日常口语等）"
  }}
]
```"""

PROMPT_CARD_GENERATION = """你是一个专业的英语口语教学内容创作者。请为以下词汇生成完整的学习卡片数据。

目标词汇：{word}
中文主题：{theme}
Day 编号：{day_number}

参考释义和用法（来自搜索结果）：
{search_context}

请生成学习卡片，要求：
1. 中文对话：6句日常生活场景对话（A/B两人），自然口语化，场景贴近生活
2. 英文翻译：对应翻译，必须地道自然，禁止中式英语
3. 释义：给出该词的核心含义（可以多义项），中英对照
4. 例句：3个实用例句，中英对照
5. 近义词 2 个、反义词 2 个、常见搭配 3 个

对话中要自然嵌入目标词汇的使用场景，但中文对话里不要直接出现英文。
英文对话中目标词汇要加粗体现。

请严格以如下 JSON 格式输出，不要输出任何其他内容：
```json
{{
  "word": "{word}",
  "phonetic": "/音标/",
  "pos": "词性",
  "theme": "{theme}",
  "dialogue": {{
    "zh": [
      {{"speaker": "A", "text": "中文台词", "highlight": "要高亮的关键词"}},
      {{"speaker": "B", "text": "中文台词", "highlight": "要高亮的关键词"}}
    ],
    "en": [
      {{"speaker": "A", "text": "English line", "highlight": "keyword to highlight"}},
      {{"speaker": "B", "text": "English line", "highlight": "keyword to highlight"}}
    ]
  }},
  "definitions": [
    {{"en": "English definition", "zh": "中文释义"}}
  ],
  "examples": [
    {{"en": "English example sentence", "zh": "中文翻译"}}
  ],
  "synonyms": [
    {{"word": "synonym", "zh": "中文"}}
  ],
  "antonyms": [
    {{"word": "antonym", "zh": "中文"}}
  ],
  "collocations": [
    {{"phrase": "common collocation", "zh": "中文释义"}}
  ]
}}
```"""

PROMPT_REVIEW = """你是一个严格的英语口语教学内容审校编辑。请审查以下学习卡片数据的质量。

卡片数据：
{card_json}

搜索验证结果（该词在真实英语语境中的用法）：
{search_context}

请检查：
1. 英文对话是否自然地道（不能是中式英语直译）
2. 音标是否正确
3. 释义是否准确完整
4. 例句用法是否符合英语母语者的实际使用习惯
5. 近义词、反义词、搭配是否恰当

如果发现问题，请修正后输出完整的 JSON（格式与输入一致）。
如果没有问题，原样输出 JSON。

请只输出 JSON，不要输出任何其他内容。"""
