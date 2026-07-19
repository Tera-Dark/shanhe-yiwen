# 山河异闻 · 地脉浏览台

本地只读浏览：**雾金地脉**视觉——学燕云的地区总览 / 分类方帖 / 金线主路，再加现代高级排版与克制 GSAP。

规范：`docs/原则/24_卷册与连载阅读体验.md` · `docs/原则/25_踏线人主章公约.md`

## 视觉方向（2026-07-18 · 产品化收束）

| 层 | 意象 |
|---|---|
| 氛围 | CSS 雾底 + 纸粒（无插图贴纸） |
| 顶栏 | 暗条 + 金下划导航 · 印钮「寻/案」 |
| 入世 | **英雄诗 + 唯一主 CTA** → 金线 → 地标诗 → 三径 → 分卷；审印折叠 |
| 卷页 | 英雄缩略 + 续行 CTA + tabs + 金线/图鉴 + 章目 |
| 动效 | GSAP 3：标题落字、方帖错峰、金线描出、局部翻页、开卷 |
| 阅读 | 夜灯纸本 · 左侧**程目**侧栏 · 返程/上程/下程/掩卷 · 本机进度 |
| 文案 | 地域/村镇两行联，不写工程设定 |

字体：默认瘦金系正文 + 书法标题；案前可换。配色默认 **雾金**。

## 入世主路径

1. 全幅英雄区：两句诗 + **一个主按钮**（首访「从入卷听起」/ 有进度「续行 · 章名」）
2. 金线程碑：严格 `main_path`，每行 6 程，上程/下程**局部翻页**
3. 地标诗句卡
4. 三径方帖（主路 / 旁支 / 铺地）
5. 地脉分卷
6. 编辑向审印总览（`<details>` 折叠，不抢读者首屏）

## 金线

- 严格 `main_path`，不把其余条目塞进程碑
- 六程一行；翻页只替换 `.gold-path` 块，不整页闪烁
- 节点状态：`is-read` 已过 · `is-current` 此程（续行点）
- 进度存本机 `localStorage`：`shanhe.yiwen.progress.v1`
- 节点不挂审印（审印在章目/图鉴/阅读器）

## 阅读器 · 程目侧栏

- 左侧暗底雾金**程目**，替代旧顶栏横向挤章
- 按主路 / 旁支 / 铺地分段；圆点金线脊柱；`is-current` / `is-read` / 高峰 ★
- **展开/收回**
  - 顶栏「程目 / 掩目」；侧栏头「掩」；快捷键 **T**
  - 桌面收起 → 留 **窄轨**（当前程印 + 进度金脊 + 「程目」竖标），点轨展开
  - 窄屏收起 → 全藏 + 左侧 **金边拉手**；展开为抽屉 + 遮罩；点选章后自动收
  - Esc：窄屏先收栏，再掩卷
  - 偏好分记：`shanhe.yiwen.reader.toc.desk` / `.mobile`（兼容旧 key `.toc`）
- 列表序 = 当前阅读列表（默认卷内 `reading_path`/`main_path` + 同卷余章）

## 审印

网页从 `stories/catalog.json` 的 `entries[].review` 读取审查状态：

| 审印 | 含义 |
|---|---|
| **验讫** | 当前正文版本已过总编审 |
| **朱注** | 已过关，但有外发前黄灯或附注 |
| **退修** | 未过关，须返修后复审 |
| **待勘** | 未审或正文改动导致旧审印失效 |

审查标准见 `docs/原则/21_故事审查标准.md` v0.3。

## 启动

仓库根目录双击 `启动世界观网页.bat`，或：

```bash
npm start
```

→ `http://127.0.0.1:4182/`（需 Node.js ≥18）。

线上部署见 [DEPLOY.md](./DEPLOY.md)。

## 导航

| 页 | 作用 |
|---|---|
| **入世** | 地区总览 · 主路径 · 地标 · 三径 · 分卷 |
| **卷** | 地脉成卷：tabs + 路径/图鉴 + **章目全表**（程次\|标签\|标题\|审印） |
| **审印** | 原「体例」位：按待勘/退修/朱注/验讫分阶段校验；可次筛体例 |
| **世界** | 设定集：人物·势力·地脉·生灵·物产·风物·未解·卷宗摘 |
| **卷宗** | `docs/` 设定全文 |
| **时序** | 年号轴、未解之谜 |
| **案前** | 明暗、雾金等配色、字号字体、环境 |

## 数据

- `stories/catalog.json` — volumes · protagonist · track · main_path · **world[]** · blurb（诗句）；契约见 `catalog.schema.md`
- `stories/世界/` — 势力/地标/生灵/物产/风物碎片（世界栏主源）
- `/project/<相对路径.md>` — 正文与设定
- 动效：`motion.js` + GSAP 3 CDN
- 阅读进度：`localStorage` `shanhe.yiwen.progress.v1`

## 前端模块（2026-07-19 轻拆）

零构建 ES modules（`index.html` 中 `app.js` 为 `type="module"`）：

| 文件 | 职责 |
|---|---|
| `app.js` | 状态、渲染、阅读器程目、路由、事件、boot |
| `js/constants.js` | GENRE / 审印阶段 / 世界 tabs / PLACE_VERSE 等 |
| `js/markdown.js` | `escapeHtml` · `markdownToHtml` · frontmatter 徽记 |
| `motion.js` | GSAP 动效（IIFE，非 module） |

大拆（reader/settings/world 再分文件）仍可后置；硬编码业务清单禁止回流。

## 路由（hash）

| 路径 | 含义 |
|---|---|
| `#/home` | 入世 |
| `#/vol` · `#/vol/hedong` | 卷列表 / 指定地脉卷 |
| `#/read/Z007` | 直达章节阅读（示例） |
| `#/doc/docs/...` | 打开卷宗 md |
| `#/seal/pending` | 审印阶段 |
| `#/world/factions` | 世界设定 tab |

## 工程命令

```bash
npm start                          # 4182
npm run check                      # integrity + reviews
python3 scripts/scaffold_entry.py --help
python3 scripts/postcheck_story.py stories/.../正文.md --strict
```
