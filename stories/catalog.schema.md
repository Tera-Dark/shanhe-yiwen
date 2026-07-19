# catalog.json 契约

> 机器索引的唯一说明。改字段先改本文，再改 `catalog.json` 与 `web/app.js`。  
> 版本：与 `catalog.json` 的 `version` 对齐（当前 **1.6**）。

## 一、顶层

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `version` | string | 是 | 语义化次版本；破坏性字段变更升 minor（1.6→1.7） |
| `updated` | string | 是 | `YYYY-MM-DD` |
| `grouping` | object | 是 | 规范指针：primary / filters / 各 `*_spec` 路径 |
| `protagonist` | object | 是 | 踏线人：id / name / title / alias / dossier / character_sheet |
| `volumes` | array | 是 | 卷册 |
| `groups` | array | 是 | 地脉组 |
| `entries` | array | 是 | 可阅条目（正文 / 入卷 / 人物志等） |
| `world` | array | 否 | **1.7+** 世界碎片索引；缺省时网页可读 `stories/世界/**` 扫描或旧种子 |

### volumes[]

| 字段 | 说明 |
|---|---|
| `id` | 如 `vol-hedong` |
| `name` / `subtitle` / `blurb` | 读者向；blurb 宜诗句，忌工程句 |
| `group` | 对应 `groups[].id` |
| `status` | 连载中 / 可发 / 规划 等 |
| `main_path` | 番茄默认章序（id 列表） |
| `reading_path` | 连载荐读；默认可同 main |
| `roam_path` | 漫游 / 资料序 |
| `platform_note` | 编辑向备注，可不进读者 UI |

规则：三 path 中的每个 id **必须**存在于 `entries[].id`。人物志 N 默认不进 `main_path`。

### groups[]

| 字段 | 说明 |
|---|---|
| `id` | 英文短 id：`hedong` / `qiaotou` |
| `name` / `path` | 中文名；仓库相对路径如 `stories/河东线` |
| `volume` | 卷 id |
| `kernel` | 互链钉字符串列表 |
| `status` / `summary` | 状态；summary 宜诗句 |

### entries[]（正文条目）

| 字段 | 必填 | 说明 |
|---|---|---|
| `id` | 是 | 稳定键：`Z001` / `N-SM` / `HD00` |
| `title` | 是 | 文学短名（网页主显） |
| `genre` | 是 | V Z P C Q Y W R N G X |
| `group` | 是* | 地脉组 id；人物志可用 `hedong` 或挂所属卷地脉 |
| `volume` | 是* | 卷 id |
| `track` | 是* | `main` \| `side` \| `other` |
| `path` | 是 | 自仓库根到 `正文.md` |
| `status` | 是 | 写作阶段文案（初稿/基础通过/…）；**≠** 审印 |
| `review` | 是 | 见下；无则等价待勘 |
| `scent` | 否 | 气味标签 |
| `people` | 否 | 人名，供世界栏聚合 |
| `factions` | 否 | 势力名 |
| `links` | 否 | 相关 entry id |
| `role` | 否 | `prologue` \| `main` \| `interlude` \| `coda` |
| `peak` | 否 | bool，卷内高峰 |
| `legacy_id` | 否 | 旧编号 |

\* 入卷/人物志亦应填 volume+track，便于筛选。

### entries[].review

| 字段 | 说明 |
|---|---|
| `state` | **仅** `passed` \| `passed_with_notes` \| `revise` \| `pending` \| `exempt` |
| `seal` | 展示：验讫 / 朱注 / 退修 / 待勘（可与 state 推导一致） |
| `source_version` | 审定时正文 frontmatter `Version:` |
| `date` / `round` / `scope` | 日期、轮次、base 等 |
| `standard` / `standard_version` | 通常 21 文档与 `0.3` |
| `report` | 报告路径（总簿或篇内 07） |
| `reviewer` / `note` | 可选 |

规则：

- 正文 `Version` 与 `source_version` 不一致且 state∈{passed, passed_with_notes} → **审印失效**，应交为 `pending`。  
- 无 `review` 或 state 非法 → 待勘。  
- `passed` / `revise` 宜有 `report` + `date` + `standard_version`（`check_reviews.py` 校验）。

### world[]（阶段 B · 1.7）

| 字段 | 说明 |
|---|---|
| `id` | 如 `WLD-QYBJ` |
| `name` | 显示名 |
| `kind` | `faction` \| `place` \| `creature` \| `material` \| `custom` \| `mystery` |
| `path` | `stories/世界/<类>/…/正文.md` |
| `fullness` | 0–100，充实度（非战力） |
| `status` | 种子 / 框架 / 成档 等 |
| `see` | 相关 entry id 或 docs 路径 |
| `group` | 可选地脉 |

磁盘约定见 `stories/世界/README.md`。catalog 可只索引；网页以 path 打开。

---

## 二、路径与 ID 约定

| 类型 | 目录 | id 例 |
|---|---|---|
| 地脉正文 | `stories/<组>/<ID_标题>/正文.md` | Z006 |
| 人物志 | `stories/人物志/N_名/正文.md` | N-SM |
| 世界碎片 | `stories/世界/<类>/…/正文.md` | WLD-… |
| 入卷 | 同上地脉 | HD00 / QT00 |

- 引用一律**自仓库根**相对路径，正斜杠。  
- `id` 全局唯一；改 id 须同步三 path + links + 网页书签（若有 hash）。

---

## 三、版本 bump

| 变更 | version |
|---|---|
| 只增条目 / 改 status·review·path 内容 | 可只改 `updated`，version 不动或 patch 文案 |
| 新增可选顶层/条目字段（旧网页可忽略） | minor：1.6→1.7 |
| 删除/改名必填字段、改 state 枚举 | major：与 web 同步发版 |

当前计划：**1.7** = 增加 `world[]`（或等价）并迁出 app.js 种子。

---

## 四、谁改 catalog

| 动作 | 谁 |
|---|---|
| 新条目 | `scripts/scaffold_entry.py` 或手改 + integrity |
| 审印 | 总编审写 review；`check_reviews.py` |
| 插 main_path | 人确认后改 volumes（脚手架默认不自动插入） |
| 世界碎片 | 落盘 `stories/世界/` 后挂 `world[]` 或由 integrity 提示 |

---

## 五、检查命令

```bash
python3 scripts/check_integrity.py   # 磁盘↔索引、path、三 path 引用
python3 scripts/check_reviews.py     # 审印与 Version
python3 scripts/postcheck_story.py stories/.../正文.md
npm run check                        # integrity + reviews
```
