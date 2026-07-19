#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""校验 stories/catalog.json 的审印记录与正文版本。

用法：
  python3 scripts/check_reviews.py
  python3 scripts/check_reviews.py --strict

strict 模式下，待勘/退修也返回非零；默认只对数据错误与失效审印返回非零。
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "stories" / "catalog.json"
ALLOWED = {"passed", "passed_with_notes", "revise", "pending", "exempt"}
PASSED = {"passed", "passed_with_notes"}


def body_version(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"^Version:\s*(.+?)\s*$", text, re.MULTILINE)
    return match.group(1).strip() if match else ""


def main() -> int:
    parser = argparse.ArgumentParser(description="山河异闻审印登记检查")
    parser.add_argument("--strict", action="store_true", help="待勘/退修也视为失败")
    args = parser.parse_args()

    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    entries = data.get("entries", [])
    findings: list[str] = []
    states: Counter[str] = Counter()

    for entry in entries:
        entry_id = entry.get("id", "<无ID>")
        path_value = entry.get("path", "")
        body = ROOT / path_value
        review = entry.get("review") or {}
        state = review.get("state", "pending")
        states[state] += 1

        if state not in ALLOWED:
            findings.append(f"{entry_id}: 非法 review.state={state!r}")
        if not body.is_file():
            findings.append(f"{entry_id}: 正文路径不存在 {path_value}")
            continue

        report_value = review.get("report", "")
        if state in PASSED | {"revise"}:
            if not report_value:
                findings.append(f"{entry_id}: 缺 review.report")
            elif not (ROOT / report_value).is_file():
                findings.append(f"{entry_id}: 审查报告不存在 {report_value}")
            if not review.get("date"):
                findings.append(f"{entry_id}: 缺 review.date")
            if not review.get("standard_version"):
                findings.append(f"{entry_id}: 缺 review.standard_version")

        current = body_version(body)
        reviewed = str(review.get("source_version", "")).strip()
        if state in PASSED and current != reviewed:
            findings.append(
                f"{entry_id}: 审印失效，正文 Version={current or '无'}，review.source_version={reviewed or '无'}"
            )

    print("=== 山河异闻 · 审印登记检查 ===")
    print(f"条目: {len(entries)}")
    for key in ("passed", "passed_with_notes", "revise", "pending", "exempt"):
        print(f"  {key}: {states[key]}")

    if findings:
        print("\n## 数据问题")
        for item in findings:
            print(f"- {item}")
    else:
        print("\n数据与正文版本一致。")

    if args.strict:
        blocked = states["revise"] + states["pending"]
        if blocked:
            print(f"\nSTRICT: {blocked} 个条目尚未过关。")
            return 1
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
