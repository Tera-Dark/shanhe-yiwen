#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""工程一致性总检：catalog ↔ 磁盘、三 path 引用、world、人物志。

用法：
  python3 scripts/check_integrity.py
  python3 scripts/check_integrity.py --strict   # 警告也非零退出
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "stories" / "catalog.json"
WORLD_ROOT = ROOT / "stories" / "世界"
PERSON_ROOT = ROOT / "stories" / "人物志"

ALLOWED_GENRE = set("VZPCQYWRNGX")
ALLOWED_TRACK = {"main", "side", "other"}
ALLOWED_KIND = {"faction", "place", "creature", "material", "custom", "mystery", "scrap"}


def main() -> int:
    parser = argparse.ArgumentParser(description="山河异闻工程一致性检查")
    parser.add_argument("--strict", action="store_true", help="警告也视为失败")
    args = parser.parse_args()

    if not CATALOG.is_file():
        print("FATAL: 缺少 stories/catalog.json", file=sys.stderr)
        return 2

    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    errors: list[str] = []
    warnings: list[str] = []

    entries = data.get("entries") or []
    volumes = data.get("volumes") or []
    groups = data.get("groups") or []
    world = data.get("world") or []

    ids = [e.get("id") for e in entries if e.get("id")]
    id_set = set(ids)
    if len(ids) != len(id_set):
        from collections import Counter

        dup = [k for k, v in Counter(ids).items() if v > 1]
        errors.append(f"重复 entry id: {dup}")

    group_ids = {g.get("id") for g in groups}
    vol_ids = {v.get("id") for v in volumes}

    # groups path
    for g in groups:
        gid = g.get("id", "?")
        p = g.get("path")
        if not p:
            errors.append(f"group {gid}: 缺 path")
            continue
        if not (ROOT / p).is_dir():
            errors.append(f"group {gid}: 目录不存在 {p}")

    # volumes ↔ groups
    for v in volumes:
        vid = v.get("id", "?")
        if v.get("group") and v["group"] not in group_ids:
            errors.append(f"volume {vid}: group={v['group']} 不在 groups")
        for field in ("main_path", "reading_path", "roam_path"):
            for pid in v.get(field) or []:
                if pid not in id_set:
                    errors.append(f"volume {vid}.{field}: 未知 id {pid}")

    # entries
    for e in entries:
        eid = e.get("id", "<无ID>")
        path = e.get("path", "")
        if not path:
            errors.append(f"{eid}: 缺 path")
        elif not (ROOT / path).is_file():
            errors.append(f"{eid}: 正文不存在 {path}")
        genre = e.get("genre")
        if genre and genre not in ALLOWED_GENRE:
            errors.append(f"{eid}: 非法 genre={genre!r}")
        track = e.get("track")
        if track and track not in ALLOWED_TRACK:
            errors.append(f"{eid}: 非法 track={track!r}")
        if e.get("group") and e["group"] not in group_ids:
            warnings.append(f"{eid}: group={e['group']} 不在 groups")
        if e.get("volume") and e["volume"] not in vol_ids:
            warnings.append(f"{eid}: volume={e['volume']} 不在 volumes")
        for lid in e.get("links") or []:
            if lid not in id_set:
                warnings.append(f"{eid}: links 指向未知 {lid}")
        if not e.get("review"):
            warnings.append(f"{eid}: 无 review（视同待勘）")

    # 磁盘有正文但未进 catalog（地脉组 + 人物志）
    catalog_paths = {e.get("path") for e in entries if e.get("path")}

    def walk_bodies(base: Path) -> list[Path]:
        if not base.is_dir():
            return []
        out = []
        for p in base.rglob("正文.md"):
            if "versions" in p.parts or "_templates" in p.parts:
                continue
            out.append(p)
        return out

    for g in groups:
        base = ROOT / g.get("path", "")
        for body in walk_bodies(base):
            rel = body.relative_to(ROOT).as_posix()
            if rel not in catalog_paths:
                warnings.append(f"磁盘正文未挂 catalog: {rel}")

    for body in walk_bodies(PERSON_ROOT):
        rel = body.relative_to(ROOT).as_posix()
        if rel not in catalog_paths:
            warnings.append(f"人物志未挂 catalog: {rel}")

    # N genre ↔ 人物志目录
    n_entries = [e for e in entries if e.get("genre") == "N"]
    for e in n_entries:
        p = e.get("path") or ""
        if not p.startswith("stories/人物志/"):
            warnings.append(f"{e.get('id')}: 人物志 path 宜在 stories/人物志/ 下（现 {p}）")

    # world[]
    world_ids = []
    for w in world:
        wid = w.get("id", "?")
        world_ids.append(wid)
        path = w.get("path", "")
        if not path:
            errors.append(f"world {wid}: 缺 path")
        elif not (ROOT / path).is_file():
            errors.append(f"world {wid}: 文件不存在 {path}")
        kind = w.get("kind")
        if kind and kind not in ALLOWED_KIND:
            warnings.append(f"world {wid}: kind={kind!r} 非标准")
        fl = w.get("fullness")
        if fl is not None and (not isinstance(fl, int) or fl < 0 or fl > 100):
            warnings.append(f"world {wid}: fullness 应 0–100")

    if len(world_ids) != len(set(world_ids)):
        errors.append("world[] 存在重复 id")

    # 磁盘世界碎片未索引
    if WORLD_ROOT.is_dir():
        for body in WORLD_ROOT.rglob("正文.md"):
            rel = body.relative_to(ROOT).as_posix()
            if not any(w.get("path") == rel for w in world):
                warnings.append(f"世界碎片未挂 catalog.world: {rel}")

    # 种子指针提示
    for g in groups:
        base = ROOT / g.get("path", "")
        if not base.is_dir():
            continue
        for seed in base.glob("种子_*.md"):
            warnings.append(f"存在种子指针（勿当正文）: {seed.relative_to(ROOT).as_posix()}")

    print("=== 山河异闻 · 工程一致性 ===")
    print(f"catalog version: {data.get('version')} · updated {data.get('updated')}")
    print(f"entries: {len(entries)} · volumes: {len(volumes)} · groups: {len(groups)} · world: {len(world)}")
    print(f"errors: {len(errors)} · warnings: {len(warnings)}")

    if errors:
        print("\n## 错误")
        for x in errors:
            print(f"- {x}")
    if warnings:
        print("\n## 警告")
        for x in warnings:
            print(f"- {x}")
    if not errors and not warnings:
        print("\n全部通过。")

    if errors:
        return 1
    if args.strict and warnings:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
