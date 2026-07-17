# 部署 · 地脉浏览台

本地与线上共用 `web/server.mjs` 的 `handler`。

## 本地

```bash
# 仓库根
npm start
# 或双击 启动世界观网页.bat
# → http://127.0.0.1:4182/
```

## Vercel（推荐 · 连 GitHub 后自动）

1. 打开 [vercel.com/new](https://vercel.com/new)
2. Import **`Tera-Dark/shanhe-yiwen`**
3. Framework Preset 选 **Other**
4. Root Directory 保持仓库根（`.`）
5. Build / Output 可不改（见根目录 `vercel.json`）
6. Deploy

配置要点：

| 文件 | 作用 |
|---|---|
| `vercel.json` | `outputDirectory: public`（满足 Vercel 静态输出检查）+ 全站 rewrite 到 `/api` |
| `public/.keep` | 占位；真实页面仍由 serverless `handler` 从 `web/` 读出 |
| `api/index.mjs` | Vercel 函数入口 → `handler` |
| `package.json` | `"type": "module"`、Node ≥18 |

若报错 `No Output Directory named "public"`：确认已推送含 `outputDirectory` 的 `vercel.json`，再 Redeploy。

部署后访问：

- `/` 入世页
- `/stories/catalog.json`
- `/project/docs/原则/宪法.md`
- `/__health`、`/__project-index`

公开仓库会部署**全部已推送的 docs 与 stories**。不要把私密草稿放进 `stories/` / `docs/`。

## 一键按钮（README 用）

把仓库推到 GitHub 后，可在 README 加：

```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Tera-Dark/shanhe-yiwen)
```

## 限制

- 无写回：线上只读 Markdown。
- Serverless 冷启动后首次 `/__project-index` 会扫库；正文量变大时可改为构建时生成索引。
- 自定义域名在 Vercel 项目 Settings → Domains。
