# CLAUDE.md · AI 入口

本仓库给 AI 的主规则在 **`AGENTS.md`**。本文件只做最短路标，避免与 AGENTS 双份维护。

## 先读

1. `AGENTS.md` — 红线、路径约定、收尾自检
2. `PROJECT_MAP.md` — 按任务选读哪些设定
3. 任务相关：`docs/**`（编号 00–26）与 `stories/<地脉组>/`

## 布局（2026-07-17 起）

| 路径 | 用途 |
|---|---|
| `docs/{原则,世界,社会,素材,管理}/` | 现行设定（原则含 00–26） |
| `stories/` + `catalog.json` | 正文唯一源（地脉组 + 卷 + 主章线） |
| `stories/主章线/目录骨架.md` | 全书 Z 槽规划（非已成稿） |
| `stories/人物志/` | 档案体人物志（genre N；与 R 折分立） |
| `stories/河东线/中篇总纲.md` | 河东卷中篇六幕（约 30–60 万目标） |
| `web/` | 地脉浏览台（`app.js` + `js/constants.js` · `markdown.js`） |
| `stories/世界/` | 世界碎片仓（挂 `catalog.world`） |
| `archive/` | 只读历史，勿当现行 |
| `scripts/` | postcheck · integrity · reviews · scaffold · `npm run check` |

## 硬边界（摘要）

- 无修炼/法力/可验证妖鬼谱系；怪谈保留合理解释
- 正篇 1522—1644；事实 A/B/C/D/待考，见 `docs/世界/SOURCES.md`
- 引用写**自仓库根**完整路径，如 `docs/原则/宪法.md`
- 新条目：先地脉组 / 卷 / `track`，再体例；主线更新 `main_path`，连载默认同 `reading_path`
- 连载指标：`docs/原则/24_卷册与连载阅读体验.md`
- 踏线人（沈陌）主章：`docs/原则/25_踏线人主章公约.md`——成长=懂/债/名，非境/力
- 人物志：`docs/原则/26_人物志规范.md`——折写魂、志立档

细节与检查清单以 `AGENTS.md` 为准。
