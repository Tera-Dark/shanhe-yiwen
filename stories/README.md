# 故事目录

按 **地脉组** 归档正文（规范：`docs/原则/23`）。  
发布 / 连载按 **卷**（规范：`docs/原则/24`）。  
审查见 `docs/原则/21` v0.4 与 `stories/审查总簿.md`。  
机器索引：`catalog.json`。

## 目录结构

```text
stories/
├── catalog.json · catalog.schema.md · README.md · 审查总簿.md
├── 人物志/N_顾晚棠/
├── _templates/
└── 清洛线/                   # qingluo · 清洛卷（现行唯一正文章卷）
    ├── README.md · 中篇总纲.md · 目录骨架.md
    └── QL00…QL05/
```

## 卷

| 卷 ID | 卷名 | 状态 |
|---|---|---|
| vol-qingluo | 清洛卷 | **连载中** · 说书声纹试笔齐 |

## 地脉组

| 组 ID | 名称 | 路径 |
|---|---|---|
| qingluo | 清洛线 | `清洛线/` |

## 主角

- **顾晚棠**（棠姑娘 / 顾家的）：志 `stories/人物志/N_顾晚棠/正文.md`  
- 主路径：`QL00` → `QL01`…`QL05`

## 已作废（2026-07-24）

河东线、桥头震后、旧人物志（除顾晚棠）、世界碎片仓、主章线目录骨架——**磁盘删除，不作归档**。`archive/` 内历史勿再当正文源。

## 校验

```bash
python3 scripts/postcheck_story.py --strict stories/清洛线/QL00_入卷_清洛/正文.md
python3 scripts/check_integrity.py
python3 scripts/check_reviews.py
python3 scripts/check_story_reuse.py
```
