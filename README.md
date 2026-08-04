# 🦊 狐の工作台 — Fox Dashboard

> **Obsidian 个性化首页/工作台插件** — 把 Obsidian 变成你的第二大脑控制中心。

![day](https://img.shields.io/badge/theme-forest%20explorer-%23789B58)
![night](https://img.shields.io/badge/theme-lone%20wolf-%239AB7FF)
![version](https://img.shields.io/badge/version-0.5.1-blue)

---

## ✨ 功能

| 模块 | 说明 |
|------|------|
| **⏰ 时钟与座右铭** | 实时时间显示 + 每日随机座右铭 |
| **🗒️ 今日任务** | 快速添加待办，自动读取当日日记中的任务清单 |
| **📥 快速记录** | 随手记，支持多行文本，自动录入日记 |
| **😊 心情打卡** | 今日心情选择 + 强度 + 备注，写入日记 frontmatter |
| **✅ 健康习惯** | 习惯追踪，写入日记 frontmatter |
| **⏳ 倒计时** | 自定义倒计时事件，紧急度颜色标识 |
| **📈 学习进度** | 可视化进度条（GRE / Python / 财务建模等） |
| **💰 财富森林** | 当月收支总览 + 账户余额 + 最近流水，点击 👁 隐藏金额 |
| **📚 知识森林** | 快速创建知识卡片，支持 7 种模板，文件存入 `20-Knowledge/` |
| **🔥 热力图** | 日记书写频率可视化 |
| **⚡ 快捷导航** | 一键跳转学习区、日志、工作管理、目标规划等 |

---

## 🎨 双主题

### ☀️ 白天 — Forest Explorer
森林绿 + 暖金色，温暖自然的文字质感。

### 🌙 黑夜 — Lone Wolf Observatory（默认）
深蓝 + 淡紫 + 毛玻璃卡片，沉浸式天文台氛围。

---

## 📦 安装

### 从源码安装

```bash
# 克隆到 Obsidian 插件目录
cd /path/to/your/vault/.obsidian/plugins/
git clone https://github.com/chenxilu935-art/fox-dashboard.git fox-dashboard

# 安装依赖并构建
cd fox-dashboard
npm install
npm run build
```

### 手动安装

1. 下载 [Releases](https://github.com/chenxilu935-art/fox-dashboard/releases) 中的 `main.js`、`manifest.json`、`styles.css`
2. 放入 `.obsidian/plugins/fox-dashboard/`
3. 重启 Obsidian，在设置 → 第三方插件中启用

### 开发构建

```bash
# 热编译（带 sourcemap）
npm run dev

# 或直接使用 esbuild
npx esbuild main.ts --bundle --outfile=main.js --external:obsidian --external:electron --format=cjs --platform=node
```

> 修改 `styles.css` 无需编译，Obsidian 自动热加载。
> 修改 `view.ts` 或 `main.ts` 需要重新编译 `main.js` + 重载插件 (`Ctrl+R`)。

---

## 📁 项目结构

```
fox-dashboard/
├── manifest.json          # Obsidian 插件清单
├── main.ts                # 插件入口（注册视图、设置、命令）
├── view.ts                # 核心 — 全部渲染 + 数据逻辑
├── styles.css             # 全部样式，双主题 CSS 变量
├── esbuild.config.mjs     # 构建配置
├── tsconfig.json          # TypeScript 配置
├── package.json           # 依赖与脚本
└── 项目文档 → `99-Project/FoxDashboard/`（docs/ + devlog/ + claudian-memory.md，2026-07-25 起迁移）
```

---

## ⚙️ 设置

在 Obsidian 设置 → 狐の工作台：

- **座右铭列表** — 每行一句，每日随机轮换
- **学习进度项** — 格式 `名称|当前值|最大值`
- **第二森林入口** — 自定义快捷导航链接

---

## 🧩 数据流

```
Fox Capture（手机端 / 未开发）
      ↓
Fox Finance（记账插件）
      ↓
fox-dashboard（工作台读取展示）
```

任务、心情、习惯数据写入 `10-Daily/YYYY-MM-DD.md`（YAML frontmatter + 列表）。
财务数据读取 `Finance/Ledger/YYYY-MM.md`（Markdown 表格）。

---

## 📄 许可证

MIT © 小狐
