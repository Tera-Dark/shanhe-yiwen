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
    html += renderMdTable(table);
    table = [];
  };
  const closeList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
    }
  };
  const flushFront = () => {
    // frontmatter 只作工程字段：剥离，不进阅读区（审印/标题在 chrome）
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

/** 解析 GFM 管道表：| a | b | / |---|---| / | c | d | */
function splitTableRow(line) {
  let s = String(line).trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|")) s = s.slice(0, -1);
  return s.split("|").map(c => c.trim());
}

function isSeparatorRow(cells) {
  if (!cells.length) return false;
  return cells.every(c => /^:?-{1,}:?$/.test(c.replace(/\s/g, "")));
}

function renderMdTable(rows) {
  if (!rows.length) return "";
  const parsed = rows.map(splitTableRow);
  let head = null;
  let bodyStart = 0;
  if (parsed.length >= 2 && isSeparatorRow(parsed[1])) {
    head = parsed[0];
    bodyStart = 2;
  } else if (parsed.length >= 1 && isSeparatorRow(parsed[0])) {
    bodyStart = 1;
  }
  const body = parsed.slice(bodyStart).filter(r => r.length && !isSeparatorRow(r));
  if (!head && !body.length) {
    return `<div class="md-table">${escapeHtml(rows.join("\n"))}</div>`;
  }
  let out = '<div class="md-table-wrap"><table class="md-table">';
  if (head) {
    out += "<thead><tr>";
    for (const c of head) out += `<th>${inlineMd(c)}</th>`;
    out += "</tr></thead>";
  }
  if (body.length) {
    out += "<tbody>";
    for (const row of body) {
      out += "<tr>";
      for (const c of row) out += `<td>${inlineMd(c)}</td>`;
      out += "</tr>";
    }
    out += "</tbody>";
  }
  out += "</table></div>";
  return out;
}

export { escapeHtml, labelMetaKey, stripBrackets, markdownToHtml, inlineMd, renderMdTable };
