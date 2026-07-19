# 故事目录

按 **地脉组** 归档正文（规范：`docs/原则/23_内容分组与浏览分类.md`）。
发布 / 连载按 **卷**（规范：`docs/原则/24_卷册与连载阅读体验.md`）。
全书主章线按 **踏线人**（规范：`docs/原则/25_踏线人主章公约.md`）。
体例见 `docs/原则/22_内容体例与江湖勾勒.md`。审查与网页审印见 `docs/原则/21_故事审查标准.md` v0.3 与 `stories/审查总簿.md`。机器可读索引：`catalog.json`（含 `volumes[].main_path` / `roam_path` / `reading_path`，条目 `track` / `review`）。

## 目录结构

```text
stories/
├── catalog.json              # 组 + 卷 + 主角 + 条目（供网页）
├── catalog.schema.md         # 字段契约
├── README.md
├── 审查总簿.md
├── 主章线/
│   └── 目录骨架.md           # ~600 槽规划；未写标「槽」
├── 人物志/                   # genre N 档案
├── 世界/                     # 势力/地标/生灵/物产/风物碎片
├── _templates/
├── 河东线/                   # hedong · 河东卷
│   ├── README.md · 中篇总纲.md
│   ├── HD00_入卷/ · Z00x_… · …
│   └── 种子_*.md             # 仅指针，勿当正文
└── 桥头震后/                 # qiaotou · 桥头卷（独立）
    ├── QT00_入卷/
    └── P001_桥上第二碗/
```

历史镜像在 `archive/`。契约：`catalog.schema.md`。底架计划：`docs/管理/底架打磨计划_2026-07-19.md`。

## 卷

| 卷 ID | 卷名 | 地脉 | 状态 |
|---|---|---|---|
| vol-hedong | 河东卷 | 河东线 | 连载中 |
| vol-qiaotou | 桥头卷 | 桥头震后 | 可发 |

## 三槽（track）

| track | 含义 | 番茄 |
|---|---|---|
| main | 主线（沈陌跟脚，Z 与必要入卷） | 默认 `main_path` |
| side | 副线（冷旗等钉子，P/Q 高峰） | 可插入主路径 |
| other | 其他（Y/W/C/R/G 等） | 漫游 / 厚度 |

## 地脉组

| 组 ID | 名称 | 状态 | 路径 |
|---|---|---|---|
| hedong | 河东线 | 主线试点·成稿一组 | `河东线/` |
| qiaotou | 桥头震后 | 桥头卷可发 | `桥头震后/` |

## 踏线人

- **沈陌**（走路的 / 沈半程）：折 `stories/河东线/R_沈陌/正文.md` · 志 `stories/人物志/N_沈陌/正文.md`
- 河东主线：Z001–**Z007**（Z002/Z004 **返修待复审**；Z005–Z007 初稿）；规划 Z001–Z040 见 `主章线/目录骨架.md`；下一锄 Z008

## 条目一览（成稿，摘）

| 编号 | 卷 | track | 标题 | 状态 |
|---|---|---|---|---|
| HD00 | 河东 | main | 入卷·河东 | 基础通过 |
| Z001–Z007 | 河东 | main | 第一脚泥 … 夜不入龛 | 成稿/初稿/返修待勘 |
| R-SM | 河东 | other | 沈陌 | 基础通过 |
| N-SM 等 | 河东 | other | 人物志四档 | 待勘 |
| Y001 … C001 | 河东 | 各 | 探游/规矩/奇遇等 | 见 catalog |
| QT00 | 桥头 | main | 入卷·桥头 | 基础通过 |
| P001 | 桥头 | side | 桥上第二碗 | 基础通过 |

完整字段与审印以 `catalog.json` 为准。

## 新条目怎么开

1. 推荐：`python3 scripts/scaffold_entry.py --id Z008 --genre Z --group hedong --volume vol-hedong --track main --title 厚锣远去`
2. 或手建 `stories/<地脉组>/<编号_标题>/正文.md`。
3. frontmatter：id genre group **volume** **track** scent people links status（可选 role / peak）。
4. 挂 `catalog.json`（脚手架可草稿行）；**主线须人工确认**再写入 `main_path`（`reading_path` 默认同步）。
5. 新稿 `review.state` 默认 `pending`（待勘），不能因 `status: 基础通过` 自动盖印。
6. 写完：`postcheck --strict` → 对照 21 + 24 + 25 → 写报告 → 总编审回写 `review` → `npm run check` → 更新组 README / 目录骨架。
7. 契约见 `catalog.schema.md`。

章名文学化；短于约 1500 字标幕间/残页。工程 id 不对读者展示。骨架槽位可先满，**勿假称成稿**。
