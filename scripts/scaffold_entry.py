#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""一键新建条目目录 + 正文模板 + catalog 草稿行。

用法：
  python3 scripts/scaffold_entry.py --id Z007 --genre Z --group hedong \\
      --volume vol-hedong --track main --title 夜不入龛
  python3 scripts/scaffold_entry.py --id N-LC --genre N --title 老成 \\
      --group hedong --volume vol-hedong --track other
  python3 scripts/scaffold_entry.py --world --id WLD-XX --kind faction \\
      --name 某帮 --group hedong

注意：
  - 默认不把 id 插入 volumes[].main_path（须人工确认）。
  - 已存在目录或 catalog id 时拒绝覆盖（加 --force 仅覆盖正文模板时仍慎用）。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "stories" / "catalog.json"

GENRE_NAMES = {
    "V": "入卷",
    "Z": "主纪",
    "P": "旁纪",
    "C": "残章",
    "Q": "奇遇",
    "Y": "探游",
    "W": "传闻",
    "R": "人物折",
    "N": "人物志",
    "G": "规矩帖",
    "X": "意象志",
}

KIND_DIRS = {
    "faction": "势力",
    "place": "地标",
    "creature": "生灵",
    "material": "物产",
    "custom": "风物",
}

TRACKS = {"main", "side", "other"}


def today() -> str:
    d = date.today()
    return f"{d.year}/{d.month}/{d.day}"


def load_catalog() -> dict:
    return json.loads(CATALOG.read_text(encoding="utf-8"))


def save_catalog(data: dict) -> None:
    data["updated"] = date.today().isoformat()
    CATALOG.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def group_path(data: dict, group_id: str) -> Path | None:
    for g in data.get("groups") or []:
        if g.get("id") == group_id:
            p = g.get("path")
            return ROOT / p if p else None
    return None


def group_name(data: dict, group_id: str) -> str:
    for g in data.get("groups") or []:
        if g.get("id") == group_id:
            return g.get("name") or group_id
    return group_id


def safe_dir_name(title: str) -> str:
    t = re.sub(r'[\\/:*?"<>|]', "", title).strip()
    return t or "未名"


def body_template(
    *,
    entry_id: str,
    title: str,
    genre: str,
    group: str,
    group_label: str,
    volume: str,
    track: str,
) -> str:
    return f"""---
Version: 0.1
更新时间: {today()}
id: {entry_id}
title: {title}
genre: {genre}
group: {group}
group_name: {group_label}
volume: {volume}
track: {track}
scent: []
people: []
factions: []
links: []
status: 初稿
era_feel: 明中后期·小架空
史料: 项目原创D为主；不冒充制度史实
---

# {title}

（正文）
"""


def world_template(*, wid: str, kind: str, name: str, group: str, fullness: int) -> str:
    group_line = f"group: {group}\n" if group else ""
    return f"""---
Version: 0.1
更新时间: {today()}
id: {wid}
kind: {kind}
name: {name}
fullness: {fullness}
status: 种子
{group_line}see: []
---

# {name}

> 一两段。不写战力等级。别人怎么说可以记，作者不盖章超常真相。

## 另见

- （entry id 或 docs 路径）
"""


def scaffold_entry(args: argparse.Namespace) -> int:
    data = load_catalog()
    entry_id = args.id.strip()
    if any(e.get("id") == entry_id for e in data.get("entries") or []):
        print(f"错误：catalog 已有 id={entry_id}", file=sys.stderr)
        return 1

    genre = args.genre.upper()
    if genre not in GENRE_NAMES:
        print(f"错误：未知 genre={genre}，可选 {', '.join(GENRE_NAMES)}", file=sys.stderr)
        return 1

    track = (args.track or "other").lower()
    if track not in TRACKS:
        print(f"错误：track 须为 main|side|other", file=sys.stderr)
        return 1

    group = args.group
    volume = args.volume
    if not volume:
        for v in data.get("volumes") or []:
            if v.get("group") == group:
                volume = v.get("id")
                break
    if not group or not volume:
        print("错误：需要 --group 与 --volume（或 volume 可从 group 推导）", file=sys.stderr)
        return 1

    title = args.title.strip()
    gname = group_name(data, group)

    if genre == "N":
        # 人物志：stories/人物志/N_名/
        folder = ROOT / "stories" / "人物志" / f"N_{safe_dir_name(title)}"
        rel_path = folder.relative_to(ROOT).as_posix() + "/正文.md"
    else:
        base = group_path(data, group)
        if not base:
            print(f"错误：找不到 group={group} 的 path", file=sys.stderr)
            return 1
        folder = base / f"{entry_id}_{safe_dir_name(title)}"
        rel_path = folder.relative_to(ROOT).as_posix() + "/正文.md"

    body_file = ROOT / rel_path
    if body_file.exists() and not args.force:
        print(f"错误：已存在 {rel_path}（加 --force 覆盖正文）", file=sys.stderr)
        return 1

    folder.mkdir(parents=True, exist_ok=True)
    body_file.write_text(
        body_template(
            entry_id=entry_id,
            title=title,
            genre=genre,
            group=group,
            group_label=gname,
            volume=volume,
            track=track,
        ),
        encoding="utf-8",
    )

    entry = {
        "id": entry_id,
        "title": title if genre != "N" else f"人物志·{title}",
        "genre": genre,
        "group": group,
        "volume": volume,
        "track": track,
        "scent": [],
        "people": [title] if genre == "N" else [],
        "factions": [],
        "links": [],
        "status": "初稿",
        "role": "prologue" if genre == "V" else ("side" if genre == "N" else "main"),
        "path": rel_path,
        "review": {
            "state": "pending",
            "seal": "待勘",
            "round": 0,
            "date": date.today().isoformat(),
            "scope": "base",
            "standard": "docs/原则/21_故事审查标准.md",
            "standard_version": "0.3",
            "report": "",
            "reviewer": "",
            "source_version": "0.1",
            "note": "脚手架新建，待写与总编审",
        },
    }
    data.setdefault("entries", []).append(entry)
    save_catalog(data)

    print(f"已建正文：{rel_path}")
    print(f"已挂 catalog entries：{entry_id}（review=待勘）")
    print("未修改 main_path / reading_path —— 主线请人工确认后插入。")
    print("下一步：写正文 → postcheck → npm run check")
    return 0


def scaffold_world(args: argparse.Namespace) -> int:
    data = load_catalog()
    wid = args.id.strip()
    if not wid.startswith("WLD-"):
        print("提示：世界碎片 id 建议 WLD- 前缀", file=sys.stderr)
    if any(w.get("id") == wid for w in data.get("world") or []):
        print(f"错误：catalog.world 已有 id={wid}", file=sys.stderr)
        return 1

    kind = args.kind
    if kind not in KIND_DIRS:
        print(f"错误：kind 须为 {', '.join(KIND_DIRS)}", file=sys.stderr)
        return 1

    name = (args.name or args.title or "").strip()
    if not name:
        print("错误：世界碎片需要 --name", file=sys.stderr)
        return 1

    folder = ROOT / "stories" / "世界" / KIND_DIRS[kind] / safe_dir_name(name)
    rel = folder.relative_to(ROOT).as_posix() + "/正文.md"
    body = ROOT / rel
    if body.exists() and not args.force:
        print(f"错误：已存在 {rel}", file=sys.stderr)
        return 1

    folder.mkdir(parents=True, exist_ok=True)
    fullness = int(args.fullness or 15)
    body.write_text(
        world_template(
            wid=wid,
            kind=kind,
            name=name,
            group=args.group or "",
            fullness=fullness,
        ),
        encoding="utf-8",
    )

    item = {
        "id": wid,
        "name": name,
        "kind": kind,
        "path": rel,
        "fullness": fullness,
        "status": "种子",
        "see": [],
    }
    if args.group:
        item["group"] = args.group
    data.setdefault("world", []).append(item)
    if not str(data.get("version", "1.0")) >= "1.7":
        data["version"] = "1.7"
    save_catalog(data)

    print(f"已建碎片：{rel}")
    print(f"已挂 catalog.world：{wid}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="山河异闻 · 新条目/世界碎片脚手架")
    parser.add_argument("--world", action="store_true", help="创建世界碎片而非正文条目")
    parser.add_argument("--id", required=True, help="条目 id，如 Z007 / N-LC / WLD-XX")
    parser.add_argument("--genre", help="体例 V/Z/P/C/Q/Y/W/R/N/G/X")
    parser.add_argument("--group", help="地脉 group id，如 hedong")
    parser.add_argument("--volume", help="卷 id，如 vol-hedong")
    parser.add_argument("--track", default="other", help="main|side|other")
    parser.add_argument("--title", help="标题（条目）")
    parser.add_argument("--name", help="名称（世界碎片）")
    parser.add_argument("--kind", help="faction|place|creature|material|custom")
    parser.add_argument("--fullness", type=int, default=15, help="世界碎片充实度 0–100")
    parser.add_argument("--force", action="store_true", help="允许覆盖已存在正文文件")
    args = parser.parse_args()

    if args.world:
        if not args.kind:
            print("错误：--world 需要 --kind", file=sys.stderr)
            return 1
        return scaffold_world(args)

    if not args.genre or not args.title:
        print("错误：正文条目需要 --genre 与 --title", file=sys.stderr)
        return 1
    if not args.group:
        print("错误：正文条目需要 --group", file=sys.stderr)
        return 1
    return scaffold_entry(args)


if __name__ == "__main__":
    sys.exit(main())
