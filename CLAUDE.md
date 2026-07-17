# CLAUDE.md · AI 入口

本仓库给 AI 的主规则在 **`AGENTS.md`**。本文件只做最短路标，避免与 AGENTS 双份维护。

## 先读

1. `AGENTS.md` — 红线、路径约定、收尾自检
2. `PROJECT_MAP.md` — 按任务选读哪些设定
3. 任务相关：`docs/**`（编号 00–23）与 `stories/<地脉组>/`

## 布局（2026-07-17 起）

| 路径 | 用途 |
|---|---|
| `docs/{原则,世界,社会,素材,管理}/` | 现行设定 |
| `stories/` + `catalog.json` | 正文唯一源（地脉组） |
| `web/` | 地脉浏览台 |
| `archive/` | 只读历史，勿当现行 |
| `scripts/postcheck_story.py` | 正文时代语词自检 |

## 硬边界（摘要）

- 无修炼/法力/可验证妖鬼谱系；怪谈保留合理解释
- 正篇 1522—1644；事实 A/B/C/D/待考，见 `docs/世界/SOURCES.md`
- 引用写**自仓库根**完整路径，如 `docs/原则/宪法.md`
- 新条目：先地脉组，再体例；更新 `catalog.json`

细节与检查清单以 `AGENTS.md` 为准。
