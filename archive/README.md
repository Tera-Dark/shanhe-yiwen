# 归档（archive）

只读追溯，**不是现行设定或正文唯一源**。

```text
archive/
├── drafts/legacy-2026-07-14/   # 项目极早期短稿
└── stories/
    └── anthologies/            # 开工草案等参考稿（非正文镜像）
```

## 现行正文在哪

| 内容 | 现行路径 |
|---|---|
| 桥上第二碗 P001 | `stories/桥头震后/P001_桥上第二碗/`（含 `versions/` 历史正文） |
| 河东线成稿 | `stories/河东线/{Y,R,G,Q,C}001_*/` |
| 索引 | `stories/catalog.json` |

旧 S001 空壳、损坏迁移备份、与现行正文重复的 anthologies 镜像已删除；需要对照时用 Git 历史与 P001 `versions/`。

## 规则

- 不在 archive 上继续写新故事。
- 不把 archive 路径写进 `catalog.json`。
- 需要对照历史版本时再打开；AI 默认忽略。
