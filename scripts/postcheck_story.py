#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""山河异闻计划 · 故事生成后自检

默认严格检查「正文.md」的时代语词、现代梗与重复句。
历史版本 (versions/) 只读提示，不阻断。
设定文档可选用 --meta 做泄漏检查。

用法:
  python3 scripts/postcheck_story.py stories/桥头震后/P001_桥上第二碗/正文.md
  python3 scripts/postcheck_story.py stories/河东线/Y001_雨后的官道/
  python3 scripts/postcheck_story.py stories/桥头震后/P001_桥上第二碗/ --meta
  python3 scripts/postcheck_story.py stories/河东线/Y001_雨后的官道/正文.md --strict

退出码:
  0 = 通过（可有 INFO / 非 strict 下的 WARN）
  1 = 存在阻断项；或 --strict 且存在 WARN
  2 = 参数/路径错误
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Sequence, Tuple

# 正文阻断：器物 / 网络梗 / 明显现代术语
BODY_BLOCK: List[Tuple[str, str, str]] = [
    (r"公文包", "时代器物", "改为「公文/文书」+「油布包/皮囊/报袋/夹板」"),
    (r"档案袋|文件夹|文件袋|手提包|双肩包|公文袋", "时代器物", "改为油布包、皮囊、报袋、夹板、包袱"),
    (r"(?<![不未勿莫禁])签名|(?<![不未勿莫禁])签字", "制度语词", "作保写「画押」「书押」"),
    (r"表格", "制度语词", "写「册子/项/门类」，勿写「表格」"),
    (r"数据库|统计表|大数据", "现代术语", "写「册上所记」「人数」「项」"),
    (r"余震", "现代术语", "写「地又动了」「又震了一回」"),
    (r"电话|手机|电脑|短信|微信|快递|地铁|公交|塑料", "现代器物", "删除或改写"),
    (
        r"内卷|摆烂|社死|破防|躺平|真香|emo|yyds|绝绝子|打工人|社畜|吐槽|信息差|情绪价值|拉满|整活|复盘|迭代|赋能|抓手|KPI",
        "网络/管理黑话",
        "删除；幽默须来自人物与制度",
    ),
    (r"老板|经理|项目组|用户体验|沉浸感|对接落地", "现代职场", "删除"),
    (r"治愈闭环|情绪闭环|成长闭环|完整闭环", "作者元语言", "正文禁止元叙述"),
    (r"替身", "现代叙事词", "改写为具体：是否成了所等之人"),
]

# 正文警告：需人工确认
BODY_WARN: List[Tuple[str, str, str]] = [
    (r"格式(?!化)", "制度语词", "册籍宜写「体例」「旧例」「项」"),
    (r"对账", "现代会计感", "可改为「翻旧册」「对清旧账」"),
    (r"盖章", "制度语词", "宜写「用印」「盖印」「钤印」"),
    (r"闭环|治愈|成长弧|情绪曲线|世界观|设定集", "作者元语言", "正文宜避免作者术语"),
    (r"百分比|百分点|效率机制", "现代抽象词", "改为具体动作与后果"),
    (r"采访|主题曲|象征意义", "作者元语言", "正文删除"),
    (r"审核通过|流程优化|系统登记", "现代公文腔", "改写为时代办事说法"),
]

# 设定文档阻断：仅抓「可能被生成器抄进正文」的硬错位
# 否定句（不得/不要/禁止…）自动跳过，见 is_negated_context
META_BLOCK: List[Tuple[str, str, str]] = [
    (r"公文包", "时代器物", "设定里若出现，须标明禁止；正文不得使用"),
    (r"电话|手机|电脑|微信|地铁|公交|塑料|快递", "现代器物", "设定与正文均不得当作明代日常"),
    (
        r"内卷|摆烂|社死|破防|躺平|真香|emo|yyds|绝绝子",
        "网络梗",
        "正文绝对禁止；设定说明里引用须加引号并标明禁止",
    ),
]

NEGATION_MARKERS = (
    "不得",
    "不要",
    "禁止",
    "勿写",
    "不写",
    "不能写",
    "改为",
    "避免",
    "禁用",
    "删掉",
    "删除",
    "不可",
    "严禁",
    "不准",
    "别写",
    "不使用",
    "不得写",
    "不采用",
    "属时代错位",
    "现代包具",
    "现代术语",
    "现代网络",
)


@dataclass
class Finding:
    level: str
    path: Path
    line_no: int
    line: str
    tag: str
    matched: str
    advice: str


@dataclass
class Report:
    findings: List[Finding] = field(default_factory=list)
    files: List[Path] = field(default_factory=list)

    @property
    def blocks(self) -> List[Finding]:
        return [f for f in self.findings if f.level == "BLOCK"]

    @property
    def warns(self) -> List[Finding]:
        return [f for f in self.findings if f.level == "WARN"]

    @property
    def infos(self) -> List[Finding]:
        return [f for f in self.findings if f.level == "INFO"]


def is_negated_context(line: str) -> bool:
    return any(m in line for m in NEGATION_MARKERS)


def is_version_file(path: Path) -> bool:
    return "/versions/" in str(path).replace("\\", "/")


def is_body_file(path: Path) -> bool:
    return path.name == "正文.md" or path.name.endswith("正文.md")


def is_meta_file(path: Path) -> bool:
    if is_version_file(path) or is_body_file(path):
        return False
    return path.suffix.lower() == ".md"


def iter_targets(path: Path, include_meta: bool) -> List[Path]:
    if path.is_file():
        return [path]
    bodies = sorted(path.rglob("正文.md"))
    # 也接受 正文_current 之类
    bodies += sorted(
        p
        for p in path.rglob("*.md")
        if p.name.endswith("正文.md") and p not in bodies and not is_version_file(p)
    )
    if not include_meta:
        return bodies
    metas = [
        p
        for p in sorted(path.rglob("*.md"))
        if is_meta_file(p) and not is_version_file(p)
    ]
    return bodies + metas


def scan_patterns(
    path: Path,
    line_no: int,
    line: str,
    patterns: Sequence[Tuple[str, str, str]],
    level: str,
    report: Report,
    respect_negation: bool,
) -> None:
    if re.search(r"https?://", line):
        return
    negated = respect_negation and is_negated_context(line)
    for regex, tag, advice in patterns:
        for m in re.finditer(regex, line):
            if negated:
                continue
            report.findings.append(
                Finding(level, path, line_no, line.rstrip("\n"), tag, m.group(0), advice)
            )


def check_duplicate_lines(path: Path, lines: Sequence[str], report: Report) -> None:
    prev = None
    prev_no = 0
    for i, line in enumerate(lines, 1):
        s = line.strip()
        if not s or s.startswith("#") or s.startswith("---") or s.startswith(">"):
            prev, prev_no = s, i
            continue
        if prev and s == prev and len(s) >= 8:
            report.findings.append(
                Finding(
                    "WARN",
                    path,
                    i,
                    s,
                    "重复句",
                    s[:40],
                    f"与第 {prev_no} 行完全相同，疑似生成残留",
                )
            )
        elif (
            prev
            and len(s) > 12
            and len(prev) > 12
            and s[:12] == prev[:12]
            and abs(len(s) - len(prev)) < 25
            and s != prev
        ):
            report.findings.append(
                Finding(
                    "WARN",
                    path,
                    i,
                    s,
                    "近重复句",
                    s[:40],
                    f"与第 {prev_no} 行高度相似，疑似双写",
                )
            )
        prev, prev_no = s, i


def check_versions_info(root: Path, report: Report) -> None:
    for p in root.rglob("正文_v*.md"):
        try:
            text = p.read_text(encoding="utf-8")
        except OSError:
            continue
        if "公文包" in text:
            report.findings.append(
                Finding(
                    "INFO",
                    p,
                    0,
                    "(file)",
                    "历史版本",
                    f"公文包×{text.count('公文包')}",
                    "只读对照，禁止回写现行正文",
                )
            )
        if "余震" in text:
            report.findings.append(
                Finding(
                    "INFO",
                    p,
                    0,
                    "(file)",
                    "历史版本",
                    f"余震×{text.count('余震')}",
                    "旧稿术语；现行正文宜写「地又动了」",
                )
            )


def scan_body(path: Path, report: Report) -> None:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as e:
        report.findings.append(Finding("BLOCK", path, 0, "", "IO", str(e), "无法读取"))
        return
    lines = text.splitlines()
    for i, line in enumerate(lines, 1):
        scan_patterns(path, i, line, BODY_BLOCK, "BLOCK", report, respect_negation=True)
        scan_patterns(path, i, line, BODY_WARN, "WARN", report, respect_negation=True)
    check_duplicate_lines(path, lines, report)
    chars = len(re.sub(r"\s+", "", text))
    report.findings.append(
        Finding(
            "INFO",
            path,
            0,
            "",
            "篇幅",
            f"{chars} 字（去空白粗计）",
            "单元剧约 1–5 万字；试读可短于正式篇",
        )
    )


def scan_meta(path: Path, report: Report) -> None:
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as e:
        report.findings.append(Finding("BLOCK", path, 0, "", "IO", str(e), "无法读取"))
        return
    for i, line in enumerate(text.splitlines(), 1):
        scan_patterns(path, i, line, META_BLOCK, "BLOCK", report, respect_negation=True)


def format_report(report: Report) -> str:
    out: List[str] = []
    out.append("=== 山河异闻 · 故事生成后自检 ===")
    out.append(f"扫描文件: {len(report.files)}")
    for p in report.files:
        out.append(f"  - {p}")
    out.append("")

    def dump(title: str, items: List[Finding]) -> None:
        out.append(f"## {title} ({len(items)})")
        if not items:
            out.append("  （无）")
            out.append("")
            return
        for f in items:
            loc = f"{f.path}:{f.line_no}" if f.line_no else str(f.path)
            snippet = f.line.strip()
            if len(snippet) > 100:
                snippet = snippet[:100] + "…"
            out.append(f"  [{f.tag}] {loc}")
            out.append(f"    命中: {f.matched}")
            if snippet:
                out.append(f"    原文: {snippet}")
            out.append(f"    建议: {f.advice}")
        out.append("")

    dump("阻断 BLOCK", report.blocks)
    dump("警告 WARN", report.warns)
    dump("提示 INFO", report.infos)

    if report.blocks:
        out.append("结论: FAIL — 存在阻断级问题，请修复后再交稿。")
    elif report.warns:
        out.append("结论: PASS_WITH_WARN — 无阻断项，警告需人工确认。")
    else:
        out.append("结论: PASS — 词表与重复句检查未发现阻断问题。")
    out.append("")
    out.append("另须人工完成：20_故事创作规范「交稿检查」+ 声纹遮名辨认 + 怪谈双解。")
    return "\n".join(out)


def main(argv: Sequence[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="山河异闻故事生成后自检")
    ap.add_argument("path", help="正文.md 或故事目录")
    ap.add_argument(
        "--meta",
        action="store_true",
        help="连同设定文档做硬错位泄漏检查（否定句自动跳过）",
    )
    ap.add_argument("--strict", action="store_true", help="WARN 也导致退出码 1")
    ap.add_argument("--json", action="store_true", help="JSON 输出")
    args = ap.parse_args(argv)

    path = Path(args.path)
    if not path.exists():
        print(f"路径不存在: {path}", file=sys.stderr)
        return 2

    report = Report()
    targets = iter_targets(path, include_meta=args.meta)
    if path.is_file():
        targets = [path]
    if not targets:
        print(f"未找到正文.md: {path}", file=sys.stderr)
        return 2

    report.files = targets
    for t in targets:
        if is_body_file(t) and not is_version_file(t):
            scan_body(t, report)
        elif args.meta and is_meta_file(t):
            scan_meta(t, report)
        elif is_version_file(t):
            # 明确传入 versions 文件时仅 INFO
            check_versions_info(t.parent, report)

    root = path if path.is_dir() else path.parent
    check_versions_info(root, report)

    if args.json:
        print(
            json.dumps(
                [
                    {
                        "level": f.level,
                        "path": str(f.path),
                        "line": f.line_no,
                        "tag": f.tag,
                        "matched": f.matched,
                        "advice": f.advice,
                        "text": f.line,
                    }
                    for f in report.findings
                ],
                ensure_ascii=False,
                indent=2,
            )
        )
    else:
        print(format_report(report))

    if report.blocks:
        return 1
    if args.strict and report.warns:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
