# 归档（archive）

只读追溯，**不是现行设定或正文唯一源**。

```text
archive/
├── drafts/legacy-2026-07-14/   # 项目极早期短稿
├── stories/
│   ├── anthologies/            # 开工草案等参考稿（非正文镜像）
│   └── 桥头震后/
│       └── P001_桥上第二碗/    # 2026-07-22 暂撤；含 versions/
└── web-previews/               # 早期卷册/番茄 HTML 原型（非现行入口）
```

## 现行正文在哪

| 内容 | 现行路径 |
|---|---|
| 河东线成稿 | `stories/河东线/`（HD00 + Z001–Z040 主脊 + side/other） |
| 桥头入卷气味 | `stories/桥头震后/QT00_入卷/` |
| 桥上第二碗 P001 | **暂撤** → `archive/stories/桥头震后/P001_桥上第二碗/`（说明：`stories/桥头震后/P001_暂撤说明.md`） |
| 人物志 | `stories/人物志/` |
| 世界碎片 | `stories/世界/` |
| 索引 | `stories/catalog.json` · 契约 `catalog.schema.md` |

## 规则

- 不在 archive 上继续写新故事。
- **不把 archive 路径写进 `catalog.json` 当现行条目**（P001 已出库）。
- 需要对照历史版本时再打开；AI 默认忽略，恢复时再 scaffold 入库并走 R0。
- 现行网页入口仅为 `web/index.html`（`npm start`）；`web-previews/` 勿当产品入口。
