/* 山河异闻 · 地脉浏览台
 * 入世 / 地脉 / 体例 / 卷宗 / 时序 + 沉浸阅读（顶栏切换，无侧栏）
 */

const GENRE = {
  Z: "主纪", P: "旁纪", C: "残章", Q: "奇遇",
  Y: "探游", W: "传闻", R: "人物折", G: "规矩帖", X: "意象志"
};

const GENRE_ORDER = ["Z", "P", "C", "Q", "Y", "W", "R", "G", "X"];

const ARCHIVE_SECTIONS = [
  {
    id: "principles",
    title: "创作原则",
    docs: [
      ["docs/原则/宪法.md", "创作宪法", "十二条最高准则"],
      ["docs/原则/00_创作理念.md", "创作理念", "气质与奇幻原则"],
      ["docs/原则/20_故事创作规范.md", "故事创作规范", "从设定到交稿"],
      ["docs/原则/21_故事审查标准.md", "故事审查标准", "R0–R3 与形态卡"],
      ["docs/原则/22_内容体例与江湖勾勒.md", "内容体例", "主纪旁纪探游等"],
      ["docs/原则/23_内容分组与浏览分类.md", "内容分组", "地脉组与过滤器"]
    ]
  },
  {
    id: "world",
    title: "世界与历史",
    docs: [
      ["docs/世界/01_世界底层规则.md", "世界底层规则", "边界与不可验证"],
      ["docs/世界/02_时代与历史.md", "时代与历史", "嘉靖—崇祯"],
      ["docs/世界/04_玄幻志异规则.md", "玄幻志异规则", "执念与怪谈边界"],
      ["docs/世界/10_天启大爆炸专设.md", "王恭厂专设", "资料分层"],
      ["docs/世界/17_世界年表.md", "世界年表", "年号坐标"],
      ["docs/世界/SOURCES.md", "史料与来源", "A/B/C/D 登记"]
    ]
  },
  {
    id: "society",
    title: "人物社会",
    docs: [
      ["docs/社会/03_江湖生态.md", "江湖生态", "饭碗先于刀剑"],
      ["docs/社会/05_人物群像库.md", "人物群像库", "普通人与江湖人"],
      ["docs/社会/06_职业设定集.md", "职业设定集", "朝廷市井江湖"],
      ["docs/社会/07_组织势力.md", "组织势力", "局帮线与结社"],
      ["docs/社会/08_诸地风土志.md", "诸地风土志", "地域框架"],
      ["docs/社会/15_民俗文化设定.md", "民俗文化", "节气婚丧"],
      ["docs/社会/18_民间俗语与黑话.md", "俗语与黑话", "行话忌讳"]
    ]
  },
  {
    id: "material",
    title: "素材与管理",
    docs: [
      ["docs/素材/09_怪谈异闻录.md", "怪谈异闻录", "种子与使用状态"],
      ["docs/管理/11_单元剧目录.md", "内容总目", "编号与立项"],
      ["docs/管理/12_时间线.md", "故事时间线", "入故事坐标"],
      ["docs/管理/13_伏笔回收.md", "伏笔回收表", "埋入与回收"],
      ["docs/素材/19_伏笔与未解之谜.md", "未解之谜", "七个核心谜团"],
      ["stories/README.md", "故事目录规范", "工程与交稿"]
    ]
  }
];

const ERAS = [
  ["嘉靖", "1522—1566", "世宗朝。北虏南倭，世情渐紧。"],
  ["隆庆", "1567—1572", "短祚。边市稍开。"],
  ["万历", "1573—1620", "久安之后，百弊丛生。"],
  ["泰昌", "1620", "一月而崩，话本最爱。"],
  ["天启", "1621—1627", "厂卫与王恭厂灾。"],
  ["崇祯", "1628—1644", "末世气象，不宜轻易写穿。"]
];

const MYSTERIES = [
  ["001", "执念到底存不存在？", "无法重复验证，却在不同地方留下相似描述。"],
  ["002", "王恭厂灾的真正原因", "历史记录、转述与后世猜测不得合并为唯一答案。"],
  ["003", "卖梦的人是谁", "没人记得其面貌，也不确定是一人还是一群人。"],
  ["004", "戏班从哪来", "每消失一次，戏班人数似乎就少一个。"],
  ["005", "那些“不对”的人", "仵作、小二、桥头女人与每日走同一路的老人。"],
  ["006", "普陀山的两个和尚", "允许在不同文本里留下互相矛盾的说法。"],
  ["007", "壁画里的人", "画中人物、见证者与时间关系保持不明。"]
];

const state = {
  catalog: null,
  projectFiles: [],
  view: "home",
  groupId: null,
  genreId: "all",
  era: "嘉靖",
  reader: {
    open: false,
    kind: null,
    id: null,
    path: null,
    list: [],
    index: -1
  }
};

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function genreLabel(code) {
  return GENRE[code] || code || "未分";
}

function statusClass(status) {
  if (!status) return "";
  if (/通过|正式|成稿/.test(status)) return "ok";
  return "";
}

function groupById(id) {
  return state.catalog?.groups?.find(g => g.id === id) || null;
}

function entryById(id) {
  return state.catalog?.entries?.find(e => e.id === id) || null;
}

function entriesOfGroup(groupId) {
  return (state.catalog?.entries || []).filter(e => e.group === groupId);
}

function entriesOfGenre(genreId) {
  const all = state.catalog?.entries || [];
  if (!genreId || genreId === "all") return all;
  return all.filter(e => e.genre === genreId);
}

function formalEntries() {
  return (state.catalog?.entries || []).filter(e => e.status && !/种子/.test(e.status));
}

/* ---------- Markdown ---------- */

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
    html += `<div class="reader-frontmatter">${front.map(l => escapeHtml(l)).join("<br>")}</div>`;
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

/* ---------- Rendering helpers ---------- */

function renderEntryRow(entry) {
  const g = groupById(entry.group);
  const scents = (entry.scent || []).join(" · ");
  const people = (entry.people || []).slice(0, 3).join("、");
  const badgeCls = statusClass(entry.status);
  return `
    <button type="button" class="entry-row" data-open-entry="${escapeHtml(entry.id)}">
      <span class="id">${escapeHtml(entry.id)}</span>
      <span class="genre">${escapeHtml(genreLabel(entry.genre))}</span>
      <span class="title-block">
        <b>${escapeHtml(entry.title)}</b>
        <small>${escapeHtml([g?.name, scents, people].filter(Boolean).join(" · "))}</small>
      </span>
      <span class="badge ${badgeCls}">${escapeHtml(entry.status || "—")}</span>
    </button>`;
}

function renderGroupCard(group) {
  const count = entriesOfGroup(group.id).length;
  const formal = entriesOfGroup(group.id).filter(e => !/种子/.test(e.status || "")).length;
  const kernels = (group.kernel || []).slice(0, 6)
    .map(k => `<span>${escapeHtml(k)}</span>`).join("");
  return `
    <button type="button" class="group-card" data-open-group="${escapeHtml(group.id)}">
      <span class="tag">${escapeHtml(group.status || "地脉")}</span>
      <h3>${escapeHtml(group.name)}</h3>
      <p>${escapeHtml(group.summary || "")}</p>
      <div class="kernel">${kernels}</div>
      <div class="meta-line">
        <span>${formal} 篇成稿 · ${count} 条收录</span>
        <span>入线 →</span>
      </div>
    </button>`;
}

/* ---------- Views ---------- */

function renderHome() {
  const groups = state.catalog?.groups || [];
  const entries = state.catalog?.entries || [];
  const formal = formalEntries();
  const seeds = entries.filter(e => /种子/.test(e.status || ""));
  const people = new Set(entries.flatMap(e => e.people || []));

  const recent = [...entries]
    .filter(e => !/种子/.test(e.status || ""))
    .slice()
    .reverse()
    .slice(0, 6);

  $("#mainView").innerHTML = `
    <section class="hero">
      <div>
        <p class="kicker">PROJECT SHANHE · 入世</p>
        <h1 class="hero-quote">世界大于主角，<em>人物大于设定</em>。</h1>
        <p class="hero-note">轻玄幻武侠的小架空江湖。以地脉为架，以体例为笔——探游、奇遇、旁纪、规矩帖，把路走通，把人立住。</p>
      </div>
      <aside class="hero-side">
        <h3>今日可走</h3>
        <p>从<strong>河东线</strong>入：雨后的官道、青驿镖旗、缺脸土地。桥头震后另有一碗面，余震未歇。</p>
        <div class="axis-row">
          <i></i><span>地脉组为主架 · 体例 / 气味 / 人物为滤</span>
        </div>
      </aside>
    </section>

    <div class="metric-row">
      <button type="button" class="metric" data-nav="groups">
        <strong>${groups.length}</strong>
        <span>地脉组</span>
        <small>河东 · 桥头</small>
      </button>
      <button type="button" class="metric" data-nav="genres">
        <strong>${formal.length}</strong>
        <span>成稿篇目</span>
        <small>另有种子 ${seeds.length}</small>
      </button>
      <button type="button" class="metric" data-nav="archives">
        <strong>${state.projectFiles.length || "—"}</strong>
        <span>卷宗文档</span>
        <small>设定与规范</small>
      </button>
      <button type="button" class="metric" data-open-entry="Y001">
        <strong>${people.size || "—"}</strong>
        <span>挂靠人物</span>
        <small>先饭碗后刀剑</small>
      </button>
    </div>

    <div class="section-head">
      <h2>地脉</h2>
      <span>按线走，不按主角编年</span>
    </div>
    <div class="group-grid">
      ${groups.map(renderGroupCard).join("") || `<p class="empty">尚无地脉组。请检查 stories/catalog.json</p>`}
    </div>

    <div class="section-head">
      <h2>新近成稿</h2>
      <span>可直接入读</span>
    </div>
    <div class="entry-list">
      ${recent.map(renderEntryRow).join("") || `<p class="empty">尚无成稿。</p>`}
    </div>
  `;
}

function renderGroups() {
  const groups = state.catalog?.groups || [];
  if (state.groupId) {
    const g = groupById(state.groupId);
    if (!g) {
      state.groupId = null;
      return renderGroups();
    }
    const list = entriesOfGroup(g.id);
    const formal = list.filter(e => !/种子/.test(e.status || ""));
    const seeds = list.filter(e => /种子/.test(e.status || ""));
    $("#mainView").innerHTML = `
      <p class="kicker">地脉 · ${escapeHtml(g.id)}</p>
      <h1 class="page-title">${escapeHtml(g.name)}</h1>
      <p class="lead">${escapeHtml(g.summary || "")}</p>
      <div class="filter-row">
        <button type="button" class="chip" data-open-group="">← 全部地脉</button>
        <span class="chip is-active">${escapeHtml(g.status || "")}</span>
        <span class="chip">${formal.length} 成稿</span>
        <span class="chip">${seeds.length} 种子</span>
      </div>
      <div class="kernel" style="margin:1rem 0 1.5rem">
        ${(g.kernel || []).map(k => `<span>${escapeHtml(k)}</span>`).join("")}
      </div>
      <div class="section-head"><h2>线内篇目</h2><span>${list.length} 条</span></div>
      <div class="entry-list">
        ${list.map(renderEntryRow).join("") || `<p class="empty">此线尚无收录。</p>`}
      </div>
    `;
    return;
  }

  $("#mainView").innerHTML = `
    <p class="kicker">地脉组</p>
    <h1 class="page-title">沿路走，不追主角</h1>
    <p class="lead">一级分类是地脉：同一条路、同一处余波、同一套饭碗与规矩。体例、气味、人物只作滤镜。</p>
    <div class="group-grid">
      ${groups.map(renderGroupCard).join("")}
    </div>
  `;
}

function renderGenres() {
  const counts = Object.fromEntries(GENRE_ORDER.map(c => [c, 0]));
  for (const e of state.catalog?.entries || []) {
    if (counts[e.genre] != null) counts[e.genre]++;
  }
  const list = entriesOfGenre(state.genreId);
  const chips = [
    `<button type="button" class="chip ${state.genreId === "all" ? "is-active" : ""}" data-genre="all">全部 · ${(state.catalog?.entries || []).length}</button>`,
    ...GENRE_ORDER.map(c =>
      `<button type="button" class="chip ${state.genreId === c ? "is-active" : ""}" data-genre="${c}">${genreLabel(c)} · ${counts[c]}</button>`
    )
  ].join("");

  $("#mainView").innerHTML = `
    <p class="kicker">体例</p>
    <h1 class="page-title">九种笔墨，一种江湖</h1>
    <p class="lead">主纪、旁纪、残章、奇遇、探游、传闻、人物折、规矩帖、意象志——勾勒而非百科。</p>
    <div class="filter-row">${chips}</div>
    <div class="section-head">
      <h2>${state.genreId === "all" ? "全部篇目" : genreLabel(state.genreId)}</h2>
      <span>${list.length} 条</span>
    </div>
    <div class="entry-list">
      ${list.map(renderEntryRow).join("") || `<p class="empty">此体例尚无收录。</p>`}
    </div>
  `;
}

function renderArchives() {
  $("#mainView").innerHTML = `
    <p class="kicker">卷宗</p>
    <h1 class="page-title">设定与规范</h1>
    <p class="lead">冲突时以宪法与高优先级文档为准。卷宗只读，不在此改稿。</p>
    ${ARCHIVE_SECTIONS.map(sec => `
      <div class="section-head"><h2>${escapeHtml(sec.title)}</h2><span>${sec.docs.length} 份</span></div>
      <div class="archive-grid">
        ${sec.docs.map(d => `
          <button type="button" class="archive-card" data-open-doc="${escapeHtml(d[0])}">
            <b>${escapeHtml(d[1])}</b>
            <span>${escapeHtml(d[2])}</span>
          </button>
        `).join("")}
      </div>
    `).join("")}
  `;
}

function renderTime() {
  $("#mainView").innerHTML = `
    <p class="kicker">时序</p>
    <h1 class="page-title">嘉靖—崇祯</h1>
    <p class="lead">年号是坐标，不是关卡。故事挂靠时代，不替历史做唯一解释。</p>
    <div class="time-strip">
      ${ERAS.map(([name, years]) => `
        <button type="button" class="time-chip ${state.era === name ? "is-active" : ""}" data-era="${escapeHtml(name)}">
          <b>${escapeHtml(name)}</b>
          <small>${escapeHtml(years)}</small>
        </button>
      `).join("")}
    </div>
    <div class="section-head"><h2>${escapeHtml(state.era)}</h2><span>气氛</span></div>
    <div class="record-card">
      <span>ERA</span>
      <h3>${escapeHtml(state.era)} · ${escapeHtml(ERAS.find(e => e[0] === state.era)?.[1] || "")}</h3>
      <p>${escapeHtml(ERAS.find(e => e[0] === state.era)?.[2] || "")}</p>
    </div>
    <div class="section-head"><h2>未解之谜</h2><span>长期不解，不急于揭</span></div>
    <div class="entry-list">
      ${MYSTERIES.map(m => `
        <button type="button" class="entry-row" data-open-doc="docs/素材/19_伏笔与未解之谜.md">
          <span class="id">${escapeHtml(m[0])}</span>
          <span class="genre">谜</span>
          <span class="title-block">
            <b>${escapeHtml(m[1])}</b>
            <small>${escapeHtml(m[2])}</small>
          </span>
          <span class="badge">待考</span>
        </button>
      `).join("")}
    </div>
  `;
}

function setNavActive(view) {
  $$(".nav-item").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.nav === view);
  });
}

function renderView() {
  setNavActive(state.view);
  if (state.view === "home") renderHome();
  else if (state.view === "groups") renderGroups();
  else if (state.view === "genres") renderGenres();
  else if (state.view === "archives") renderArchives();
  else if (state.view === "time") renderTime();
  else renderHome();
  $("#statusLeft").textContent = statusLeftText();
}

function statusLeftText() {
  if (state.view === "groups" && state.groupId) {
    const g = groupById(state.groupId);
    return g ? `地脉 · ${g.name}` : "地脉";
  }
  const map = {
    home: "世界大于主角，人物大于设定。",
    groups: "沿地脉走，不追主角编年。",
    genres: "九种体例，勾勒江湖。",
    archives: "卷宗只读 · 宪法优先。",
    time: "年号是坐标，不是关卡。"
  };
  return map[state.view] || map.home;
}

/* ---------- Reader (immersive, top bar) ---------- */

function buildListFromContext() {
  if (state.view === "groups" && state.groupId) {
    return entriesOfGroup(state.groupId).map(entryToNav);
  }
  if (state.view === "genres") {
    return entriesOfGenre(state.genreId).map(entryToNav);
  }
  return (state.catalog?.entries || []).map(entryToNav);
}

function entryToNav(e) {
  const g = groupById(e.group);
  return {
    kind: "entry",
    id: e.id,
    path: e.path,
    title: e.title,
    kicker: `${e.id} · ${genreLabel(e.genre)}${g ? " · " + g.name : ""}`
  };
}

function docToNav(path, title) {
  return {
    kind: "doc",
    id: path,
    path,
    title: title || path.split("/").pop().replace(/\.md$/i, ""),
    kicker: "卷宗"
  };
}

function openReaderWithList(item, list) {
  const navList = list && list.length ? list : [item];
  let index = navList.findIndex(x => x.kind === item.kind && x.id === item.id);
  if (index < 0) {
    navList.unshift(item);
    index = 0;
  }
  state.reader = {
    open: true,
    kind: item.kind,
    id: item.id,
    path: item.path,
    list: navList,
    index
  };
  applyReaderChrome();
  loadReaderBody();
  showReader(true);
}

function showReader(show) {
  const shell = $("#appShell");
  const reader = $("#reader");
  if (show) {
    reader.hidden = false;
    reader.setAttribute("aria-hidden", "false");
    shell.style.display = "none";
    document.body.classList.add("is-reading");
  } else {
    reader.hidden = true;
    reader.setAttribute("aria-hidden", "true");
    shell.style.display = "";
    document.body.classList.remove("is-reading");
    state.reader.open = false;
  }
}

function applyReaderChrome() {
  const r = state.reader;
  const item = r.list[r.index];
  if (!item) return;

  $("#readerKicker").textContent = item.kicker || "";
  $("#readerTitle").textContent = item.title || "";
  $("#readerPath").textContent = item.path || "";

  const prev = $("#readerPrev");
  const next = $("#readerNext");
  prev.disabled = r.index <= 0;
  next.disabled = r.index >= r.list.length - 1;

  const sub = $("#readerSubnav");
  if (item.kind === "entry") {
    const entry = entryById(item.id);
    const peers = entry ? entriesOfGroup(entry.group) : [];
    if (peers.length > 1) {
      sub.hidden = false;
      sub.innerHTML = peers.map(e =>
        `<button type="button" class="${e.id === item.id ? "is-active" : ""}" data-sub-entry="${escapeHtml(e.id)}">${escapeHtml(e.id)} ${escapeHtml(e.title)}</button>`
      ).join("");
    } else {
      sub.hidden = true;
      sub.innerHTML = "";
    }
  } else {
    sub.hidden = true;
    sub.innerHTML = "";
  }

  const linksEl = $("#readerLinks");
  if (item.kind === "entry") {
    const entry = entryById(item.id);
    const links = (entry?.links || []).map(id => entryById(id)).filter(Boolean);
    if (links.length) {
      linksEl.innerHTML = links.map(e =>
        `<button type="button" data-open-entry="${escapeHtml(e.id)}">另见 ${escapeHtml(e.id)} · ${escapeHtml(e.title)}</button>`
      ).join("");
    } else {
      linksEl.innerHTML = "";
    }
  } else {
    linksEl.innerHTML = "";
  }
}

async function loadReaderBody() {
  const r = state.reader;
  const item = r.list[r.index];
  const body = $("#readerBody");
  if (!item?.path) {
    body.innerHTML = `<div class="reader-inner"><p class="empty">无路径可读取。</p></div>`;
    return;
  }
  body.innerHTML = `<div class="reader-inner"><p class="empty">正在取卷……</p></div>`;
  try {
    const response = await fetch(`/project/${encodeURI(item.path)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("not found");
    const text = await response.text();
    body.innerHTML = `<div class="reader-inner">${markdownToHtml(text)}</div>`;
    body.scrollTop = 0;
  } catch {
    body.innerHTML = `<div class="reader-inner">
      <h2 class="md-h2">无法读取</h2>
      <p>请通过仓库根目录「启动世界观网页.bat」打开本地服务。file:// 无法读取 Markdown。</p>
      <pre>${escapeHtml(item.path)}</pre>
    </div>`;
  }
}

function readerGo(delta) {
  const r = state.reader;
  const next = r.index + delta;
  if (next < 0 || next >= r.list.length) return;
  r.index = next;
  const item = r.list[next];
  r.kind = item.kind;
  r.id = item.id;
  r.path = item.path;
  applyReaderChrome();
  loadReaderBody();
}

function closeReader() {
  showReader(false);
  renderView();
}

function openEntry(id, listOverride) {
  const entry = entryById(id);
  if (!entry) {
    $("#statusRight").textContent = `未找到 ${id}`;
    return;
  }
  const item = entryToNav(entry);
  let list = listOverride;
  if (!list) {
    list = entriesOfGroup(entry.group).map(entryToNav);
    if (list.length < 2) list = buildListFromContext();
  }
  openReaderWithList(item, list);
}

function openDoc(path) {
  const live = state.projectFiles.find(f => f.path === path);
  const title = live?.title || path.split("/").pop().replace(/\.md$/i, "");
  const item = docToNav(path, title);
  let list = null;
  for (const sec of ARCHIVE_SECTIONS) {
    if (sec.docs.some(d => d[0] === path)) {
      list = sec.docs.map(d => docToNav(d[0], d[1]));
      break;
    }
  }
  openReaderWithList(item, list || [item]);
}

/* ---------- Search ---------- */

function allSearchItems() {
  const items = [];
  for (const g of state.catalog?.groups || []) {
    items.push({
      title: g.name,
      meta: `地脉 · ${g.status || ""}`,
      text: `${g.name} ${g.summary || ""} ${(g.kernel || []).join(" ")}`,
      action: { type: "group", id: g.id }
    });
  }
  for (const e of state.catalog?.entries || []) {
    items.push({
      title: e.title,
      meta: `${e.id} · ${genreLabel(e.genre)} · ${e.status || ""}`,
      text: `${e.title} ${(e.people || []).join(" ")} ${(e.scent || []).join(" ")} ${(e.factions || []).join(" ")}`,
      action: { type: "entry", id: e.id }
    });
  }
  for (const sec of ARCHIVE_SECTIONS) {
    for (const d of sec.docs) {
      const live = state.projectFiles.find(f => f.path === d[0]);
      items.push({
        title: d[1],
        meta: `卷宗 · ${d[0]}`,
        text: `${d[1]} ${d[2]} ${live?.searchText || ""}`,
        action: { type: "doc", path: d[0] }
      });
    }
  }
  for (const f of state.projectFiles) {
    if (items.some(i => i.action?.path === f.path)) continue;
    if (f.path.startsWith("stories/")) continue;
    items.push({
      title: f.title,
      meta: `文档 · ${f.path}`,
      text: `${f.title} ${f.path} ${f.searchText || ""}`,
      action: { type: "doc", path: f.path }
    });
  }
  return items;
}

function renderSearch(query = "") {
  const q = query.trim().toLowerCase();
  const items = allSearchItems()
    .filter(i => !q || `${i.title} ${i.meta} ${i.text}`.toLowerCase().includes(q))
    .slice(0, 16);
  $("#searchResults").innerHTML = items.length
    ? items.map(i => {
        const attrs =
          i.action.type === "entry" ? `data-open-entry="${escapeHtml(i.action.id)}"` :
          i.action.type === "group" ? `data-open-group="${escapeHtml(i.action.id)}"` :
          `data-open-doc="${escapeHtml(i.action.path)}"`;
        return `<button type="button" class="search-result" ${attrs}><b>${escapeHtml(i.title)}</b><small>${escapeHtml(i.meta)}</small></button>`;
      }).join("")
    : `<div class="search-result"><b>未找到相合</b><small>换个词再寻</small></div>`;
}

function openSearch() {
  $("#searchLayer").hidden = false;
  $("#searchInput").value = "";
  renderSearch();
  setTimeout(() => $("#searchInput").focus(), 20);
}

function closeSearch() {
  $("#searchLayer").hidden = true;
}

/* ---------- Navigation ---------- */

function goView(view, opts = {}) {
  state.view = view;
  if (view === "groups") {
    if (opts.groupId !== undefined) state.groupId = opts.groupId;
  }
  if (view === "genres" && opts.genreId !== undefined) {
    state.genreId = opts.genreId;
  }
  if (state.reader.open) showReader(false);
  renderView();
  window.scrollTo(0, 0);
}

/* ---------- Bootstrap ---------- */

async function loadCatalog() {
  try {
    const res = await fetch("/stories/catalog.json", { cache: "no-store" });
    if (!res.ok) throw new Error("catalog");
    state.catalog = await res.json();
    return true;
  } catch {
    state.catalog = { groups: [], entries: [] };
    return false;
  }
}

async function connectProject() {
  try {
    const res = await fetch("/__project-index", { cache: "no-store" });
    if (!res.ok) throw new Error();
    const data = await res.json();
    state.projectFiles = data.files || [];
    const n = state.catalog?.entries?.length || 0;
    const g = state.catalog?.groups?.length || 0;
    $("#statusRight").textContent = `已连接 · ${g} 地脉 · ${n} 篇 · ${state.projectFiles.length} 卷`;
  } catch {
    $("#statusRight").textContent = "静态预览 · 请用 BAT 启动以读正文";
  }
}

function bindEvents() {
  document.addEventListener("click", event => {
    const nav = event.target.closest("[data-nav]");
    if (nav) {
      event.preventDefault();
      const v = nav.dataset.nav;
      if (v === "home") goView("home");
      else if (v === "groups") {
        state.groupId = null;
        goView("groups");
      } else if (v === "genres") goView("genres");
      else if (v === "archives") goView("archives");
      else if (v === "time") goView("time");
      return;
    }

    const group = event.target.closest("[data-open-group]");
    if (group) {
      closeSearch();
      const id = group.dataset.openGroup;
      state.groupId = id || null;
      goView("groups");
      return;
    }

    const genre = event.target.closest("[data-genre]");
    if (genre) {
      state.genreId = genre.dataset.genre;
      goView("genres");
      return;
    }

    const era = event.target.closest("[data-era]");
    if (era) {
      state.era = era.dataset.era;
      renderView();
      return;
    }

    const sub = event.target.closest("[data-sub-entry]");
    if (sub) {
      openEntry(sub.dataset.subEntry, state.reader.list.filter(x => x.kind === "entry"));
      return;
    }

    const entry = event.target.closest("[data-open-entry]");
    if (entry) {
      closeSearch();
      openEntry(entry.dataset.openEntry);
      return;
    }

    const doc = event.target.closest("[data-open-doc]");
    if (doc) {
      closeSearch();
      openDoc(doc.dataset.openDoc);
      return;
    }
  });

  $("#readerBack").addEventListener("click", closeReader);
  $("#readerClose").addEventListener("click", closeReader);
  $("#readerHome").addEventListener("click", () => {
    closeReader();
    goView("home");
  });
  $("#readerPrev").addEventListener("click", () => readerGo(-1));
  $("#readerNext").addEventListener("click", () => readerGo(1));

  $("#btnSearch").addEventListener("click", openSearch);
  $("#searchClose").addEventListener("click", closeSearch);
  $("#searchInput").addEventListener("input", e => renderSearch(e.target.value));
  $("#searchLayer").addEventListener("click", e => {
    if (e.target === $("#searchLayer")) closeSearch();
  });

  document.addEventListener("keydown", event => {
    const tag = document.activeElement?.tagName || "";
    const typing = /INPUT|TEXTAREA/.test(tag);

    if (event.key === "Escape") {
      if (!$("#searchLayer").hidden) {
        closeSearch();
        return;
      }
      if (state.reader.open) {
        closeReader();
        return;
      }
    }

    if (!typing && event.key.toLowerCase() === "q") {
      event.preventDefault();
      if ($("#searchLayer").hidden) openSearch();
      else closeSearch();
      return;
    }

    if (state.reader.open && !typing) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        readerGo(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        readerGo(1);
      }
    }
  });
}

async function boot() {
  $("#mainView").innerHTML = `<p class="empty">入世中……</p>`;
  $("#statusRight").textContent = "连接中…";
  bindEvents();
  const ok = await loadCatalog();
  if (!ok) {
    $("#statusRight").textContent = "catalog 未加载 · 请用本地服务打开";
  }
  await connectProject();
  renderView();
}

boot();
