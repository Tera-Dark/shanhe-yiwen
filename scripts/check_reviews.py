#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""校验 stories/catalog.json 的审印记录与正文版本（21 v0.4 硬规则）。

用法：
  python3 scripts/check_reviews.py
  python3 scripts/check_reviews.py --strict

默认：数据错误、语义冲突、失效审印 → 非零。
strict：另将 pending/revise 计为失败。
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
STANDARD_PATH = ROOT / "docs" / "原则" / "21_故事审查标准.md"
ALLOWED = {"passed", "passed_with_notes", "revise", "pending", "exempt"}
PASSED = {"passed", "passed_with_notes"}
SEAL_OF = {
    "passed": "验讫",
    "passed_with_notes": "朱注",
    "revise": "退修",
    "pending": "待勘",
    "exempt": "卷宗",
}
# note 中出现则不得处于 passed*
PENDING_NOTE_RE = re.compile(
    r"待人工|待写|待勘|脚手架新建|待复审|待总编审|待写与总编审"
)


def body_version(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"^Version:\s*(.+?)\s*$", text, re.MULTILINE)
    return match.group(1).strip() if match else ""


def standard_file_version() -> str:
    if not STANDARD_PATH.is_file():
        return ""
    text = STANDARD_PATH.read_text(encoding="utf-8")
    match = re.search(r"^Version:\s*(.+?)\s*$", text, re.MULTILINE)
    return match.group(1).strip() if match else ""


def report_mentions_id(report_path: Path, entry_id: str) -> bool:
    if not report_path.is_file():
        return False
    text = report_path.read_text(encoding="utf-8")
    if entry_id in text:
        return True
    # 合订总簿常见写法
    if re.search(rf"\b{re.escape(entry_id)}\b", text):
        return True
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="山河异闻审印登记检查")
    parser.add_argument("--strict", action="store_true", help="待勘/退修也视为失败")
    args = parser.parse_args()

    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    entries = data.get("entries", [])
    findings: list[str] = []
    warnings: list[str] = []
    states: Counter[str] = Counter()
    std_ver = standard_file_version()
    if not std_ver:
        findings.append(f"标准文件无 Version: {STANDARD_PATH.relative_to(ROOT)}")

    for entry in entries:
        entry_id = entry.get("id", "<无ID>")
        path_value = entry.get("path", "")
        body = ROOT / path_value
        review = entry.get("review") or {}
        state = review.get("state", "pending")
        states[state] += 1

        if state not in ALLOWED:
            findings.append(f"{entry_id}: 非法 review.state={state!r}")
            continue

        seal = review.get("seal", "")
        expected_seal = SEAL_OF.get(state, "")
        if seal and expected_seal and seal != expected_seal:
            findings.append(
                f"{entry_id}: seal={seal!r} 与 state={state!r} 不匹配（应为 {expected_seal}）"
            )

        if not body.is_file():
            findings.append(f"{entry_id}: 正文路径不存在 {path_value}")
            continue

        note_blob = f"{review.get('note') or ''} {review.get('notes') or ''}"
        round_n = review.get("round", 0)
        try:
            round_n = int(round_n)
        except (TypeError, ValueError):
            findings.append(f"{entry_id}: review.round 非整数 {review.get('round')!r}")
            round_n = -1

        report_value = review.get("report", "")
        std_entry = str(review.get("standard_version", "")).strip()

        if state in PASSED | {"revise"}:
            if not report_value:
                findings.append(f"{entry_id}: 缺 review.report")
            else:
                rp = ROOT / report_value
                if not rp.is_file():
                    findings.append(f"{entry_id}: 审查报告不存在 {report_value}")
                elif state in PASSED and not report_mentions_id(rp, entry_id):
                    # 总簿合订允许宽一点：若报告是总簿且含「朱注」「验讫」批次说明，仍 warn
                    if "审查总簿" in report_value:
                        warnings.append(
                            f"{entry_id}: 总簿报告中未直接出现 id（请在总簿批次表列出）"
                        )
                    else:
                        findings.append(
                            f"{entry_id}: 报告中未出现条目 id {entry_id}"
                        )
            if not review.get("date"):
                findings.append(f"{entry_id}: 缺 review.date")
            if not std_entry:
                findings.append(f"{entry_id}: 缺 review.standard_version")
            if not (review.get("reviewer") or "").strip():
                findings.append(f"{entry_id}: 缺 review.reviewer（passed* 须非空）")

        if state in PASSED:
            if round_n < 1:
                findings.append(
                    f"{entry_id}: round={round_n} 不得为 passed*（21 v0.4 要求 round≥1）"
                )
            if PENDING_NOTE_RE.search(note_blob):
                findings.append(
                    f"{entry_id}: note 含未完成语义，不得为 passed*：{note_blob.strip()[:48]}"
                )
            if std_ver and std_entry and std_entry != std_ver:
                findings.append(
                    f"{entry_id}: standard_version={std_entry!r} ≠ 标准文件 Version={std_ver!r}"
                )

        current = body_version(body)
        reviewed = str(review.get("source_version", "")).strip()
        if state in PASSED and current != reviewed:
            findings.append(
                f"{entry_id}: 审印失效，正文 Version={current or '无'}，"
                f"review.source_version={reviewed or '无'}"
            )

    print("=== 山河异闻 · 审印登记检查 ===")
    print(f"标准文件 Version: {std_ver or '（缺）'}")
    print(f"条目: {len(entries)}")
    for key in ("passed", "passed_with_notes", "revise", "pending", "exempt"):
        print(f"  {key}: {states[key]}")

    if warnings:
        print("\n## 警告")
        for item in warnings:
            print(f"- {item}")

    if findings:
        print("\n## 数据问题")
        for item in findings:
            print(f"- {item}")
    else:
        print("\n数据与正文版本一致（含 21 v0.4 语义规则）。")

    if args.strict:
        blocked = states["revise"] + states["pending"]
        if blocked:
            print(f"\nSTRICT: {blocked} 个条目尚未过关。")
            return 1
    return 1 if findings else 0


if __name__ == "__main__":
    sys.exit(main())
