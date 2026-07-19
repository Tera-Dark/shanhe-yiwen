# 世界碎片仓

> 网页「世界」栏的**仓库唯一源**（与 `docs/` 长设定分立）。  
> 规范指针：`stories/catalog.schema.md` · 底架计划阶段 B。  
> **折写魂、志立档、碎片立卡**：卡短可点，长文仍在 `docs/`。

## 目录

```text
stories/世界/
├── README.md
├── 势力/     # faction
├── 地标/     # place（村镇渡口点，非整卷地脉）
├── 生灵/     # creature
├── 物产/     # material
├── 风物/     # custom（规矩/忌讳/气味核）
└── （谜团可挂 docs 或 catalog mysteries，不强制建夹）
```

每条碎片一个子目录（或单文件目录）+ `正文.md`。

## 正文头（轻 frontmatter）

```markdown
---
Version: 0.1
更新时间: 2026/7/19
id: WLD-QYBJ
kind: faction
name: 青驿镖局
fullness: 80
status: 成档
group: hedong
see:
  - G001
  - docs/社会/07_组织势力.md
---

# 青驿镖局

一两段可读说明……
```

| 字段 | 说明 |
|---|---|
| `id` | 建议 `WLD-` 前缀 + 缩写，全局唯一 |
| `kind` | faction / place / creature / material / custom |
| `name` | 显示名 |
| `fullness` | 0–100，充实度，**不是战力** |
| `status` | 种子 / 框架 / 成档 |
| `group` | 可选地脉 |
| `see` | entry id 或 docs 路径 |

## 与 catalog

- 阶段 B：`catalog.json` 增加 `world[]` 索引（见 schema 1.7）。  
- 未挂 catalog 时，integrity 可扫描本目录告警。  
- **禁止**只在 `web/app.js` 写死清单作为唯一源；诗句 PLACE_VERSE 可保留在前端。

## 与 docs

| 层 | 放哪 |
|---|---|
| 可点短卡、卷内钉子 | 本目录 |
| 时代总论、组织长文、年表 | `docs/` |
| 人物完整档案 | `stories/人物志/`（N） |
| 文学折 | 地脉组内 R |

卡上用 `see` 链到长文；勿全文复制 docs。

## 命名

- 目录：`势力/青驿镖局/` 或 `势力/WLD-QYBJ_青驿镖局/`  
- 忌空目录；一种 kind 下一卡一夹。
