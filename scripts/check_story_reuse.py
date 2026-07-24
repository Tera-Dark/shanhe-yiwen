#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""跨正文复写 / 批量模板检测（补 R0 单文件盲区）。

用法:
  python3 scripts/check_story_reuse.py
  python3 scripts/check_story_reuse.py --strict
  python3 scripts/check_story_reuse.py --roots stories/河东线

规则（默认）:
  - 去空白后 ≥60 字的段落出现在 ≥2 篇 → ERROR
  - 去空白后 ≥20 字的句子出现在 ≥4 篇 → WARN
  - 标题 `## 泥里再一笔` / `## 檐下半盏` 等补丁标题 → ERROR
  - 已知批量模板短语命中 ≥2 篇 → ERROR

strict: WARN 也非零退出。
"""
from __future__ import annotations

import argparse
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ROOTS = [
    ROOT / "stories" / "清洛线",
]

PATCH_HEADERS = ("## 泥里再一笔", "## 檐下半盏", "## 檐下半盏茶")
KNOWN_TEMPLATES = (
    "檐下有人抽烟，烟里不问他从哪来",
    "巷口的水洼映着半块天",
    "西边不是仙境，是另一截泥",
    "斧子一下一下",
    "飘的人像幌子。幌子好卖，不好活",
)


def strip_fm(text: str) -> str:
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            return parts[2]
    return text


def entry_id(path: Path, text: str) -> str:
    m = re.search(r"^id:\s*(.+)$", text, re.M)
    return m.group(1).strip() if m else path.parent.name


def compact(s: str) -> str:
    return re.sub(r"\s+", "", s)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--strict", action="store_true")
    ap.add_argument("--roots", nargs="*", help="扫描根目录（相对仓库根）")
    args = ap.parse_args()

    roots = [ROOT / r for r in args.roots] if args.roots else DEFAULT_ROOTS
    files: list[Path] = []
    for r in roots:
        if r.is_dir():
            files.extend(sorted(r.glob("*/正文.md")))
        elif r.is_file():
            files.append(r)

    errors: list[str] = []
    warns: list[str] = []
    paras: dict[str, list[str]] = defaultdict(list)
    sents: dict[str, list[str]] = defaultdict(list)
    bodies: dict[str, str] = {}

    for p in files:
        raw = p.read_text(encoding="utf-8")
        eid = entry_id(p, raw)
        body = strip_fm(raw)
        bodies[eid] = body
        for h in PATCH_HEADERS:
            if h in body:
                errors.append(f"[补丁标题] {eid}: 含 {h}")
        for para in re.split(r"\n\s*\n", body):
            c = compact(re.sub(r"^#+\s*", "", para.strip()))
            if len(c) >= 60:
                paras[c].append(eid)
        for s in re.split(r"[。！？]", body):
            c = compact(s.strip())
            if len(c) >= 20:
                sents[c].append(eid)

    for c, ids in paras.items():
        uniq = sorted(set(ids))
        if len(uniq) >= 2:
            errors.append(
                f"[段复写≥60] {len(uniq)}篇 {uniq}: {c[:48]}…"
            )

    for c, ids in sents.items():
        uniq = sorted(set(ids))
        if len(uniq) >= 4:
            warns.append(
                f"[句复写≥20×4] {len(uniq)}篇 {uniq[:8]}{'…' if len(uniq)>8 else ''}: {c[:40]}"
            )

    for phrase in KNOWN_TEMPLATES:
        hit = [eid for eid, b in bodies.items() if phrase in b]
        if len(hit) >= 2:
            errors.append(f"[已知模板] {len(hit)}篇 {sorted(hit)}: {phrase}")

    print("=== 山河异闻 · 跨正文复写检查 ===")
    print(f"扫描: {len(files)} 篇 · roots={[str(r.relative_to(ROOT)) for r in roots if r.exists()]}")
    print(f"ERROR {len(errors)} · WARN {len(warns)}")
    for line in errors[:50]:
        print("  E", line)
    if len(errors) > 50:
        print(f"  … +{len(errors)-50}")
    for line in warns[:30]:
        print("  W", line)
    if len(warns) > 30:
        print(f"  … +{len(warns)-30}")

    if errors:
        print("结论: FAIL")
        return 1
    if args.strict and warns:
        print("结论: FAIL (strict + WARN)")
        return 1
    print("结论: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
