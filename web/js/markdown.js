/* 山河异闻 · Markdown 轻渲染 */
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}


function labelMetaKey(key) {
  const map = {
    title: "题",
    标题: "题",
    group_name: "地脉",
    地脉: "地脉",
    scent: "气味",
    气味: "气味",
    people: "人物",
    人物: "人物",
    era_feel: "时代",
    时代: "时代",
    史料: "史料",
    factions: "势力"
  };
  return map[key] || map[key.toLowerCase()] || key;
}

function stripBrackets(val) {
  return String(val)
    .replace(/^\[|\]$/g, "")
    .replace(/[\[\]]/g, "")
    .replace(/,\s*/g, " · ")
    .trim();
}

function markdownToHtml(markdown) {
  const lines = String(markdown).replace(/\r/g, "").split("\n");
  let html = "";
  let inCode = false;
  let code = [];
  let inList = false;
  let table = [];
  let front = [];
  let inFront = false;
  let started = false;

  const flushTable = () => {
    if (!table.length) return;
    html += `<div class="md-table">${escapeHtml(table.join("\n"))}</div>`;
    table = [];
  };
  const closeList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };
  const flushFront = () => {
    if (!front.length) return;
    // 解析 YAML 式 frontmatter，只展示读者向字段；隐藏 path / Version / id 等工程键
    const map = {};
    for (const line of front) {
      const m = line.match(/^([A-Za-z_一-鿿]+)\s*[:：]\s*(.*)$/);
      if (m) map[m[1].trim()] = m[2].trim();
    }
    const hide = /^(version|id|path|legacy_id|group|genre|links|status|title|标题|更新时间)$/i;
    const prefer = ["group_name", "地脉", "scent", "气味", "people", "人物", "factions", "势力", "era_feel", "时代", "史料"];
    const chips = [];
    const used = new Set();
    for (const key of prefer) {
      const found = Object.keys(map).find(k => k.toLowerCase() === key.toLowerCase() || k === key);
      if (found && map[found] && !hide.test(found)) {
        chips.push(`<span class="meta-chip"><i>${escapeHtml(labelMetaKey(found))}</i>${escapeHtml(stripBrackets(map[found]))}</span>`);
        used.add(found);
      }
    }
    // 若有 scent/people 等未命中 prefer 的中文键，补充若干
    for (const [k, v] of Object.entries(map)) {
      if (used.has(k) || hide.test(k) || !v) continue;
      if (/title|group_name|scent|people|era|史料|气味|人物|标题/.test(k)) {
        chips.push(`<span class="meta-chip"><i>${escapeHtml(labelMetaKey(k))}</i>${escapeHtml(stripBrackets(v))}</span>`);
      }
    }
    if (chips.length) {
      html += `<div class="reader-meta">${chips.join("")}</div>`;
    }
    // 默认不展示原始 YAML 块
    front = [];
  };

  for (const raw of lines) {
    if (!started && raw.trim() === "---") {
      if (!inFront) {
        inFront = true;
        continue;
      }
      inFront = false;
      flushFront();
      started = true;
      continue;
    }
    if (inFront) {
      front.push(raw);
      continue;
    }
    started = true;

    if (raw.startsWith("```")) {
      flushTable();
      closeList();
      if (inCode) {
        html += `<pre>${escapeHtml(code.join("\n"))}</pre>`;
        code = [];
        inCode = false;
      } else {
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      code.push(raw);
      continue;
    }
    if (/^\|.*\|$/.test(raw)) {
      closeList();
      table.push(raw);
      continue;
    }
    flushTable();
    if (!raw.trim()) {
      closeList();
      continue;
    }
    const heading = raw.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      closeList();
      const level = heading[1].length;
      html += `<h${level} class="md-h${level}">${inlineMd(heading[2])}</h${level}>`;
      continue;
    }
    if (raw.startsWith(">")) {
      closeList();
      html += `<blockquote>${inlineMd(raw.replace(/^>\s?/, ""))}</blockquote>`;
      continue;
    }
    if (/^[-*]\s+/.test(raw)) {
      if (!inList) {
        html += "<ul>";
        inList = true;
      }
      html += `<li>${inlineMd(raw.replace(/^[-*]\s+/, ""))}</li>`;
      continue;
    }
    if (/^---+$/.test(raw)) {
      closeList();
      html += "<hr>";
      continue;
    }
    html += `<p>${inlineMd(raw)}</p>`;
  }
  flushTable();
  closeList();
  flushFront();
  if (inCode) html += `<pre>${escapeHtml(code.join("\n"))}</pre>`;
  return html || `<p class="empty">此篇尚无正文。</p>`;
}

function inlineMd(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

export { escapeHtml, labelMetaKey, stripBrackets, markdownToHtml, inlineMd };
