# 📚 Vocab Daily - 每日口语卡片

每天自动生成一张地道英语口语学习卡片，通过 GitHub Actions 自动部署到 GitHub Pages。

## 工作原理

```
每日定时触发
    ↓
搜索当前英语热门表达（DuckDuckGo）
    ↓
AI 选题（去重 + 紧跟潮流）
    ↓
搜索词典验证用法
    ↓
AI 生成卡片数据（对话 + 释义 + 例句 + 扩展）
    ↓
搜索验证例句地道性
    ↓
AI 质量审查 & 修正
    ↓
写入 JSON → Git Push → GitHub Pages 自动部署
```

## 快速开始

### 1. Clone & 安装

```bash
git clone https://github.com/你的用户名/vocab-daily.git
cd vocab-daily
pip install -r requirements.txt
npm install
```

### 2. 配置 API

```bash
cp .env.example .env
# 编辑 .env，填入你的 API Key
```

支持任何 OpenAI 兼容 API：豆包、DeepSeek、Moonshot、Ollama 本地等。

### 3. 本地生成一张试试

```bash
# 加载环境变量
export $(cat .env | xargs)
python scripts/generate.py
```

### 4. 本地预览前端

```bash
npm run dev
```

### 5. 部署到 GitHub Pages

1. 推送到 GitHub
2. 在 repo Settings → Secrets 中添加：
   - `API_BASE_URL`
   - `API_KEY`
   - `MODEL_NAME`
   - `REVIEW_MODEL`（可选）
3. 在 Settings → Pages 中选择 `gh-pages` 分支
4. GitHub Actions 会每天自动生成并部署

> **注意**：`vite.config.js` 中的 `base` 需要改为你的 repo 名称。

## 项目结构

```
vocab-daily/
├── .github/workflows/
│   └── daily-generate.yml    # 定时任务
├── scripts/
│   ├── config.py             # 配置（API、Prompt、路径）
│   ├── search.py             # DuckDuckGo 搜索验证
│   └── generate.py           # 主生成脚本
├── public/data/
│   ├── history.json          # 已用词汇索引（去重用）
│   ├── index.json            # 前端数据索引
│   └── days/                 # 每日卡片 JSON
├── src/
│   ├── main.jsx
│   └── App.jsx               # 卡片 UI
├── index.html
├── vite.config.js
└── requirements.txt
```

## 自定义

- **换 API**：改 `.env` 或 GitHub Secrets 中的 `API_BASE_URL` / `MODEL_NAME`
- **换主题色**：改 `config.py` 中的 `THEME_COLORS`
- **调 Prompt**：改 `config.py` 中的三个 `PROMPT_*` 模板
- **调生成时间**：改 workflow 中的 `cron` 表达式
- **调前端样式**：改 `src/App.jsx` 中的 `AppStyles`
