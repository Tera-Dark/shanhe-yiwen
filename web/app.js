/* 山河异闻 · 地脉浏览台
 * 入世 / 卷 / 审印 / 世界 / 卷宗 / 时序 + 沉浸阅读
 * ES modules：常量 ./js/constants.js · Markdown ./js/markdown.js
 */
import {
  GENRE,
  GENRE_ORDER,
  ROLE_LABEL,
  TRACK_LABEL,
  ARCHIVE_SECTIONS,
  ERAS,
  MYSTERIES,
  PROGRESS_KEY,
  GOLD_PAGE_SIZE,
  REVIEW_STAGES,
  WORLD_TABS,
  WORLD_KIND_TAB,
  WORLD_KIND_LABEL,
  PLACE_VERSE
} from "./js/constants.js";
import {
  escapeHtml,
  labelMetaKey,
  stripBrackets,
  markdownToHtml,
  inlineMd
} from "./js/markdown.js";

const state = {
  catalog: null,
  projectFiles: [],
  view: "home",
  groupId: null,
  genreId: "all",
  reviewStage: "all",
  worldTab: "shards",
  era: "嘉靖",
  goldPage: {},
  exploreFilter: "track:main",
  progress: loadProgress(),
  reader: {
    open: false,
    kind: null,
    id: null,
    path: null,
    list: [],
    index: -1,
    tocOpen: null
  }
};

const TOC_PREF_DESK = "shanhe.yiwen.reader.toc.desk";
const TOC_PREF_MOBILE = "shanhe.yiwen.reader.toc.mobile";
const TOC_PREF_LEGACY = "shanhe.yiwen.reader.toc";

function isReaderMobile() {
  return typeof matchMedia === "function" && matchMedia("(max-width: 860px)").matches;
}

function tocPrefKey() {
  return isReaderMobile() ? TOC_PREF_MOBILE : TOC_PREF_DESK;
}

function loadTocOpenPref() {
  try {
    const key = tocPrefKey();
    let saved = localStorage.getItem(key);
    if (saved === null) {
      const legacy = localStorage.getItem(TOC_PREF_LEGACY);
      if (legacy !== null) saved = legacy;
    }
    if (saved === null) return !isReaderMobile();
    return saved !== "0";
  } catch {
    return !isReaderMobile();
  }
}

function saveTocOpenPref(open) {
  try {
    localStorage.setItem(tocPrefKey(), open ? "1" : "0");
    localStorage.setItem(TOC_PREF_LEGACY, open ? "1" : "0");
  } catch { /* ignore */ }
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { read: {}, last: null };
    const data = JSON.parse(raw);
    return {
      read: data.read && typeof data.read === "object" ? data.read : {},
      last: data.last || null
    };
  } catch {
    return { read: {}, last: null };
  }
}

function saveProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(state.progress));
  } catch { /* ignore quota */ }
}

function markEntryRead(id) {
  if (!id) return;
  if (!state.progress) state.progress = { read: {}, last: null };
  state.progress.read[id] = Date.now();
  state.progress.last = id;
  saveProgress();
}

function isEntryRead(id) {
  return !!(state.progress?.read && state.progress.read[id]);
}

function lastReadOnPath(pathIds) {
  if (!pathIds?.length) return null;
  const last = state.progress?.last;
  if (last && pathIds.includes(last)) return last;
  // 找路径上最后一个已读
  let found = null;
  for (const id of pathIds) {
    if (isEntryRead(id)) found = id;
  }
  return found;
}

function continueEntryId(groupId) {
  const path = mainPathEntries(groupId).map(e => e.id);
  if (!path.length) return null;
  const last = lastReadOnPath(path);
  if (!last) return path[0];
  const i = path.indexOf(last);
  if (i < 0) return path[0];
  if (i >= path.length - 1) return path[path.length - 1];
  return path[i + 1];
}

/** 地脉 / 地标诗句（两行联，不写工程设定） */
function placeVerse(groupId) {
  return PLACE_VERSE[groupId] || null;
}

function verseHtml(couplet, cls = "place-verse") {
  if (!couplet || !couplet.length) return "";
  const lines = couplet.map(l => `<span class="pv-line">${escapeHtml(l)}</span>`).join("");
  return `<p class="${cls}">${lines}</p>`;
}

function renderPlaceVerses(groupId) {
  const v = placeVerse(groupId);
  if (!v?.places?.length) return "";
  return `
    <div class="place-grid" data-motion="stagger" aria-label="地标诗句">
      ${v.places.map(p => `
        <div class="place-card">
          <b class="place-name">${escapeHtml(p.name)}</b>
          ${verseHtml(p.couplet, "place-verse is-card")}
        </div>`).join("")}
    </div>`;
}

/* ---------- 案前设置（localStorage） ---------- */
const SETTINGS_KEY = "shanhe.yiwen.settings.v2";

const SETTINGS_DEFAULTS = {
  mode: "light",       // light | dark
  theme: "mistgold",   // mistgold | postroad | cinnabar | indigo | bamboo
  size: "medium",      // small | medium | large | xlarge · 默认适中更密
  font: "shoujin",     // shoujin | wenkai | mashan | xiaowei | serif | sans
  lh: "comfy",         // tight | comfy | loose
  readw: "mid",        // narrow | mid | wide
  rain: "on",          // on | off
  grain: "on",
  seal: "on"
};

/* ---------- 轻量网络 / 缓存 / 字体按需 ---------- */
const textCache = new Map(); // path -> markdown text
const FONT_SHEETS = {
  core: "https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=Noto+Serif+SC:wght@400;600&display=optional",
  wenkai: "https://fonts.googleapis.com/css2?family=LXGW+WenKai+TC:wght@400;700&display=optional",
  xiaowei: "https://fonts.googleapis.com/css2?family=ZCOOL+XiaoWei&display=optional",
  sans: "https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500&display=optional"
};
const loadedFontSheets = new Set();

function ensureFontSheet(key) {
  const href = FONT_SHEETS[key];
  if (!href || loadedFontSheets.has(key)) return;
  if (document.querySelector(`link[data-font-pack="${key}"]`)) {
    loadedFontSheets.add(key);
    return;
  }
  // 默认 core 已在 index.html 注入，无 data 属性时按 href 去重
  const existing = [...document.querySelectorAll('link[rel="stylesheet"]')].find(
    l => l.href && l.href.includes("fonts.googleapis.com") && l.href.includes(
      key === "core" ? "Ma+Shan" : key === "wenkai" ? "LXGW" : key === "xiaowei" ? "XiaoWei" : "Noto+Sans"
    )
  );
  if (existing) {
    existing.dataset.fontPack = key;
    loadedFontSheets.add(key);
    return;
  }
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.fontPack = key;
  document.head.appendChild(link);
  loadedFontSheets.add(key);
}

function ensureFontsFor(fontKey) {
  // 默认档已在 index 注入 core；其余按需
  if (fontKey === "wenkai") ensureFontSheet("wenkai");
  else if (fontKey === "xiaowei") ensureFontSheet("xiaowei");
  else if (fontKey === "sans") ensureFontSheet("sans");
  else if (fontKey === "serif" || fontKey === "mashan" || fontKey === "shoujin") {
    ensureFontSheet("core");
  }
}

function loadGsapIdle() {
  if (typeof window === "undefined") return;
  if (window.gsap || document.querySelector("script[data-gsap]")) return;
  const inject = () => {
    if (window.gsap || document.querySelector("script[data-gsap]")) return;
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/gsap@3.12.7/dist/gsap.min.js";
    s.async = true;
    s.dataset.gsap = "1";
    s.onerror = () => {
      /* 动效可选；motion 会走静态回退 */
    };
    document.head.appendChild(s);
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(inject, { timeout: 2500 });
  } else {
    setTimeout(inject, 400);
  }
}

/**
 * 带超时的 fetch；默认允许浏览器缓存（server 已给短 TTL）。
 * @param {string} url
 * @param {{ timeout?: number, cache?: RequestCache, signal?: AbortSignal }} [opts]
 */
async function fetchText(url, opts = {}) {
  const timeout = opts.timeout ?? 12000;
  const cache = opts.cache ?? "default";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  if (opts.signal) {
    if (opts.signal.aborted) ctrl.abort();
    else opts.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  try {
    const res = await fetch(url, { cache, signal: ctrl.signal });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url, opts = {}) {
  const timeout = opts.timeout ?? 12000;
  const cache = opts.cache ?? "default";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { cache, signal: ctrl.signal });
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

const SETTINGS_META = {
  mode: {
    title: "明暗",
    hint: "昼纸与夜驿。阅读器与驿亭一并切换。",
    options: [
      { value: "light", label: "昼纸", note: "浅底墨字" },
      { value: "dark", label: "夜驿", note: "深底金朱" }
    ]
  },
  theme: {
    title: "配色",
    hint: "在明暗之上换朱金气口。",
    options: [
      { value: "mistgold", label: "雾金", note: "燕云向默认", swatch: ["#8a7020", "#c9a227", "#ebe6dc"] },
      { value: "postroad", label: "雨后驿路", note: "朱金旧默认", swatch: ["#7a2824", "#7a5c12", "#efe6d6"] },
      { value: "cinnabar", label: "朱砂", note: "偏朱", swatch: ["#7a2018", "#b05040", "#f0e4d8"] },
      { value: "indigo", label: "青灰", note: "偏靛", swatch: ["#2c3a48", "#5a6e84", "#e8e4dc"] },
      { value: "bamboo", label: "竹青", note: "偏绿", swatch: ["#3a4a20", "#6a7e38", "#e8ecd8"] }
    ]
  },
  size: {
    title: "字号",
    hint: "界面与正文共用。推荐「偏大」。",
    options: [
      { value: "small", label: "偏小", note: "16px" },
      { value: "medium", label: "适中", note: "17.5px" },
      { value: "large", label: "偏大", note: "19px" },
      { value: "xlarge", label: "特大", note: "21px" }
    ]
  },
  font: {
    title: "字体",
    hint: "标题书法感 · 正文另配。默认「瘦金卷」：标题马善政（可选加载），正文系统宋/瘦金系，避免首屏跳字。",
    options: [
      { value: "shoujin", label: "瘦金卷", note: "默认 · 题书正瘦" },
      { value: "wenkai", label: "霞鹜文楷", note: "通篇文楷" },
      { value: "mashan", label: "马善政", note: "标题更书" },
      { value: "xiaowei", label: "站酷小薇", note: "旧默认" },
      { value: "serif", label: "思源宋", note: "通篇宋体" },
      { value: "sans", label: "思源黑", note: "通篇黑体" }
    ]
  },
  lh: {
    title: "行距",
    hint: "仅影响阅读器正文段落。",
    options: [
      { value: "tight", label: "紧", note: "1.75" },
      { value: "comfy", label: "适", note: "2.05" },
      { value: "loose", label: "疏", note: "2.25" }
    ]
  },
  readw: {
    title: "栏宽",
    hint: "阅读器正文最大宽度。",
    options: [
      { value: "narrow", label: "窄", note: "34 字宽感" },
      { value: "mid", label: "中", note: "默认" },
      { value: "wide", label: "宽", note: "大屏友好" }
    ]
  }
};

function loadSettings() {
  try {
    let raw = localStorage.getItem(SETTINGS_KEY);
    // 迁移：v1 无瘦金卷默认，若仅有 v1 则按新默认起，不强制覆盖用户已改项
    if (!raw) {
      const legacy = localStorage.getItem("shanhe.yiwen.settings.v1");
      if (legacy) {
        try {
          const old = JSON.parse(legacy);
          // 旧默认 xiaowei/large → 升到 shoujin/medium；用户改过的保留
          const migrated = { ...SETTINGS_DEFAULTS, ...old };
          if (old.font === "xiaowei" || !old.font) migrated.font = "shoujin";
          if (old.size === "large" || !old.size) migrated.size = "medium";
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(migrated));
          return migrated;
        } catch { /* fall through */ }
      }
      return { ...SETTINGS_DEFAULTS };
    }
    const parsed = JSON.parse(raw);
    return { ...SETTINGS_DEFAULTS, ...parsed };
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
}

function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* private mode etc. */
  }
}

function applySettings(s) {
  const cfg = s || loadSettings();
  state.settings = cfg;
  const root = document.documentElement;
  const body = document.body;
  const keys = ["mode", "theme", "size", "font", "lh", "readw", "rain", "grain", "seal"];
  for (const k of keys) {
    const v = cfg[k] ?? SETTINGS_DEFAULTS[k];
    body.dataset[k] = v;
    if (k === "size" || k === "mode" || k === "theme") root.dataset[k] = v;
  }
  ensureFontsFor(cfg.font || SETTINGS_DEFAULTS.font);
  // theme-color for mobile chrome
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = cfg.mode === "dark" ? "#1a1612" : "#1a1612";
  return cfg;
}

function updateSetting(key, value) {
  const next = { ...(state.settings || loadSettings()), [key]: value };
  saveSettings(next);
  if (key === "font") ensureFontsFor(value);
  applySettings(next);
  if (state.view === "settings") renderSettings();
}

function resetSettings() {
  saveSettings({ ...SETTINGS_DEFAULTS });
  applySettings(SETTINGS_DEFAULTS);
  if (state.view === "settings") renderSettings();
}

function settingsPreviewText() {
  const s = state.settings || SETTINGS_DEFAULTS;
  const modeL = s.mode === "dark" ? "夜驿" : "昼纸";
  const themeL = (SETTINGS_META.theme.options.find(o => o.value === s.theme) || {}).label || s.theme;
  const fontL = (SETTINGS_META.font.options.find(o => o.value === s.font) || {}).label || s.font;
  const sizeL = (SETTINGS_META.size.options.find(o => o.value === s.size) || {}).label || s.size;
  return { modeL, themeL, fontL, sizeL };
}

function renderSetOptions(key) {
  const meta = SETTINGS_META[key];
  const cur = (state.settings || SETTINGS_DEFAULTS)[key];
  return `
    <div class="set-grid" role="listbox" aria-label="${escapeHtml(meta.title)}">
      ${meta.options.map(opt => {
        const sw = opt.swatch
          ? `<span class="set-swatch" aria-hidden="true">${opt.swatch.map(c => `<i style="background:${c}"></i>`).join("")}</span>`
          : "";
        return `
          <button type="button" class="set-option ${cur === opt.value ? "is-active" : ""}"
            role="option" aria-selected="${cur === opt.value}"
            data-set-key="${escapeHtml(key)}" data-set-value="${escapeHtml(opt.value)}">
            ${sw}
            <b>${escapeHtml(opt.label)}</b>
            <small>${escapeHtml(opt.note || "")}</small>
          </button>`;
      }).join("")}
    </div>`;
}

function renderSetToggle(key, label, note) {
  const on = (state.settings || SETTINGS_DEFAULTS)[key] !== "off";
  return `
    <button type="button" class="set-toggle ${on ? "is-on" : ""}"
      data-set-toggle="${escapeHtml(key)}" aria-pressed="${on}">
      <span class="st-label">
        <b>${escapeHtml(label)}</b>
        <small>${escapeHtml(note)}</small>
      </span>
      <span class="set-switch" aria-hidden="true"></span>
    </button>`;
}

function renderSettings() {
  const s = state.settings || loadSettings();
  const pv = settingsPreviewText();
  $("#mainView").innerHTML = `
    <div class="settings-page">
      <p class="kicker">案前 · 设置</p>
      <h1 class="page-title">案前</h1>
      <p class="lead">把驿亭调成你惯看的样子。即时生效，记在本机，不上传。</p>

      <div class="settings-preview" aria-live="polite">
        <p class="sp-kicker">预览 · ${escapeHtml(pv.modeL)} · ${escapeHtml(pv.themeL)}</p>
        <h2 class="sp-title">雨刚停，官道还湿。</h2>
        <p class="sp-body">诸位且坐。河东卷以踏线人串图，主路跟脚，旁支立魂，铺地成江湖。字号「${escapeHtml(pv.sizeL)}」，字体「${escapeHtml(pv.fontL)}」。标题书法，正文瘦金——看清再走。</p>
        <p class="sp-meta">此块随设置即时改样 · 与正文同源字与色</p>
      </div>

      <section class="settings-section">
        <h2>${escapeHtml(SETTINGS_META.mode.title)}</h2>
        <p class="set-hint">${escapeHtml(SETTINGS_META.mode.hint)}</p>
        ${renderSetOptions("mode")}
      </section>

      <section class="settings-section">
        <h2>${escapeHtml(SETTINGS_META.theme.title)}</h2>
        <p class="set-hint">${escapeHtml(SETTINGS_META.theme.hint)}</p>
        ${renderSetOptions("theme")}
      </section>

      <section class="settings-section">
        <h2>${escapeHtml(SETTINGS_META.size.title)}</h2>
        <p class="set-hint">${escapeHtml(SETTINGS_META.size.hint)}</p>
        ${renderSetOptions("size")}
      </section>

      <section class="settings-section">
        <h2>${escapeHtml(SETTINGS_META.font.title)}</h2>
        <p class="set-hint">${escapeHtml(SETTINGS_META.font.hint)}</p>
        ${renderSetOptions("font")}
      </section>

      <section class="settings-section">
        <h2>${escapeHtml(SETTINGS_META.lh.title)}</h2>
        <p class="set-hint">${escapeHtml(SETTINGS_META.lh.hint)}</p>
        ${renderSetOptions("lh")}
      </section>

      <section class="settings-section">
        <h2>${escapeHtml(SETTINGS_META.readw.title)}</h2>
        <p class="set-hint">${escapeHtml(SETTINGS_META.readw.hint)}</p>
        ${renderSetOptions("readw")}
      </section>

      <section class="settings-section">
        <h2>环境</h2>
        <p class="set-hint">雨丝、纸渍、角印只做氛围，可关。</p>
        <div class="set-toggle-row">
          ${renderSetToggle("rain", "雨丝斜纹", "背景细雨线")}
          ${renderSetToggle("grain", "纸渍噪点", "纸本肌理")}
          ${renderSetToggle("seal", "角印「异」", "右下固定印记")}
        </div>
      </section>

      <section class="settings-section">
        <h2>恢复</h2>
        <p class="set-hint">一键回到项目默认：昼纸 · 雨后驿路 · 适中 · 瘦金卷。</p>
        <div class="settings-actions">
          <button type="button" class="btn-secondary" id="btnResetSettings">恢复默认</button>
        </div>
      </section>

      <p class="settings-foot">快捷：通寻 Q · 掩卷 Esc · 翻程 ← → · 阅读器顶栏「程目/掩目」开合侧栏。设置存在本机浏览器（${escapeHtml(SETTINGS_KEY)}）。换浏览器或清站点数据会丢偏好。</p>
    </div>
  `;
}


const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** 墨线分程：无插图，只留气口 */
function inkDivider(label = "") {
  return `
    <div class="ink-divider" aria-hidden="true">
      <i class="ink-rule"></i>
      ${label ? `<span class="ink-label">${escapeHtml(label)}</span>` : `<span class="ink-dot"></span>`}
      <i class="ink-rule"></i>
    </div>`;
}

function genreLabel(code) {
  return GENRE[code] || code || "未分";
}

/** 读者向短名：去掉「河东线·」等组名前缀，工程 id 不出现 */
function displayTitle(entry) {
  if (!entry) return "";
  let t = String(entry.title || "").trim();
  const g = groupById(entry.group);
  if (g?.name) {
    const prefixes = [
      g.name + "·",
      g.name + " · ",
      g.name + "·",
      g.name + " "
    ];
    for (const p of prefixes) {
      if (t.startsWith(p)) {
        t = t.slice(p.length).trim();
        break;
      }
    }
  }
  // 常见工程前缀清理
  t = t.replace(/^(拟回目[·・]\s*)/, "");
  return t || entry.title || entry.id || "";
}

/** 卷首角标：只留一个主标签 + 卷名（降认知负担） */
function entryKicker(entry) {
  if (!entry) return "";
  const vol = volumeForEntry(entry);
  const g = groupById(entry.group);
  const role = entry.role && ROLE_LABEL[entry.role];
  // 优先：入卷/幕间/残页 > 主路/旁支/铺地 > 体例
  let head = "";
  if (role && role !== "正章") head = role;
  else if (entry.track) head = trackLabel(entry);
  else head = genreLabel(entry.genre);
  const tail = vol?.name || g?.name;
  return [head, tail].filter(Boolean).join(" · ");
}

function volumeById(id) {
  return state.catalog?.volumes?.find(v => v.id === id) || null;
}

function volumeForGroup(groupId) {
  const g = groupById(groupId);
  if (g?.volume) return volumeById(g.volume);
  return (state.catalog?.volumes || []).find(v => v.group === groupId) || null;
}

function volumeForEntry(entry) {
  if (!entry) return null;
  if (entry.volume) return volumeById(entry.volume);
  return volumeForGroup(entry.group);
}

/** 卷内路径：默认 main_path（番茄主连载），可指定 roam */
function volumePathIds(vol, mode = "main") {
  if (!vol) return [];
  if (mode === "roam" && vol.roam_path?.length) return vol.roam_path;
  if (vol.main_path?.length) return vol.main_path;
  return vol.reading_path || [];
}

/** 按卷荐读序排列；默认主章路径 */
function entriesInReadingOrder(groupId, mode = "main") {
  const vol = volumeForGroup(groupId);
  const all = entriesOfGroup(groupId);
  const path = volumePathIds(vol, mode);
  if (!path.length) return all;
  const map = new Map(all.map(e => [e.id, e]));
  const ordered = [];
  for (const id of path) {
    if (map.has(id)) {
      ordered.push(map.get(id));
      map.delete(id);
    }
  }
  for (const e of map.values()) ordered.push(e);
  return ordered;
}

function trackLabel(entry) {
  if (!entry?.track) return "";
  return TRACK_LABEL[entry.track] || entry.track;
}

function readingIndex(entry) {
  const vol = volumeForEntry(entry);
  const path = volumePathIds(vol, "main");
  if (!path.length) return -1;
  return path.indexOf(entry.id);
}

/** 连载角色：catalog.role 优先，否则按体例推断 */
function resolveRole(entry) {
  if (!entry) return null;
  if (entry.role && ROLE_LABEL[entry.role]) return entry.role;
  const g = entry.genre;
  if (g === "V") return "prologue";
  if (g === "W") return "interlude";
  if (g === "C") return "coda";
  return "main";
}

function roleBadge(entry) {
  const r = resolveRole(entry);
  return r ? (ROLE_LABEL[r] || "") : "";
}

function isPeak(entry) {
  return !!(entry && (entry.peak === true || entry.peak === "true"));
}

/** 卷脊柱摘要：开卷 / 高峰 / 收束（默认 main_path） */
function volumeSpineSummary(groupId) {
  const vol = volumeForGroup(groupId);
  const path = volumePathIds(vol, "main");
  const entries = path.map(id => entryById(id)).filter(Boolean);
  const open = entries.slice(0, 3).map(e => displayTitle(e));
  const peaks = entries.filter(e => isPeak(e) || e.genre === "Q" || e.genre === "P")
    .filter(e => resolveRole(e) === "main")
    .slice(0, 3)
    .map(e => displayTitle(e));
  const close = entries.filter(e => resolveRole(e) === "coda").map(e => displayTitle(e));
  return { open, peaks, close, total: path.length, vol };
}

/** 驿站四则（连载体感，读者向） */
function renderTomatoStrip(opts = {}) {
  const compact = !!opts.compact;
  const items = [
    { code: "可读", title: "单章可停", note: "一程脚力；幕间标明" },
    { code: "可追", title: "卷有脊柱", note: "开卷立气 · 有高峰 · 可掩卷" },
    { code: "可界", title: "世界大于主角", note: "真假不论 · 无升级" },
    { code: "可装", title: "主路旁支", note: "跟脚 · 钉子 · 铺地" }
  ];
  return `
    <div class="tomato-strip ${compact ? "is-compact" : ""}" aria-label="连载阅读体验">
      <div class="tomato-strip-head">
        <span class="tomato-kicker">驿站四则</span>
        ${compact ? "" : `<span class="tomato-hint">地脉成卷 · 程碑有序 · 体例是标签</span>`}
      </div>
      <div class="tomato-grid">
        ${items.map(it => `
          <div class="tomato-cell">
            <b>${escapeHtml(it.code)}</b>
            <strong>${escapeHtml(it.title)}</strong>
            <small>${escapeHtml(it.note)}</small>
          </div>`).join("")}
      </div>
    </div>`;
}

/** 程碑脊柱（主章路径） */
function renderSpineRail(groupId) {
  const path = entriesInReadingOrder(groupId, "main");
  if (!path.length) return "";
  return `
    <ol class="spine-rail" aria-label="本卷主章程碑">
      ${path.map((e, i) => {
        const role = resolveRole(e);
        const peak = isPeak(e);
        const track = e.track || "";
        const ord = role === "prologue" ? "卷首" : (role === "coda" ? "残页" : (role === "interlude" ? "幕间" : `第${i}程`));
        const cls = [
          "spine-node",
          role ? `role-${role}` : "",
          track ? `track-${track}` : "",
          peak ? "is-peak" : ""
        ].filter(Boolean).join(" ");
        const sideTag = trackLabel(e) || roleBadge(e) || genreLabel(e.genre);
        return `
          <li class="${cls}">
            <button type="button" data-open-entry="${escapeHtml(e.id)}" title="${escapeHtml(displayTitle(e))}">
              <i class="spine-dot" aria-hidden="true"></i>
              <span class="spine-ord">${escapeHtml(ord)}</span>
              <span class="spine-title">${escapeHtml(displayTitle(e))}</span>
              ${peak ? `<em class="spine-peak">高峰</em>` : ""}
              <span class="spine-role">${escapeHtml(sideTag)}</span>
              ${renderReviewSeal(e, { compact: true })}
            </button>
          </li>`;
      }).join("")}
    </ol>`;
}

/** 三槽分栏：主线 / 副线 / 其他（剧情分布） */
function renderTrackLanes(groupId) {
  const all = entriesOfGroup(groupId).filter(e => !/种子/.test(e.status || ""));
  const lanes = [
    { id: "main", name: "主路", hint: "踏线人跟脚", cls: "lane-main" },
    { id: "side", name: "旁支", hint: "钉子立魂", cls: "lane-side" },
    { id: "other", name: "铺地", hint: "探游传闻残页", cls: "lane-other" }
  ];
  const mainPath = volumePathIds(volumeForGroup(groupId), "main");
  const ordMap = new Map(mainPath.map((id, i) => [id, i]));
  return `
    <div class="track-lanes" aria-label="卷内三槽分布">
      ${lanes.map(lane => {
        const items = all
          .filter(e => (e.track || "other") === lane.id)
          .sort((a, b) => {
            const ia = ordMap.has(a.id) ? ordMap.get(a.id) : 999;
            const ib = ordMap.has(b.id) ? ordMap.get(b.id) : 999;
            return ia - ib;
          });
        return `
          <section class="track-lane ${lane.cls}">
            <header class="track-lane-head">
              <b>${escapeHtml(lane.name)}</b>
              <span>${escapeHtml(lane.hint)} · ${items.length}</span>
            </header>
            <ul class="track-lane-list">
              ${items.length
                ? items.map(e => {
                    const peak = isPeak(e);
                    const ord = ordMap.has(e.id)
                      ? (resolveRole(e) === "prologue" ? "首" : `${ordMap.get(e.id)}`)
                      : "·";
                    return `
                      <li>
                        <button type="button" data-open-entry="${escapeHtml(e.id)}">
                          <i>${escapeHtml(String(ord))}</i>
                          <em>${escapeHtml(displayTitle(e))}</em>
                          ${peak ? `<span class="peak-dot">峰</span>` : ""}
                          ${renderReviewSeal(e, { compact: true })}
                        </button>
                      </li>`;
                  }).join("")
                : `<li><button type="button" disabled><em class="empty-lane">尚无</em></button></li>`}
            </ul>
          </section>`;
      }).join("")}
    </div>`;
}

/** 列表副行：气味 · 人物 */
function entrySubline(entry) {
  const scents = (entry.scent || []).slice(0, 3).join(" · ");
  const people = (entry.people || []).slice(0, 3).join("、");
  return [scents, people].filter(Boolean).join(" · ");
}

/** 审印：独立于稿件 status；缺 review 一律待勘 */
function reviewState(entry) {
  return entry?.review?.state || "pending";
}

function reviewMeta(entry) {
  const stateName = reviewState(entry);
  const table = {
    passed: { label: "验讫", className: "passed", pass: true },
    passed_with_notes: { label: "朱注", className: "notes", pass: true },
    revise: { label: "退修", className: "revise", pass: false },
    pending: { label: "待勘", className: "pending", pass: false },
    exempt: { label: "卷宗", className: "exempt", pass: null }
  };
  const base = table[stateName] || table.pending;
  return {
    ...base,
    state: stateName,
    label: entry?.review?.seal || base.label,
    note: entry?.review?.note || "尚未完成当前版本人工审查。",
    report: entry?.review?.report || "docs/原则/21_故事审查标准.md",
    date: entry?.review?.date || "",
    sourceVersion: entry?.review?.source_version || "",
    round: entry?.review?.round || ""
  };
}

function renderReviewSeal(entry, opts = {}) {
  const meta = reviewMeta(entry);
  const compact = !!opts.compact;
  const title = [meta.label, meta.note, meta.date ? `审于 ${meta.date}` : ""].filter(Boolean).join(" · ");
  return `<span class="review-seal review-${escapeHtml(meta.className)} ${compact ? "is-compact" : ""}" title="${escapeHtml(title)}" aria-label="审查：${escapeHtml(meta.label)}"><i>审</i><b>${escapeHtml(meta.label)}</b></span>`;
}

function reviewCounts(entries = state.catalog?.entries || []) {
  const out = { passed: 0, notes: 0, revise: 0, pending: 0 };
  for (const e of entries) {
    const r = reviewState(e);
    if (r === "passed") out.passed++;
    else if (r === "passed_with_notes") out.notes++;
    else if (r === "revise") out.revise++;
    else if (r !== "exempt") out.pending++;
  }
  out.approved = out.passed + out.notes;
  return out;
}

function renderReviewLedger(entries, compact = false) {
  const c = reviewCounts(entries);
  return `
    <section class="review-ledger ${compact ? "is-compact" : ""}" aria-label="审印总览">
      <div class="review-ledger-head">
        <span class="review-ledger-kicker">朱批 · 审印</span>
        <b>${c.approved} 篇过关</b>
        <button type="button" data-open-doc="stories/审查总簿.md">开总簿</button>
      </div>
      <div class="review-ledger-grid">
        <span class="review-count passed"><i>验</i><b>${c.passed}</b><small>验讫</small></span>
        <span class="review-count notes"><i>注</i><b>${c.notes}</b><small>朱注</small></span>
        <span class="review-count revise"><i>退</i><b>${c.revise}</b><small>退修</small></span>
        <span class="review-count pending"><i>勘</i><b>${c.pending}</b><small>待勘</small></span>
      </div>
    </section>`;
}

/** 状态白话：不写「基础通过」工程腔 */
function statusDisplay(status) {
  if (!status) return "未录";
  if (/种子/.test(status)) return "种子";
  if (/通过|成稿|正式/.test(status)) return "已录";
  if (/初稿/.test(status)) return "初稿";
  if (/开写|进行/.test(status)) return "进行中";
  return status;
}

function statusClass(status) {
  if (!status) return "";
  if (/种子/.test(status)) return "seed";
  if (/通过|正式|成稿|已录/.test(status)) return "ok";
  if (/初稿|开写|进行/.test(status)) return "draft";
  if (/退修/.test(status)) return "revise";
  return "";
}

function entriesOfReviewStage(stageId) {
  const all = state.catalog?.entries || [];
  if (!stageId || stageId === "all") return all;
  return all.filter(e => {
    const st = reviewState(e);
    if (stageId === "pending") return st === "pending" || !st || st === "unknown";
    if (stageId === "notes") return st === "passed_with_notes";
    if (stageId === "passed") return st === "passed";
    if (stageId === "revise") return st === "revise";
    return true;
  });
}

function reviewStageClass(stateName) {
  if (stateName === "passed") return "passed";
  if (stateName === "passed_with_notes") return "notes";
  if (stateName === "revise") return "revise";
  return "pending";
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


/* ---------- Rendering helpers ---------- */

function renderEntryRow(entry, opts = {}) {
  const vol = volumeForEntry(entry);
  const g = groupById(entry.group);
  const badgeCls = statusClass(entry.status);
  const review = reviewMeta(entry);
  const sub = entrySubline(entry);
  const where = vol?.name || g?.name || "";
  const role = resolveRole(entry);
  const roleLabel = roleBadge(entry);
  const peak = isPeak(entry);
  const idx = opts.showIndex ? readingIndex(entry) : -1;
  let ordText = "";
  if (idx >= 0) {
    if (role === "prologue") ordText = "卷首";
    else if (role === "coda") ordText = "残页";
    else if (role === "interlude") ordText = "幕间";
    else ordText = `第${idx}程`;
  }
  const hasOrd = !!ordText;
  const ord = hasOrd ? `<span class="chap-ord">${escapeHtml(ordText)}</span>` : "";
  // 一章一个主标签：入卷/幕间/残页 > 主路/旁支/铺地 > 体例
  let tag = "";
  if (roleLabel && roleLabel !== "正章") tag = roleLabel;
  else if (entry.track) tag = trackLabel(entry);
  else tag = genreLabel(entry.genre);
  const peakMark = peak ? `<span class="peak-mark" title="卷内高峰">峰</span>` : "";
  const roleCls = role ? ` role-${role}` : "";
  const trackCls = entry.track ? ` track-${entry.track}` : "";
  const peakCls = peak ? " is-peak" : "";
  const reviewCls = ` review-${review.className}`;
  const ordCls = hasOrd ? " has-ord" : "";
  const people = (entry.people || []).slice(0, 4).join("、");
  const scent = (entry.scent || []).slice(0, 2).join(" · ");
  const subline = [where, scent, people].filter(Boolean).join(" · ");
  return `
    <button type="button" class="entry-row ${opts.inPath ? "in-path" : ""}${ordCls}${roleCls}${trackCls}${peakCls}${reviewCls}" data-open-entry="${escapeHtml(entry.id)}">
      ${ord}
      <span class="genre-tag">${escapeHtml(tag)}</span>
      <span class="title-block">
        <b>${escapeHtml(displayTitle(entry))}${peakMark}</b>
        <small>${escapeHtml(subline)}</small>
      </span>
      <span class="entry-review-stack">
        ${renderReviewSeal(entry)}
        <span class="badge ${badgeCls}">${escapeHtml(statusDisplay(entry.status))}</span>
      </span>
    </button>`;
}


/** 体例 → 探索方帖图标字（燕云分类感，一字印） */
const EXPLORE_ICONS = {
  main: "主",
  side: "旁",
  other: "铺",
  Z: "纪", P: "旁", C: "残", Q: "奇", Y: "探", W: "闻", R: "折", N: "志", G: "规", X: "象", V: "卷"
};

function trackCount(groupId, track) {
  return entriesOfGroup(groupId).filter(e => !/种子/.test(e.status || "") && (e.track || "other") === track).length;
}

function formalCount(groupId) {
  return entriesOfGroup(groupId).filter(e => !/种子/.test(e.status || "")).length;
}

function pctOf(n, total) {
  if (!total) return 0;
  return Math.min(100, Math.round((n / total) * 100));
}

function renderGroupCard(group) {
  const vol = volumeForGroup(group.id);
  const formal = formalCount(group.id);
  const verse = placeVerse(group.id);
  const kernels = (group.kernel || []).slice(0, 4)
    .map(k => `<span>${escapeHtml(k)}</span>`).join("");
  const mainN = (vol?.main_path || vol?.reading_path || []).length;
  const volCls = vol?.id ? ` vol-${vol.id.replace(/^vol-/, "")}` : (group.id ? ` vol-${group.id}` : "");
  const status = vol?.status || group.status || "";
  const sealChar = (vol?.name || group.name || "卷").replace(/卷$/, "")[0] || "卷";
  const scent = vol?.subtitle || (group.kernel || [])[0] || "";
  const blurbBlock = verse?.couplet?.length
    ? verseHtml(verse.couplet, "place-verse is-card")
    : `<p>${escapeHtml(vol?.blurb || group.summary || scent || "")}</p>`;
  return `
    <button type="button" class="group-card${volCls}" data-open-group="${escapeHtml(group.id)}" data-seal="${escapeHtml(sealChar)}">
      <span class="tag">${escapeHtml(status || "地脉")}</span>
      <h3>${escapeHtml(vol?.name || group.name)}</h3>
      ${blurbBlock}
      <div class="kernel">${kernels}</div>
      <div class="meta-line">
        <span>${formal} 篇 · 主路 ${mainN} 程</span>
        <span>开卷 →</span>
      </div>
    </button>`;
}

/** 主路程碑：严格 main_path，不把其余条目塞进金线 */
function mainPathEntries(groupId) {
  const vol = volumeForGroup(groupId);
  const ids = volumePathIds(vol, "main");
  if (!ids.length) return entriesInReadingOrder(groupId, "main");
  return ids.map(id => entryById(id)).filter(Boolean);
}

/** 燕云式金线主路 · 每行六程 · 进度态 · 局部翻页 */
function renderGoldPath(groupId, opts = {}) {
  const path = mainPathEntries(groupId);
  if (!path.length) {
    return `<div class="gold-path is-empty" data-gp-group="${escapeHtml(groupId)}"><p class="empty">此卷主路尚未铺开。</p></div>`;
  }
  const total = path.length;
  const pages = Math.max(1, Math.ceil(total / GOLD_PAGE_SIZE));
  let page = Number(state.goldPage?.[groupId] || 0);
  if (page < 0) page = 0;
  if (page >= pages) page = pages - 1;
  state.goldPage[groupId] = page;
  const start = page * GOLD_PAGE_SIZE;
  const slice = path.slice(start, start + GOLD_PAGE_SIZE);
  const from = start + 1;
  const to = start + slice.length;
  const pathIds = path.map(e => e.id);
  const contId = continueEntryId(groupId);
  const lastId = lastReadOnPath(pathIds);
  const segs = Math.max(slice.length - 1, 1);
  const step = 960 / segs;
  let wave = `M 0 40`;
  for (let i = 1; i <= segs; i++) {
    const x = Math.round(step * i);
    const y = i % 2 === 0 ? 40 : (i % 4 === 1 ? 18 : 58);
    const mx = Math.round(step * (i - 0.5));
    wave += ` Q ${mx} ${y}, ${x} 40`;
  }
  const nodes = slice.map((e, i) => {
    const abs = start + i;
    const role = resolveRole(e);
    const peak = isPeak(e);
    const read = isEntryRead(e.id);
    const current = contId === e.id;
    const ord = role === "prologue" ? "首"
      : (role === "coda" ? "残"
        : (role === "interlude" ? "幕" : `${abs || "·"}`));
    const cls = [
      "gp-node",
      peak ? "is-peak" : "",
      role === "prologue" ? "is-pro" : "",
      read ? "is-read" : "",
      current ? "is-current" : ""
    ].filter(Boolean).join(" ");
    const statusHint = current ? "此程" : (read ? "已过" : (roleBadge(e) || genreLabel(e.genre)));
    return `
      <button type="button" class="${cls}" data-open-entry="${escapeHtml(e.id)}" title="${escapeHtml(displayTitle(e))} · ${escapeHtml(statusHint)}">
        <span class="gp-mark" aria-hidden="true">${escapeHtml(ord)}</span>
        <span class="gp-title">${escapeHtml(displayTitle(e))}</span>
        <span class="gp-sub">${escapeHtml(statusHint)}</span>
      </button>`;
  }).join("");
  const readN = pathIds.filter(id => isEntryRead(id)).length;
  const pager = pages > 1 ? `
    <div class="gold-path-pager" role="navigation" aria-label="金线分页">
      <button type="button" class="gp-page-btn" data-gp-page="${escapeHtml(groupId)}" data-gp-dir="-1" ${page <= 0 ? "disabled" : ""} aria-label="上一行">‹ 上程</button>
      <span class="gp-page-meta">第 ${from}–${to} 程 · 共 ${total} · ${page + 1}/${pages} 行 · 已过 ${readN}</span>
      <button type="button" class="gp-page-btn" data-gp-page="${escapeHtml(groupId)}" data-gp-dir="1" ${page >= pages - 1 ? "disabled" : ""} aria-label="下一行">下程 ›</button>
    </div>` : `
    <div class="gold-path-pager is-single">
      <span class="gp-page-meta">共 ${total} 程 · 已过 ${readN}${lastId ? " · 续行见金点" : ""}</span>
    </div>`;
  const compact = opts.compact ? " is-compact" : "";
  return `
    <div class="gold-path${compact}" data-motion="rail" data-gp-group="${escapeHtml(groupId)}" aria-label="本卷主路">
      <div class="gold-path-bg" aria-hidden="true"></div>
      <svg class="gold-path-svg" viewBox="0 0 960 80" preserveAspectRatio="none" aria-hidden="true">
        <path class="gp-stroke" d="${wave}" pathLength="100"/>
      </svg>
      <div class="gold-path-nodes gp-count-${slice.length}">
        ${nodes}
      </div>
      ${pager}
    </div>`;
}

/** 探索方帖：入世只露三槽；卷页可展开体例 */
function renderExploreCards(groupId, opts = {}) {
  const all = entriesOfGroup(groupId).filter(e => !/种子/.test(e.status || ""));
  const total = Math.max(all.length, 1);
  const mainN = all.filter(e => (e.track || "") === "main").length;
  const sideN = all.filter(e => e.track === "side").length;
  const otherN = all.filter(e => (e.track || "other") === "other").length;
  const cards = [
    { key: "main", name: "主路", icon: "主", n: mainN, gold: true, open: "track:main", note: "跟着脚走" },
    { key: "side", name: "旁支", icon: "旁", n: sideN, gold: false, open: "track:side", note: "钉子立魂" },
    { key: "other", name: "铺地", icon: "铺", n: otherN, gold: false, open: "track:other", note: "风土余味" }
  ];
  if (opts.full) {
    const byGenre = {};
    for (const e of all) byGenre[e.genre] = (byGenre[e.genre] || 0) + 1;
    for (const g of GENRE_ORDER) {
      if ((byGenre[g] || 0) > 0 && g !== "V") {
        cards.push({
          key: g,
          name: genreLabel(g),
          icon: EXPLORE_ICONS[g] || g,
          n: byGenre[g],
          gold: g === "Z",
          open: `genre:${g}`,
          note: ""
        });
      }
    }
  }
  const shown = opts.full ? cards.slice(0, 8) : cards.slice(0, 3);
  return `
    <div class="explore-row ${opts.full ? "" : "is-triad"}" data-motion="stagger" aria-label="卷内分类">
      ${shown.map((c) => {
        const pct = pctOf(c.n, total);
        return `
          <button type="button" class="explore-card ${c.gold ? "is-gold" : ""}" data-explore="${escapeHtml(c.open)}" data-open-group="${escapeHtml(groupId)}">
            <span class="ec-icon">${escapeHtml(c.icon)}</span>
            <span class="ec-name">${escapeHtml(c.name)}</span>
            <span class="ec-pct">${c.n} 篇${c.note ? ` · ${escapeHtml(c.note)}` : ` · ${pct}%`}</span>
            <span class="ec-bar" aria-hidden="true"><i style="width:${pct}%"></i></span>
          </button>`;
      }).join("")}
    </div>`;
}

/** 图鉴横滑 */
function renderGalleryRail(groupId, genreOrTrack) {
  let items = entriesOfGroup(groupId).filter(e => !/种子/.test(e.status || ""));
  if (genreOrTrack?.startsWith("track:")) {
    const t = genreOrTrack.slice(6);
    items = items.filter(e => (e.track || "other") === t);
  } else if (genreOrTrack?.startsWith("genre:")) {
    const g = genreOrTrack.slice(6);
    items = items.filter(e => e.genre === g);
  } else if (genreOrTrack === "main" || !genreOrTrack) {
    items = entriesInReadingOrder(groupId, "main");
  }
  if (!items.length) return `<p class="empty">此径尚无收录。</p>`;
  return `
    <div class="gallery-rail" data-motion="stagger">
      ${items.map(e => {
        const seal = (displayTitle(e) || "?")[0];
        const isNew = /种子|进行/.test(e.status || "") ? "" : "";
        return `
          <button type="button" class="gallery-card" data-open-entry="${escapeHtml(e.id)}">
            ${isNew}
            <div class="gc-thumb">${escapeHtml(seal)}</div>
            ${renderReviewSeal(e, { compact: true })}
            <div class="gc-body">
              <b>${escapeHtml(displayTitle(e))}</b>
              <small>${escapeHtml(trackLabel(e) || genreLabel(e.genre))}</small>
            </div>
          </button>`;
      }).join("")}
    </div>`;
}

function renderHome() {
  const groups = state.catalog?.groups || [];
  const hedongVol = volumeForGroup("hedong");
  const protag = state.catalog?.protagonist;
  const path = mainPathEntries("hedong");
  const mainN = path.length;
  const formalN = formalCount("hedong");
  const volName = hedongVol?.name || "河东卷";
  const verse = placeVerse("hedong");
  const status = hedongVol?.status || "连载中";
  const heroQuote = verse?.couplet?.length
    ? verseHtml(verse.couplet, "region-quote is-verse")
    : `<p class="region-quote">${escapeHtml(hedongVol?.blurb || "雨歇官道泥犹软，旗湿不扬人自远。")}</p>`;
  const contId = continueEntryId("hedong") || "HD00";
  const contEntry = entryById(contId);
  const hasProgress = path.some(e => isEntryRead(e.id));
  const primaryLabel = hasProgress
    ? `续行 · ${displayTitle(contEntry) || "下一程"}`
    : "从入卷听起";
  const primaryId = hasProgress ? contId : "HD00";

  $("#mainView").innerHTML = `
    <section class="region-hero" data-motion="hero">
      <div class="region-hero-inner">
        <div class="region-hero-copy">
          <p class="region-kicker"><i></i>踏线人 · ${escapeHtml(protag?.name || "沈陌")}</p>
          <h1 class="region-title">${escapeHtml(volName.replace(/卷$/, "") || "河东")}</h1>
          ${heroQuote}
          <div class="hero-cta-row">
            <button type="button" class="btn-primary" data-open-entry="${escapeHtml(primaryId)}">${escapeHtml(primaryLabel)}</button>
            <button type="button" class="btn-ghost" data-open-group="hedong">进入本卷</button>
          </div>
        </div>
        <aside class="region-side">
          <div class="region-seal" aria-hidden="true">河</div>
          <div class="region-meta">
            <b>${escapeHtml(status)}</b>
            主路 ${mainN} 程 · 成稿 ${formalN}<br/>
            ${escapeHtml(protag?.title || "踏线人")}
          </div>
        </aside>
      </div>
    </section>

    <section class="home-block home-path" aria-labelledby="home-path-h">
      <div class="section-head section-loose">
        <h2 id="home-path-h">金线程碑</h2>
        <span>六程一行 · 跟着脚走</span>
      </div>
      ${renderGoldPath("hedong")}
    </section>

    <section class="home-block home-places" aria-labelledby="home-places-h">
      <div class="section-head section-loose">
        <h2 id="home-places-h">地标</h2>
        <span>村镇渡口 · 两句诗</span>
      </div>
      ${renderPlaceVerses("hedong")}
    </section>

    <section class="home-block home-tracks" aria-labelledby="home-tracks-h">
      <div class="section-head section-loose">
        <h2 id="home-tracks-h">三径</h2>
        <span>主路 · 旁支 · 铺地</span>
      </div>
      ${renderExploreCards("hedong")}
    </section>

    <section class="home-block home-vols" aria-labelledby="home-vols-h">
      <div class="section-head section-loose">
        <h2 id="home-vols-h">地脉分卷</h2>
        <span>${(state.catalog?.volumes || []).length || groups.length} 卷</span>
      </div>
      <div class="group-grid is-sparse" data-motion="stagger">
        ${groups.map(renderGroupCard).join("") || `<p class="empty">尚无地脉组。请检查 stories/catalog.json</p>`}
      </div>
    </section>

    <details class="home-editor-fold">
      <summary>编辑向 · 审印一览</summary>
      <div class="home-editor-body">
        ${renderReviewLedger(formalEntries())}
      </div>
    </details>
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
    const vol = volumeForGroup(g.id);
    const pathList = entriesInReadingOrder(g.id);
    const formal = pathList.filter(e => !/种子/.test(e.status || ""));
    const firstId = volumePathIds(vol, "main")[0] || pathList[0]?.id;
    const spine = volumeSpineSummary(g.id);
    const trackCounts = { main: 0, side: 0, other: 0 };
    for (const e of pathList) {
      if (e.track && trackCounts[e.track] != null) trackCounts[e.track]++;
    }
    const protag = state.catalog?.protagonist;
    const explore = state.exploreFilter || "track:main";
    const verse = placeVerse(g.id);
    const heroQuote = verse?.couplet?.length
      ? verseHtml(verse.couplet, "region-quote is-verse")
      : `<p class="region-quote">${escapeHtml(vol?.blurb || g.summary || "")}${vol?.subtitle ? ` 「${escapeHtml(vol.subtitle)}」` : ""}</p>`;
    const contId = continueEntryId(g.id) || firstId;
    const hasProgress = mainPathEntries(g.id).some(e => isEntryRead(e.id));
    const primaryLabel = hasProgress && contId
      ? `续行 · ${displayTitle(entryById(contId)) || "下一程"}`
      : "从卷首读";
    const primaryId = hasProgress && contId ? contId : firstId;
    const tabDefs = [
      { id: "track:main", name: "主路", n: trackCounts.main },
      { id: "track:side", name: "旁支", n: trackCounts.side },
      { id: "track:other", name: "铺地", n: trackCounts.other }
    ];
    $("#mainView").innerHTML = `
      <section class="region-hero is-compact" data-motion="hero">
        <div class="region-hero-inner">
          <div class="region-hero-copy">
            <p class="region-kicker"><i></i>${escapeHtml(g.name)}</p>
            <h1 class="region-title">${escapeHtml((vol?.name || g.name).replace(/卷$/, ""))}</h1>
            ${heroQuote}
            <div class="hero-cta-row">
              ${primaryId ? `<button type="button" class="btn-primary" data-open-entry="${escapeHtml(primaryId)}">${escapeHtml(primaryLabel)}</button>` : ""}
              <button type="button" class="btn-ghost" data-open-group="">← 全部卷</button>
            </div>
          </div>
          <aside class="region-side">
            <div class="region-seal">${escapeHtml((vol?.name || g.name || "卷").replace(/卷$/, "")[0] || "卷")}</div>
            <div class="region-meta">
              <b>${escapeHtml(vol?.status || g.status || "")}</b>
              主路 ${trackCounts.main} · 旁支 ${trackCounts.side} · 铺地 ${trackCounts.other}<br/>
              成稿 ${formal.length}
            </div>
          </aside>
        </div>
      </section>

      ${verse?.places?.length ? `
        <section class="home-block">
          <div class="section-head section-loose"><h2>地标</h2><span>村镇渡口 · 两句诗</span></div>
          ${renderPlaceVerses(g.id)}
        </section>
      ` : ""}

      <div class="vol-tabs" role="tablist">
        ${tabDefs.map(t => `
          <button type="button" class="vol-tab ${explore === t.id ? "is-active" : ""}" data-explore-filter="${escapeHtml(t.id)}" data-open-group="${escapeHtml(g.id)}">
            ${escapeHtml(t.name)}<small>${t.n}</small>
          </button>`).join("")}
      </div>

      <div class="section-head section-loose">
        <h2>${explore === "track:main" ? "金线主路" : explore === "track:side" ? "旁支钉子" : "铺地"}</h2>
        <span>${explore === "track:main" ? "六程一行 · 点开展程" : "点开展程"}</span>
      </div>
      ${explore === "track:main" ? renderGoldPath(g.id) : ""}
      ${explore !== "track:main" ? renderGalleryRail(g.id, explore) : `
        <div class="section-head section-loose"><h2>图鉴</h2><span>主路篇目</span></div>
        ${renderGalleryRail(g.id, explore)}
      `}

      <div class="section-head section-loose"><h2>章目全表</h2><span>上程 / 下程按此序</span></div>
      <div class="entry-list path-list is-sparse">
        ${pathList.map(e => renderEntryRow(e, { showIndex: true, inPath: true })).join("") || `<p class="empty">此卷尚无收录。</p>`}
      </div>

      <details class="home-editor-fold">
        <summary>编辑向 · 本卷审印</summary>
        <div class="home-editor-body">${renderReviewLedger(pathList, true)}</div>
      </details>
    `;
    return;
  }

  $("#mainView").innerHTML = `
    <p class="kicker">卷 · 地脉</p>
    <h1 class="page-title">一书一卷，沿路走</h1>
    <p class="lead">书架按卷，目录按程碑。先选一卷，再顺主路的金线走。</p>
    <div class="group-grid is-sparse" style="margin-top:1.75rem" data-motion="stagger">
      ${groups.map(renderGroupCard).join("")}
    </div>
  `;
}

function renderGenres() {
  // 「审印」页：按审查阶段分栏，服务校验审核（原体例货架取消）
  const all = state.catalog?.entries || [];
  const counts = reviewCounts(all);
  const stage = state.reviewStage || "all";
  const list = entriesOfReviewStage(stage);

  const board = REVIEW_STAGES.map(s => {
    const n =
      s.id === "passed" ? counts.passed
      : s.id === "notes" ? counts.notes
      : s.id === "revise" ? counts.revise
      : counts.pending;
    const active = stage === s.id ? "is-active" : "";
    return `
      <button type="button" class="review-stage-card is-${escapeHtml(s.id)} ${active}" data-review-stage="${escapeHtml(s.id)}">
        <span class="stg-k">审印 · ${escapeHtml(s.seal)}</span>
        <span class="stg-n">${n}</span>
        <span class="stg-d">${escapeHtml(s.desc)}</span>
      </button>`;
  }).join("");

  const chips = [
    `<button type="button" class="chip ${stage === "all" ? "is-active" : ""}" data-review-stage="all">全部<small>${all.length}</small></button>`,
    ...REVIEW_STAGES.map(s => {
      const n =
        s.id === "passed" ? counts.passed
        : s.id === "notes" ? counts.notes
        : s.id === "revise" ? counts.revise
        : counts.pending;
      return `<button type="button" class="chip ${stage === s.id ? "is-active" : ""}" data-review-stage="${escapeHtml(s.id)}">${escapeHtml(s.name)}<small>${n}</small></button>`;
    })
  ].join("");

  const stageMeta = REVIEW_STAGES.find(s => s.id === stage);
  const headTitle = stage === "all" ? "全部篇目 · 审印序" : `审印 · ${stageMeta?.name || ""}`;
  const headNote = stage === "all"
    ? "核心 R0–R3 · 可选模块 · 见 21"
    : (stageMeta?.gate || "");

  // 次筛：体例（可选，便于同一审印阶段内再分）
  const genreCounts = Object.fromEntries(GENRE_ORDER.map(c => [c, 0]));
  for (const e of list) {
    if (genreCounts[e.genre] != null) genreCounts[e.genre]++;
  }
  const genreChips = [
    `<button type="button" class="chip ${state.genreId === "all" ? "is-active" : ""}" data-genre="all">诸体</button>`,
    ...GENRE_ORDER.filter(c => genreCounts[c] > 0).map(c =>
      `<button type="button" class="chip ${state.genreId === c ? "is-active" : ""}" data-genre="${c}">${genreLabel(c)} · ${genreCounts[c]}</button>`
    )
  ].join("");

  const filtered = state.genreId === "all"
    ? list
    : list.filter(e => e.genre === state.genreId);

  // 排序：退修 > 待勘 > 朱注 > 验讫，同档按 id
  const rank = { revise: 0, pending: 1, passed_with_notes: 2, passed: 3, exempt: 4 };
  const sorted = [...filtered].sort((a, b) => {
    const ra = rank[reviewState(a)] ?? 1;
    const rb = rank[reviewState(b)] ?? 1;
    if (ra !== rb) return ra - rb;
    return String(a.id).localeCompare(String(b.id), "zh");
  });

  $("#mainView").innerHTML = `
    <p class="kicker">审印 · 校验台</p>
    <h1 class="page-title">按印分程，按关复审</h1>
    <p class="lead">此栏专供审查判定：待勘开审、退修返工、朱注附注、验讫放行。标准见 <button type="button" class="text-link" data-open-doc="docs/原则/21_故事审查标准.md">21 · 故事审查标准</button>；总簿可对照。</p>

    <div class="review-stage-board" role="tablist" aria-label="审印阶段">
      ${board}
    </div>

    <div class="review-gate-bar filter-row">${chips}</div>
    <div class="filter-row" style="margin-top:-0.35rem">${genreChips}</div>

    ${renderReviewLedger(all, false)}

    <div class="section-head section-loose">
      <h2>${escapeHtml(headTitle)}</h2>
      <span>${sorted.length} 条 · ${escapeHtml(headNote)}</span>
    </div>
    <div class="entry-list is-sparse">
      ${sorted.map(e => renderEntryRow(e)).join("") || `<p class="empty">此阶段尚无篇目。</p>`}
    </div>

    <details class="home-editor-fold" style="margin-top:1.5rem">
      <summary>审核关卡速查 · R0–R3</summary>
      <div class="home-editor-body" style="padding:0.85rem 0.5rem 1rem">
        <div class="world-doc-list">
          <button type="button" class="entry-row" data-open-doc="docs/原则/21_故事审查标准.md">
            <span class="genre-tag">R0</span>
            <span class="title-block"><b>机器底线</b><small>postcheck · 词表 · 重复句</small></span>
            <span class="badge">必过</span>
          </button>
          <button type="button" class="entry-row" data-open-doc="docs/原则/21_故事审查标准.md">
            <span class="genre-tag">R1</span>
            <span class="title-block"><b>可读与完成度</b><small>类型承诺 · 有选择/冲突</small></span>
            <span class="badge">必过</span>
          </button>
          <button type="button" class="entry-row" data-open-doc="docs/原则/21_故事审查标准.md">
            <span class="genre-tag">R2</span>
            <span class="title-block"><b>人物与世界气味</b><small>利害 · 世界边角仍在转</small></span>
            <span class="badge">必过</span>
          </button>
          <button type="button" class="entry-row" data-open-doc="docs/原则/21_故事审查标准.md">
            <span class="genre-tag">R3</span>
            <span class="title-block"><b>语言与声口</b><small>身份差 · 禁裸奔现代腔</small></span>
            <span class="badge">必过</span>
          </button>
          <button type="button" class="entry-row" data-open-doc="stories/审查总簿.md">
            <span class="genre-tag">簿</span>
            <span class="title-block"><b>故事审查总簿</b><small>验讫 · 朱注 · 退修 · 待勘</small></span>
            <span class="badge ok">开簿</span>
          </button>
        </div>
      </div>
    </details>
  `;
}

/* ---------- 世界栏 · 碎片仓（非正文） ---------- */

function worldById(id) {
  if (!id) return null;
  return (state.catalog?.world || []).find(w => w.id === id) || null;
}

function kindLabel(kind) {
  return (WORLD_KIND_LABEL && WORLD_KIND_LABEL[kind]) || kind || "碎片";
}

/** catalog.world[] → 卡片；点卡永远先开本碎片 */
function worldItemToCard(w) {
  const kind = w.kind || "custom";
  const gName = w.group ? groupById(w.group)?.name : "";
  const seeN = (w.see || []).length;
  return {
    id: w.id,
    name: w.name || w.id,
    kind,
    status: w.status || "种子",
    pct: typeof w.fullness === "number" ? w.fullness : 15,
    sub: [kindLabel(kind), gName, seeN ? `联 ${seeN}` : null].filter(Boolean).join(" · "),
    seal: (w.name || w.id || "·")[0],
    path: w.path,
    see: w.see || [],
    group: w.group || null,
    openShard: w.id
  };
}

/**
 * 汇总世界卡：catalog.world 为真源；人物 N 志 + 提及折叠；
 * 未解/卷宗摘来自常量。点碎片 → openShard，不抢开正文。
 */
function collectWorldAtlas() {
  const entries = state.catalog?.entries || [];
  const worldList = state.catalog?.world || [];
  const peopleDossier = [];
  const peopleMention = [];
  const byTab = {
    factions: [],
    places: [],
    creatures: [],
    materials: [],
    customs: [],
    scraps: []
  };
  const shards = [];
  const factionNames = new Set();

  for (const w of worldList) {
    const card = worldItemToCard(w);
    shards.push(card);
    const tab = (WORLD_KIND_TAB && WORLD_KIND_TAB[w.kind]) || "customs";
    if (tab === "factions") {
      byTab.factions.push(card);
      factionNames.add(w.name);
    } else if (byTab[tab]) {
      byTab[tab].push(card);
    } else {
      byTab.customs.push(card);
    }
  }

  for (const e of entries) {
    if (e.genre === "N") {
      const name = (e.people && e.people[0]) || displayTitle(e).replace(/^人物志[·・]?/, "");
      peopleDossier.push({
        id: e.id,
        name,
        kind: "dossier",
        status: e.status || "初稿",
        pct: /通过|成稿|定稿/.test(e.status || "") ? 100 : /初稿/.test(e.status || "") ? 70 : 30,
        sub: (e.scent || []).join(" · ") || "人物志",
        path: e.path,
        openEntry: e.id,
        seal: (name || "人")[0]
      });
    }
  }
  const dossierNames = new Set(peopleDossier.map(p => p.name));
  for (const e of entries) {
    for (const p of e.people || []) {
      if (dossierNames.has(p)) continue;
      if (peopleMention.some(m => m.name === p)) continue;
      peopleMention.push({
        id: `p:${p}`,
        name: p,
        kind: "mention",
        status: "名录",
        pct: 20,
        sub: "正文提及 · 未立志",
        openEntry: e.id,
        seal: p[0]
      });
    }
    for (const f of e.factions || []) {
      if (factionNames.has(f)) continue;
      factionNames.add(f);
      byTab.factions.push({
        id: `f:${f}`,
        name: f,
        kind: "faction",
        status: "见诸正文",
        pct: 25,
        sub: "正文提及 · 未立卡",
        openEntry: e.id,
        seal: f[0]
      });
    }
  }

  // 卷宗入口（非碎片卡）
  byTab.customs.push(
    {
      name: "民俗总录",
      seal: "俗",
      sub: "卷宗 · 节气婚丧",
      pct: 40,
      status: "卷宗",
      openDoc: "docs/社会/15_民俗文化设定.md"
    },
    {
      name: "俗语黑话",
      seal: "话",
      sub: "卷宗 · 行话忌讳",
      pct: 40,
      status: "卷宗",
      openDoc: "docs/社会/18_民间俗语与黑话.md"
    }
  );

  const docs = [
    ...ARCHIVE_SECTIONS.find(s => s.id === "world")?.docs || [],
    ...ARCHIVE_SECTIONS.find(s => s.id === "society")?.docs || [],
    ["docs/素材/09_怪谈异闻录.md", "怪谈异闻录", "种子与使用状态"],
    ["docs/素材/19_伏笔与未解之谜.md", "未解之谜", "七个核心谜团"],
    ["stories/人物志/目录.md", "人物志目录", "N 志总目"],
    ["stories/世界/README.md", "世界碎片仓", "势力·地标·生灵·物产·风物·杂记"]
  ].map(([path, title, note]) => ({
    path, title, note, seal: title[0]
  }));

  const sortPct = (a, b) => (b.pct || 0) - (a.pct || 0);

  return {
    shards: shards.sort(sortPct),
    people: [...peopleDossier.sort(sortPct), ...peopleMention],
    peopleDossier: peopleDossier.sort(sortPct),
    peopleMention,
    factions: byTab.factions.sort(sortPct),
    places: byTab.places.sort(sortPct),
    creatures: byTab.creatures.sort(sortPct),
    materials: byTab.materials.sort(sortPct),
    customs: byTab.customs.sort(sortPct),
    scraps: byTab.scraps.sort(sortPct),
    mysteries: MYSTERIES.map(([id, title, note]) => ({
      id: `m:${id}`,
      name: title,
      seal: id.slice(-1),
      status: "未解",
      pct: 30,
      sub: note,
      openDoc: "docs/素材/19_伏笔与未解之谜.md"
    })),
    docs
  };
}

/** 解析 see[]：正文 / 碎片 / 卷宗 / 未知 */
function resolveSeeLinks(seeList) {
  const out = { entries: [], shards: [], docs: [], other: [] };
  for (const raw of seeList || []) {
    const s = String(raw || "").trim();
    if (!s) continue;
    if (s.startsWith("docs/") || (s.endsWith(".md") && !s.startsWith("stories/世界/"))) {
      out.docs.push({ path: s, label: s.split("/").pop().replace(/\.md$/i, "") });
      continue;
    }
    const w = worldById(s);
    if (w) {
      out.shards.push(w);
      continue;
    }
    const e = entryById(s);
    if (e) {
      out.entries.push(e);
      continue;
    }
    // 反向：正文 people/factions 名命中碎片名
    const byName = (state.catalog?.world || []).find(x => x.name === s);
    if (byName) {
      out.shards.push(byName);
      continue;
    }
    out.other.push(s);
  }
  return out;
}

/** 谁在 see 里指回本卡 + 正文 links/people 弱关联 */
function reverseLinksForShard(w) {
  if (!w?.id) return { shards: [], entries: [] };
  const shards = [];
  for (const other of state.catalog?.world || []) {
    if (other.id === w.id) continue;
    const see = other.see || [];
    if (see.includes(w.id) || see.includes(w.name)) shards.push(other);
  }
  const entries = [];
  for (const e of state.catalog?.entries || []) {
    const links = e.links || [];
    const people = e.people || [];
    const factions = e.factions || [];
    if (
      links.includes(w.id) ||
      people.includes(w.name) ||
      factions.includes(w.name) ||
      (e.scent || []).some(s => s === w.name)
    ) {
      entries.push(e);
    }
  }
  return { shards, entries };
}

function renderWorldCard(item) {
  const locked = item.locked || item.pct < 10;
  const pct = Math.max(0, Math.min(100, item.pct || 0));
  let badge = "";
  if (item.kind === "dossier") badge = `<span class="w-badge">志</span>`;
  else if (item.kind === "mention") badge = `<span class="w-badge w-badge-mute">名</span>`;
  else if (item.status && item.status !== "见诸正文") {
    badge = `<span class="w-badge">${escapeHtml(item.status)}</span>`;
  }
  const attrs = [];
  if (item.openShard) attrs.push(`data-open-shard="${escapeHtml(item.openShard)}"`);
  if (item.openEntry) attrs.push(`data-open-entry="${escapeHtml(item.openEntry)}"`);
  if (item.openDoc) attrs.push(`data-open-doc="${escapeHtml(item.openDoc)}"`);
  if (item.openGroup) attrs.push(`data-open-group="${escapeHtml(item.openGroup)}"`);
  const clickable = attrs.length > 0;
  const tag = clickable ? "button" : "div";
  const typeAttr = clickable ? `type="button"` : "";
  const kindCls = item.openShard ? "is-shard" : "";
  return `
    <${tag} ${typeAttr} class="world-card ${locked ? "is-locked" : ""} ${kindCls}" ${attrs.join(" ")}>
      ${badge}
      <div class="world-card-art" aria-hidden="true">
        <span class="seal-char">${escapeHtml(item.seal || "·")}</span>
        <span class="pct">${pct}%<i style="width:${pct}%"></i></span>
      </div>
      <div class="world-card-body">
        <b>${escapeHtml(item.name)}</b>
        <small>${escapeHtml(item.sub || "")}</small>
      </div>
    </${tag}>`;
}

function renderWorld() {
  const tab = state.worldTab || "shards";
  const atlas = collectWorldAtlas();
  const tabs = WORLD_TABS.map(t => `
    <button type="button" class="world-tab ${tab === t.id ? "is-active" : ""}" data-world-tab="${escapeHtml(t.id)}" title="${escapeHtml(t.hint)}">
      ${escapeHtml(t.name)}
    </button>`).join("");

  let body = "";
  if (tab === "docs") {
    body = `
      <p class="world-subhead">设定原文 · 点开卷宗（长文在 docs，不进碎片仓）</p>
      <div class="world-doc-list">
        ${atlas.docs.map(d => `
          <button type="button" class="entry-row" data-open-doc="${escapeHtml(d.path)}">
            <span class="genre-tag">${escapeHtml(d.seal)}</span>
            <span class="title-block"><b>${escapeHtml(d.title)}</b><small>${escapeHtml(d.note || d.path)}</small></span>
            <span class="badge">开卷</span>
          </button>`).join("")}
      </div>`;
  } else if (tab === "mysteries") {
    body = `
      <p class="world-subhead">核心谜团 · 不给唯一答案</p>
      <div class="world-grid" data-motion="stagger">
        ${atlas.mysteries.map(renderWorldCard).join("")}
      </div>`;
  } else if (tab === "people") {
    body = `
      <p class="world-subhead">已立志 · ${atlas.peopleDossier.length} 条</p>
      <div class="world-grid" data-motion="stagger">
        ${atlas.peopleDossier.map(renderWorldCard).join("") || `<p class="empty">尚无人物志。</p>`}
      </div>
      ${atlas.peopleMention.length ? `
        <details class="world-fold">
          <summary>正文名录 · ${atlas.peopleMention.length} 人（未立志，点开最近出场章）</summary>
          <div class="world-grid world-grid-dense" data-motion="stagger">
            ${atlas.peopleMention.map(renderWorldCard).join("")}
          </div>
        </details>` : ""}`;
  } else {
    const items = atlas[tab] || [];
    const hint = WORLD_TABS.find(t => t.id === tab)?.hint || "";
    body = `
      <p class="world-subhead">${escapeHtml(hint)} · ${items.length} 条 · 点卡先看本碎片</p>
      <div class="world-grid" data-motion="stagger">
        ${items.map(renderWorldCard).join("") || `<p class="empty">此分册尚无碎片。用 scaffold --world 开卡。</p>`}
      </div>`;
  }

  const nWorld = (state.catalog?.world || []).length;
  $("#mainView").innerHTML = `
    <p class="kicker">世界 · 碎片仓</p>
    <h1 class="page-title">杂乱可查，点到为止</h1>
    <p class="lead">此处是设定短卡、杂记、规矩钉子——不是主线正文。已挂 <b>${nWorld}</b> 片；进度条只表成文充实度。点卡开碎片，底栏看关联章与互链卡。</p>
    <div class="world-tabs" role="tablist">${tabs}</div>
    ${body}
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
          <span class="genre-tag">未解</span>
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
  $$(".chrome-tab, .nav-item").forEach(btn => {
    btn.classList.toggle("is-active", btn.dataset.nav === view);
  });
}

function renderView() {
  setNavActive(state.view);
  if (state.view === "home") renderHome();
  else if (state.view === "groups") renderGroups();
  else if (state.view === "genres") renderGenres();
  else if (state.view === "world") renderWorld();
  else if (state.view === "archives") renderArchives();
  else if (state.view === "time") renderTime();
  else if (state.view === "settings") renderSettings();
  else renderHome();
  $("#statusLeft").textContent = statusLeftText();
  if (window.ShanheMotion) {
    try { ShanheMotion.enterView?.(); } catch { /* ignore */ }
  }
}

function statusLeftText() {
  if (state.view === "groups" && state.groupId) {
    const g = groupById(state.groupId);
    return g ? `地脉 · ${g.name}` : "地脉";
  }
  const map = {
    home: "地脉成卷 · 卷内有序 · 世界大于主角。",
    groups: "一书一卷 · 荐读序即连载路径。",
    genres: "审印分程 · 待勘退修朱注验讫。",
    world: "设定碎片 · 点到为止 · 非战力表。",
    archives: "卷宗只读 · 含 24 连载指标。",
    time: "年号是坐标，不是关卡。",
    settings: "案前调驿亭 · 本机记忆。"
  };
  return map[state.view] || map.home;
}

/* ---------- Reader (immersive, top bar) ---------- */

function buildListFromContext() {
  if (state.view === "groups" && state.groupId) {
    return entriesInReadingOrder(state.groupId).map(entryToNav);
  }
  if (state.view === "genres") {
    let list = entriesOfReviewStage(state.reviewStage || "all");
    if (state.genreId && state.genreId !== "all") {
      list = list.filter(e => e.genre === state.genreId);
    }
    return list.map(entryToNav);
  }
  // 默认：河东卷荐读序优先，便于入世直达
  const hedong = entriesInReadingOrder("hedong");
  if (hedong.length) return hedong.map(entryToNav);
  return (state.catalog?.entries || []).map(entryToNav);
}

function entryToNav(e) {
  const vol = volumeForEntry(e);
  const g = groupById(e.group);
  const idx = readingIndex(e);
  const role = resolveRole(e);
  let ordHint = "";
  if (idx >= 0) {
    if (role === "prologue") ordHint = "卷首";
    else if (role === "coda") ordHint = "残页";
    else if (role === "interlude") ordHint = "幕间";
    else ordHint = `第${idx}程`;
  }
  const pathLen = (vol?.reading_path || []).length;
  const progress = idx >= 0 && pathLen ? `${idx + 1}/${pathLen}` : "";
  return {
    kind: "entry",
    id: e.id,
    path: e.path,
    title: displayTitle(e),
    kicker: entryKicker(e),
    progress,
    peak: isPeak(e),
    placeLabel: (() => {
      const place = vol?.name || g?.name || "";
      const bits = [place, roleBadge(e) || genreLabel(e.genre), ordHint].filter(Boolean);
      return bits.join(" · ");
    })()
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

function shardToNav(w) {
  return {
    kind: "shard",
    id: w.id,
    path: w.path,
    title: w.name || w.id,
    kicker: `碎片 · ${kindLabel(w.kind)}`,
    see: w.see || [],
    status: w.status || "",
    fullness: w.fullness,
    group: w.group || null
  };
}

function shardListForTab(kind) {
  const tab = (WORLD_KIND_TAB && WORLD_KIND_TAB[kind]) || "customs";
  const list = (state.catalog?.world || [])
    .filter(w => ((WORLD_KIND_TAB && WORLD_KIND_TAB[w.kind]) || "customs") === tab)
    .map(shardToNav);
  return list.length ? list : null;
}

function openShard(id) {
  const w = worldById(id);
  if (!w) {
    $("#statusRight").textContent = `未找到碎片 ${id}`;
    return;
  }
  if (!w.path) {
    $("#statusRight").textContent = `${w.name || id} 无正文路径`;
    return;
  }
  const item = shardToNav(w);
  const list = shardListForTab(w.kind) || [item];
  openReaderWithList(item, list);
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
  syncHashFromState();
}

function showReader(show, onDone) {
  const shell = $("#appShell");
  const reader = $("#reader");
  if (show) {
    reader.hidden = false;
    reader.setAttribute("aria-hidden", "false");
    shell.style.display = "none";
    document.body.classList.add("is-reading");
    if (window.ShanheMotion) ShanheMotion.openReader();
    if (typeof onDone === "function") onDone();
  } else {
    const finish = () => {
      reader.hidden = true;
      reader.setAttribute("aria-hidden", "true");
      shell.style.display = "";
      document.body.classList.remove("is-reading");
      state.reader.open = false;
      if (typeof onDone === "function") onDone();
    };
    if (window.ShanheMotion) ShanheMotion.closeReaderMotion(finish);
    else finish();
  }
}

function tocMarkForItem(item, indexInList) {
  if (!item) return String(indexInList + 1);
  if (item.kind === "doc") return "宗";
  if (item.kind === "shard") return "片";
  const entry = entryById(item.id);
  if (!entry) return String(indexInList + 1);
  const role = resolveRole(entry);
  if (role === "prologue") return "卷";
  if (role === "coda") return "残";
  if (role === "interlude") return "幕";
  const idx = readingIndex(entry);
  if (idx >= 0) return String(idx);
  return String(indexInList + 1);
}

function tocSubForItem(item) {
  if (!item) return "";
  if (item.kind === "doc") return "卷宗";
  if (item.kind === "shard") {
    const w = worldById(item.id);
    return kindLabel(w?.kind || item.kicker) + (item.status ? ` · ${item.status}` : "");
  }
  const entry = entryById(item.id);
  if (!entry) return item.kicker || "";
  const role = resolveRole(entry);
  if (role === "prologue") return "卷首";
  if (role === "coda") return "残页";
  if (role === "interlude") return "幕间";
  const track = trackLabel(entry);
  const genre = genreLabel(entry.genre);
  return [track, genre].filter(Boolean).join(" · ");
}

function tocSectionLabel(item) {
  if (!item) return "";
  if (item.kind === "doc") return "卷宗";
  if (item.kind === "shard") {
    const w = worldById(item.id);
    return kindLabel(w?.kind) || "碎片";
  }
  const entry = entryById(item.id);
  if (!entry) return "程目";
  const track = entry.track || "other";
  if (track === "main") return "主路";
  if (track === "side") return "旁支";
  return "铺地";
}

function renderReaderToc() {
  const r = state.reader;
  const toc = $("#readerToc");
  const scrim = $("#readerTocScrim");
  const toggle = $("#readerTocToggle");
  const edge = $("#readerTocEdge");
  const readerEl = $("#reader");
  if (!toc || !readerEl) return;

  const item = r.list[r.index];
  const list = r.list || [];
  if (r.tocOpen === undefined || r.tocOpen === null) {
    r.tocOpen = loadTocOpenPref();
  }
  const open = !!r.tocOpen;
  const mobile = isReaderMobile();
  readerEl.classList.toggle("toc-collapsed", !open);
  if (toggle) {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("title", open ? "掩目 (T)" : "程目 (T)");
    toggle.classList.toggle("is-on", open);
    toggle.textContent = open ? "掩目" : "程目";
  }
  const dockToc = $("#dockToc");
  if (dockToc) {
    dockToc.setAttribute("aria-expanded", open ? "true" : "false");
    dockToc.classList.toggle("is-on", open);
    dockToc.textContent = open ? "掩目" : "程目";
  }
  if (scrim) scrim.hidden = !(open && mobile);
  if (edge) {
    // 仅窄屏收起时显示边缘拉手；桌面收起用窄轨
    edge.hidden = !(mobile && !open);
  }

  if (!list.length) {
    toc.innerHTML = `<div class="reader-toc-empty">此程无目录</div>`;
    return;
  }

  const volName = (() => {
    if (item?.kind === "entry") {
      const e = entryById(item.id);
      const vol = e ? volumeForEntry(e) : null;
      const g = e ? groupById(e.group) : null;
      return vol?.name || g?.name || "本卷";
    }
    if (item?.kind === "shard") {
      const w = worldById(item.id);
      return `碎片 · ${kindLabel(w?.kind)}`;
    }
    return "卷宗";
  })();

  const total = list.length;
  const cur = r.index >= 0 ? r.index + 1 : 0;
  const progressPct = total > 0 ? Math.round(((Math.max(r.index, 0) + 1) / total) * 100) : 0;
  const curMark = item ? tocMarkForItem(item, r.index) : "·";
  let lastSec = "";
  const rows = list.map((nav, i) => {
    const sec = tocSectionLabel(nav);
    let secHtml = "";
    if (sec && sec !== lastSec) {
      lastSec = sec;
      secHtml = `<div class="reader-toc-sec">${escapeHtml(sec)}</div>`;
    }
    const isCur = i === r.index;
    const isRead = nav.kind === "entry" && isEntryRead(nav.id);
    const isPeak = !!nav.peak;
    const cls = [
      "reader-toc-item",
      isCur ? "is-current" : "",
      isRead ? "is-read" : "",
      isPeak ? "is-peak" : ""
    ].filter(Boolean).join(" ");
    const mark = tocMarkForItem(nav, i);
    const sub = tocSubForItem(nav);
    return `${secHtml}<button type="button" class="${cls}" data-toc-index="${i}" title="${escapeHtml(nav.title || "")}">
      <span class="toc-mark" aria-hidden="true">${escapeHtml(mark)}</span>
      <span class="toc-body">
        <span class="toc-name">${escapeHtml(nav.title || nav.id || "")}</span>
        ${sub ? `<span class="toc-sub">${escapeHtml(sub)}</span>` : ""}
      </span>
    </button>`;
  }).join("");

  toc.innerHTML = `
    <button type="button" class="reader-toc-rail-mini" id="readerTocMini" title="展开程目 (T)" aria-label="展开程目">
      <span class="mini-mark" aria-hidden="true">${escapeHtml(curMark)}</span>
      <span class="mini-spine" aria-hidden="true"><i style="height:${progressPct}%"></i></span>
      <span class="mini-label">程目</span>
    </button>
    <div class="reader-toc-body">
      <div class="reader-toc-head">
        <div class="reader-toc-head-text">
          <span class="reader-toc-kicker">程目</span>
          <h2 class="reader-toc-title">${escapeHtml(volName)}</h2>
          <p class="reader-toc-meta">${cur}/${total} · 金线序</p>
        </div>
        <button type="button" class="reader-toc-collapse" id="readerTocCollapse" title="掩目 (T)" aria-label="掩目">掩</button>
      </div>
      <div class="reader-toc-rail">${rows}</div>
    </div>
  `;

  requestAnimationFrame(() => {
    if (!open) return;
    const curBtn = toc.querySelector(".reader-toc-item.is-current");
    if (curBtn && typeof curBtn.scrollIntoView === "function") {
      curBtn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  });
}

function setReaderTocOpen(open) {
  state.reader.tocOpen = !!open;
  saveTocOpenPref(!!open);
  renderReaderToc();
}

function toggleReaderToc() {
  setReaderTocOpen(!state.reader.tocOpen);
}

function applyReaderChrome() {
  const r = state.reader;
  const item = r.list[r.index];
  if (!item) return;

  // 每次开卷按当前视口偏好恢复（桌面/移动分记）
  if (r.tocOpen === undefined || r.tocOpen === null) {
    r.tocOpen = loadTocOpenPref();
  }

  const peakSuffix = item.peak ? " · 高峰" : "";
  $("#readerKicker").textContent = (item.kicker || "") + peakSuffix;
  $("#readerTitle").textContent = item.title || "";
  const prog = item.progress ? ` · 程 ${item.progress}` : "";
  $("#readerPath").textContent = (item.placeLabel || item.kicker || "") + prog;

  const readerReview = $("#readerReview");
  if (readerReview) {
    if (item.kind === "entry") {
      const entry = entryById(item.id);
      const meta = reviewMeta(entry);
      const note = meta.note || "";
      const longNote = note.length > 28;
      const notePreview = longNote ? `${note.slice(0, 28)}…` : note;
      const dateBit = meta.date
        ? `<small class="rr-date">${escapeHtml(meta.date)}${meta.round ? ` ·${escapeHtml(String(meta.round))}轮` : ""}</small>`
        : "";
      readerReview.hidden = false;
      readerReview.className = `reader-review review-${meta.className}${longNote ? " is-collapsible" : ""}`;
      readerReview.innerHTML = `
        <div class="rr-strip" role="group" aria-label="审印">
          ${renderReviewSeal(entry, { compact: true })}
          <b class="rr-label">${escapeHtml(meta.label)}</b>
          ${dateBit}
          ${note ? `<span class="rr-chip is-preview" title="${escapeHtml(note)}">${escapeHtml(notePreview)}</span>` : `<span class="rr-chip is-mute">无批注</span>`}
          ${longNote ? `<button type="button" class="rr-expand" aria-expanded="false" data-rr-expand="1">详</button>` : ""}
          ${meta.report ? `<button type="button" class="rr-doc" data-open-doc="${escapeHtml(meta.report)}">批</button>` : ""}
        </div>
        <div class="rr-detail" hidden>
          <p class="rr-note is-full">${escapeHtml(note)}</p>
        </div>`;
    } else if (item.kind === "shard") {
      const w = worldById(item.id);
      const pct = typeof w?.fullness === "number" ? w.fullness : item.fullness || 0;
      const kind = kindLabel(w?.kind);
      readerReview.hidden = false;
      readerReview.className = "reader-review review-shard";
      readerReview.innerHTML = `
        <span class="shard-mark" aria-hidden="true">片</span>
        <span class="shard-meta">
          <b>${escapeHtml(kind)}</b>
          <em>${escapeHtml(w?.status || "种子")} · ${pct}%</em>
        </span>
        <button type="button" data-nav="world" data-world-tab="${escapeHtml((WORLD_KIND_TAB && WORLD_KIND_TAB[w?.kind]) || "shards")}">回分册</button>`;
    } else {
      readerReview.hidden = true;
      readerReview.innerHTML = "";
    }
  }

  const prev = $("#readerPrev");
  const next = $("#readerNext");
  const atStart = r.index <= 0;
  const atEnd = r.index >= r.list.length - 1;
  prev.disabled = atStart;
  next.disabled = atEnd;
  const dockPrev = $("#dockPrev");
  const dockNext = $("#dockNext");
  if (dockPrev) dockPrev.disabled = atStart;
  if (dockNext) dockNext.disabled = atEnd;

  // 进度条（按当前列表序）
  let progressEl = $("#readerProgress");
  if (progressEl) {
    const total = r.list.length;
    const cur = r.index + 1;
    if (total > 0) {
      const pct = Math.round((cur / total) * 100);
      progressEl.hidden = false;
      progressEl.innerHTML = `<i style="width:${pct}%"></i><span>${cur}/${total}</span>`;
    } else {
      progressEl.hidden = true;
      progressEl.innerHTML = "";
    }
  }

  renderReaderToc();

  const linksEl = $("#readerLinks");
  const footEl = linksEl?.closest(".reader-foot");
  if (item.kind === "entry") {
    const entry = entryById(item.id);
    const links = (entry?.links || []).map(id => entryById(id)).filter(Boolean);
    const prevItem = r.index > 0 ? r.list[r.index - 1] : null;
    const nextItem = r.index < r.list.length - 1 ? r.list[r.index + 1] : null;
    const navBits = [];
    if (prevItem?.kind === "entry") {
      navBits.push(`<button type="button" class="nav-hint prev" data-reader-delta="-1">← 上程 · ${escapeHtml(prevItem.title)}</button>`);
    }
    if (nextItem?.kind === "entry") {
      navBits.push(`<button type="button" class="nav-hint next" data-reader-delta="1">下程 · ${escapeHtml(nextItem.title)} →</button>`);
    }
    const linkBits = links.length
      ? links.map(e =>
          `<button type="button" data-open-entry="${escapeHtml(e.id)}">${escapeHtml(displayTitle(e))}</button>`
        ).join("")
      : "";
    // 正文也可跳到关联碎片
    const worldHits = (state.catalog?.world || []).filter(w =>
      (w.see || []).includes(item.id) || (entry?.people || []).includes(w.name) || (entry?.factions || []).includes(w.name)
    ).slice(0, 6);
    const shardBits = worldHits.map(w =>
      `<button type="button" data-open-shard="${escapeHtml(w.id)}">片·${escapeHtml(w.name)}</button>`
    ).join("");
    linksEl.innerHTML = `${navBits.join("")}${linkBits}${shardBits}`;
    if (footEl) footEl.classList.toggle("is-empty", !(linkBits || shardBits));
  } else if (item.kind === "shard") {
    linksEl.innerHTML = renderShardLinkBar(item);
    if (footEl) footEl.classList.toggle("is-empty", !linksEl.innerHTML.trim());
  } else {
    linksEl.innerHTML = "";
    if (footEl) footEl.classList.add("is-empty");
  }
}

function renderShardLinkBar(item) {
  const w = worldById(item.id) || { id: item.id, name: item.title, see: item.see || [] };
  const fwd = resolveSeeLinks(w.see || item.see || []);
  const rev = reverseLinksForShard(w);
  const bits = [];
  const prevItem = state.reader.index > 0 ? state.reader.list[state.reader.index - 1] : null;
  const nextItem = state.reader.index < state.reader.list.length - 1 ? state.reader.list[state.reader.index + 1] : null;
  if (prevItem?.kind === "shard") {
    bits.push(`<button type="button" class="nav-hint prev" data-reader-delta="-1">← ${escapeHtml(prevItem.title)}</button>`);
  }
  if (nextItem?.kind === "shard") {
    bits.push(`<button type="button" class="nav-hint next" data-reader-delta="1">${escapeHtml(nextItem.title)} →</button>`);
  }
  for (const e of fwd.entries) {
    bits.push(`<button type="button" data-open-entry="${escapeHtml(e.id)}">章 · ${escapeHtml(displayTitle(e))}</button>`);
  }
  for (const s of fwd.shards) {
    bits.push(`<button type="button" data-open-shard="${escapeHtml(s.id)}">联 · ${escapeHtml(s.name)}</button>`);
  }
  for (const d of fwd.docs) {
    bits.push(`<button type="button" data-open-doc="${escapeHtml(d.path)}">宗 · ${escapeHtml(d.label)}</button>`);
  }
  for (const s of rev.shards) {
    if ((w.see || []).includes(s.id)) continue;
    bits.push(`<button type="button" data-open-shard="${escapeHtml(s.id)}">回指 · ${escapeHtml(s.name)}</button>`);
  }
  for (const e of rev.entries.slice(0, 8)) {
    if (fwd.entries.some(x => x.id === e.id)) continue;
    bits.push(`<button type="button" data-open-entry="${escapeHtml(e.id)}">出场 · ${escapeHtml(displayTitle(e))}</button>`);
  }
  if (!bits.length) {
    return `<span class="reader-links-empty">暂无关联 · 可在碎片 frontmatter 的 see 里挂章/卡</span>`;
  }
  return bits.join("");
}

async function loadReaderBody() {
  const r = state.reader;
  const item = r.list[r.index];
  const body = $("#readerBody");
  if (!item?.path) {
    body.innerHTML = `<div class="reader-inner"><p class="empty">无路径可读取。</p></div>`;
    return;
  }
  const pathKey = item.path;
  const reqId = `${pathKey}#${Date.now()}`;
  r._bodyReq = reqId;

  if (textCache.has(pathKey)) {
    body.innerHTML = composeReaderBodyHtml(item, textCache.get(pathKey));
    resetReaderScroll();
    return;
  }

  body.innerHTML = `<div class="reader-inner"><p class="empty">正在取卷……</p></div>`;
  try {
    const text = await fetchText(`/project/${encodeURI(pathKey)}`, { timeout: 15000 });
    if (r._bodyReq !== reqId) return; // 已翻到别的程
    if (textCache.size > 40) {
      const first = textCache.keys().next().value;
      textCache.delete(first);
    }
    textCache.set(pathKey, text);
    body.innerHTML = composeReaderBodyHtml(item, text);
    resetReaderScroll();
  } catch (err) {
    if (r._bodyReq !== reqId) return;
    const aborted = err?.name === "AbortError";
    body.innerHTML = `<div class="reader-inner">
      <h2 class="md-h2">${aborted ? "取卷超时" : "无法读取"}</h2>
      <p>${aborted
        ? "路途稍远，请再点一次下程，或检查本机服务是否仍在跑。"
        : "请通过仓库根目录「启动世界观网页.bat」或 npm start 打开本地服务。file:// 无法读取 Markdown。"}</p>
      <pre>${escapeHtml(pathKey)}</pre>
      <p style="margin-top:1rem"><button type="button" class="btn-bar" data-retry-body="1">再取一次</button></p>
    </div>`;
  }
}

/** 正文 HTML；碎片附加关联面板 */
function composeReaderBodyHtml(item, mdText) {
  const main = markdownToHtml(mdText);
  if (item?.kind !== "shard") {
    return `<div class="reader-inner">${main}</div>`;
  }
  const panel = renderShardRelatedPanel(item);
  return `<div class="reader-inner is-shard">${main}${panel}</div>`;
}

function renderShardRelatedPanel(item) {
  const w = worldById(item.id) || { id: item.id, name: item.title, see: item.see || [], kind: "custom" };
  const fwd = resolveSeeLinks(w.see || []);
  const rev = reverseLinksForShard(w);
  const row = (label, buttons) =>
    buttons
      ? `<div class="shard-rel-row"><span class="shard-rel-k">${escapeHtml(label)}</span><div class="shard-rel-btns">${buttons}</div></div>`
      : "";
  const entryBtns = [...fwd.entries, ...rev.entries.filter(e => !fwd.entries.some(x => x.id === e.id))]
    .slice(0, 12)
    .map(e => `<button type="button" class="shard-chip" data-open-entry="${escapeHtml(e.id)}">${escapeHtml(displayTitle(e))}<small>${escapeHtml(e.id)}</small></button>`)
    .join("");
  const shardBtns = [...fwd.shards, ...rev.shards.filter(s => !fwd.shards.some(x => x.id === s.id))]
    .slice(0, 12)
    .map(s => `<button type="button" class="shard-chip" data-open-shard="${escapeHtml(s.id)}">${escapeHtml(s.name)}<small>${escapeHtml(kindLabel(s.kind))}</small></button>`)
    .join("");
  const docBtns = fwd.docs
    .map(d => `<button type="button" class="shard-chip" data-open-doc="${escapeHtml(d.path)}">${escapeHtml(d.label)}<small>卷宗</small></button>`)
    .join("");
  const empty = !entryBtns && !shardBtns && !docBtns;
  return `
    <aside class="shard-related" aria-label="关联">
      <header class="shard-related-head">
        <span class="kicker">关联</span>
        <h2>从这张碎片出发</h2>
        <p>见诸正文 · 互链碎片 · 卷宗长文。点开可跳，不改本卡。</p>
      </header>
      ${empty ? `<p class="empty">尚无 see / 回指。写卡时在 frontmatter 挂上 Z00x 或 WLD- 即可。</p>` : ""}
      ${row("正文", entryBtns)}
      ${row("碎片", shardBtns)}
      ${row("卷宗", docBtns)}
    </aside>`;
}

async function readerGo(delta) {
  const r = state.reader;
  const next = r.index + delta;
  if (next < 0 || next >= r.list.length) return;
  await readerGoTo(next);
}

async function readerGoTo(index) {
  const r = state.reader;
  if (index < 0 || index >= r.list.length) return;
  r.index = index;
  const item = r.list[index];
  r.kind = item.kind;
  r.id = item.id;
  r.path = item.path;
  if (item.kind === "entry" && item.id) markEntryRead(item.id);
  applyReaderChrome();
  await loadReaderBody();
  syncHashFromState();
  if (window.ShanheMotion) ShanheMotion.turnPage();
  // 窄屏点选后自动收起程目，让正文露出来
  if (typeof matchMedia === "function" && matchMedia("(max-width: 860px)").matches) {
    setReaderTocOpen(false);
  }
  resetReaderScroll();
}

function resetReaderScroll() {
  const body = $("#readerBody");
  const scroller = body?.closest(".reader-scroll") || body;
  if (scroller) scroller.scrollTop = 0;
  if (body && body !== scroller) body.scrollTop = 0;
}

function closeReader() {
  showReader(false, () => {
    renderView();
    syncHashFromState();
    if (window.ShanheMotion) ShanheMotion.enterView();
  });
}

function openEntry(id, listOverride) {
  const entry = entryById(id);
  if (!entry) {
    $("#statusRight").textContent = `未找到 ${id}`;
    return;
  }
  markEntryRead(id);
  const item = entryToNav(entry);
  let list = listOverride;
  if (!list) {
    // 侧栏程目：主路径在前，其余同卷条目顺延（与旧顶栏子导航同序）
    list = entriesInReadingOrder(entry.group, "main").map(entryToNav);
    if (list.length < 2) list = mainPathEntries(entry.group).map(entryToNav);
    if (list.length < 2) list = buildListFromContext();
  }
  openReaderWithList(item, list);
}

/** 金线局部翻页：只换金线块，避免整页闪烁 */
function turnGoldPage(groupId, dir) {
  if (!groupId || !dir) return;
  if (!state.goldPage) state.goldPage = {};
  const path = mainPathEntries(groupId);
  const pages = Math.max(1, Math.ceil(path.length / GOLD_PAGE_SIZE));
  let page = Number(state.goldPage[groupId] || 0) + dir;
  if (page < 0) page = 0;
  if (page >= pages) page = pages - 1;
  state.goldPage[groupId] = page;
  const host = document.querySelector(`.gold-path[data-gp-group="${groupId}"]`);
  if (!host) {
    renderView();
    return;
  }
  const wrap = document.createElement("div");
  wrap.innerHTML = renderGoldPath(groupId).trim();
  const next = wrap.firstElementChild;
  if (!next) {
    renderView();
    return;
  }
  host.replaceWith(next);
  if (window.ShanheMotion?.pulseRail) {
    ShanheMotion.pulseRail(next);
  } else if (window.ShanheMotion?.enterView) {
    // 轻量：只描本条金线
    const stroke = next.querySelector(".gp-stroke");
    const nodes = next.querySelectorAll(".gp-node");
    if (window.gsap && stroke) {
      try {
        const gsap = window.gsap;
        gsap.fromTo(stroke, { opacity: 0.35 }, { opacity: 0.85, duration: 0.35 });
        gsap.fromTo(nodes, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.32, stagger: 0.04, ease: "power2.out" });
      } catch { /* ignore */ }
    }
  }
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
      title: displayTitle(e),
      meta: `${entryKicker(e)} · ${reviewMeta(e).label}`,
      text: `${e.title} ${displayTitle(e)} ${(e.people || []).join(" ")} ${(e.scent || []).join(" ")} ${e.status || ""} ${reviewMeta(e).label} ${e.review?.note || ""} ${e.id}`,
      action: { type: "entry", id: e.id }
    });
  }
  for (const w of state.catalog?.world || []) {
    const see = (w.see || []).join(" ");
    const action = w.path
      ? { type: "shard", id: w.id }
      : { type: "world", tab: (WORLD_KIND_TAB && WORLD_KIND_TAB[w.kind]) || "shards" };
    items.push({
      title: w.name || w.id,
      meta: `碎片 · ${kindLabel(w.kind)} · ${w.status || ""}`,
      text: `${w.name} ${w.id} ${w.kind} ${w.status || ""} ${see}`,
      action
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
        let attrs = "";
        if (i.action.type === "entry") attrs = `data-open-entry="${escapeHtml(i.action.id)}"`;
        else if (i.action.type === "shard") attrs = `data-open-shard="${escapeHtml(i.action.id)}"`;
        else if (i.action.type === "group") attrs = `data-open-group="${escapeHtml(i.action.id)}"`;
        else if (i.action.type === "world") attrs = `data-world-tab="${escapeHtml(i.action.tab || "shards")}"`;
        else attrs = `data-open-doc="${escapeHtml(i.action.path)}"`;
        return `<button type="button" class="search-result" ${attrs}><b>${escapeHtml(i.title)}</b><small>${escapeHtml(i.meta)}</small></button>`;
      }).join("")
    : `<div class="search-empty">
        <span class="search-empty-mark">寻</span>
        <span>${q ? "未找到相合 · 换个词再寻" : "键入地脉、人物、碎片或章名"}</span>
      </div>`;
}

function openSearch() {
  $("#searchLayer").hidden = false;
  $("#searchInput").value = "";
  renderSearch();
  if (window.ShanheMotion) ShanheMotion.openSearch();
  else setTimeout(() => $("#searchInput").focus(), 20);
}

function closeSearch() {
  if (window.ShanheMotion) {
    ShanheMotion.closeSearch(() => {
      $("#searchLayer").hidden = true;
    });
  } else {
    $("#searchLayer").hidden = true;
  }
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
  if (view === "genres" && opts.reviewStage !== undefined) {
    state.reviewStage = opts.reviewStage;
  }
  if (view === "world" && opts.worldTab !== undefined) {
    state.worldTab = opts.worldTab;
  }
  const after = () => {
    renderView();
    window.scrollTo(0, 0);
    if (window.ShanheMotion) ShanheMotion.enterView();
    if (!opts.skipHash) syncHashFromState();
  };
  if (state.reader.open) {
    showReader(false, after);
    return;
  }
  after();
}

/* ---------- Hash 路由（可分享） ---------- */

function syncHashFromState() {
  try {
    let hash = "#/home";
    if (state.reader.open && state.reader.id) {
      if (state.reader.kind === "entry") hash = `#/read/${encodeURIComponent(state.reader.id)}`;
      else if (state.reader.kind === "shard") hash = `#/shard/${encodeURIComponent(state.reader.id)}`;
      else if (state.reader.kind === "doc" && state.reader.path) {
        hash = `#/doc/${encodeURIComponent(state.reader.path)}`;
      }
    } else if (state.view === "groups" && state.groupId) {
      hash = `#/vol/${encodeURIComponent(state.groupId)}`;
    } else if (state.view === "groups") {
      hash = "#/vol";
    } else if (state.view === "genres") {
      const st = state.reviewStage && state.reviewStage !== "all" ? state.reviewStage : "all";
      hash = `#/seal/${encodeURIComponent(st)}`;
    } else if (state.view === "world") {
      hash = `#/world/${encodeURIComponent(state.worldTab || "shards")}`;
    } else if (state.view === "archives") hash = "#/archives";
    else if (state.view === "time") hash = "#/time";
    else if (state.view === "settings") hash = "#/settings";
    else hash = "#/home";
    if (location.hash !== hash) {
      history.replaceState(null, "", hash);
    }
  } catch { /* ignore */ }
}

function applyHashRoute() {
  const raw = (location.hash || "").replace(/^#/, "");
  const parts = raw.split("/").filter(Boolean);
  if (!parts.length) {
    state.view = "home";
    return;
  }
  const head = parts[0];
  if (head === "home" || head === "") {
    state.view = "home";
  } else if (head === "vol") {
    state.view = "groups";
    state.groupId = parts[1] ? decodeURIComponent(parts[1]) : null;
  } else if (head === "seal") {
    state.view = "genres";
    state.reviewStage = parts[1] ? decodeURIComponent(parts[1]) : "all";
  } else if (head === "world") {
    state.view = "world";
    state.worldTab = parts[1] ? decodeURIComponent(parts[1]) : "shards";
  } else if (head === "archives") {
    state.view = "archives";
  } else if (head === "time") {
    state.view = "time";
  } else if (head === "settings") {
    state.view = "settings";
  } else if (head === "read" && parts[1]) {
    const id = decodeURIComponent(parts[1]);
    // 开卷在 boot / hashchange 里调用 openEntry
    state._pendingRead = id;
  } else if (head === "shard" && parts[1]) {
    state._pendingShard = decodeURIComponent(parts[1]);
  } else if (head === "doc" && parts[1]) {
    state._pendingDoc = decodeURIComponent(parts.slice(1).join("/"));
  } else {
    state.view = "home";
  }
}

function renderCatalogError(msg) {
  const main = $("#mainView");
  if (!main) return;
  main.innerHTML = `
    <section class="panel empty-panel" style="padding:2.5rem 1.5rem;text-align:center;max-width:28rem;margin:3rem auto;">
      <p class="kicker">驿路不通</p>
      <h2 style="font-family:var(--display);font-weight:400;margin:0.5rem 0 1rem;">卷册未送达</h2>
      <p class="lede" style="opacity:0.85;line-height:1.7;">${escapeHtml(msg || "catalog 未能加载。请用仓库根目录 npm start 或「启动世界观网页.bat」打开本机服务。")}</p>
      <p style="margin-top:1.25rem;font-size:0.9rem;opacity:0.7;">目标地址 <code>http://127.0.0.1:4182/</code></p>
    </section>`;
}

/* ---------- Bootstrap ---------- */

function catalogStatusLine() {
  const n = state.catalog?.entries?.length || 0;
  const g = state.catalog?.groups?.length || 0;
  const v = state.catalog?.volumes?.length || 0;
  const w = state.catalog?.world?.length || 0;
  const p = state.projectFiles?.length || 0;
  if (p) return `已连接 · ${v} 卷 · ${g} 地脉 · ${n} 篇 · ${w} 碎片 · ${p} 卷宗`;
  return `已连接 · ${v} 卷 · ${g} 地脉 · ${n} 篇 · ${w} 碎片`;
}

async function loadCatalog() {
  try {
    const data = await fetchJson("/stories/catalog.json", { timeout: 10000, cache: "default" });
    if (!data || typeof data !== "object") throw new Error("catalog 格式异常");
    state.catalog = {
      ...data,
      groups: Array.isArray(data.groups) ? data.groups : [],
      entries: Array.isArray(data.entries) ? data.entries : [],
      world: Array.isArray(data.world) ? data.world : [],
      volumes: Array.isArray(data.volumes) ? data.volumes : []
    };
    state._catalogError = null;
    return true;
  } catch (err) {
    state.catalog = { groups: [], entries: [], world: [], volumes: [] };
    const msg = err?.name === "AbortError"
      ? "catalog 加载超时"
      : (err?.message || "catalog");
    state._catalogError = msg;
    return false;
  }
}

/** 卷宗索引较重：首屏后空闲再拉，不挡入世 */
async function connectProject() {
  try {
    const data = await fetchJson("/__project-index", { timeout: 20000, cache: "default" });
    state.projectFiles = Array.isArray(data?.files) ? data.files : [];
    $("#statusRight").textContent = catalogStatusLine();
  } catch {
    if (!state.projectFiles?.length) {
      $("#statusRight").textContent = catalogStatusLine() + " · 卷宗索引稍后/静态";
    }
  }
}

function scheduleConnectProject() {
  const run = () => {
    connectProject().catch(() => { /* status already set */ });
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(run, { timeout: 3000 });
  } else {
    setTimeout(run, 200);
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
      else if (v === "world") {
        if (nav.dataset.worldTab) state.worldTab = nav.dataset.worldTab;
        // 从碎片阅读器回分册时先掩卷
        if (state.reader.open) {
          showReader(false, () => goView("world", { worldTab: state.worldTab }));
        } else {
          goView("world", { worldTab: state.worldTab });
        }
      } else if (v === "archives") goView("archives");
      else if (v === "time") goView("time");
      else if (v === "settings") goView("settings");
      return;
    }

    const revStage = event.target.closest("[data-review-stage]");
    if (revStage) {
      event.preventDefault();
      state.reviewStage = revStage.dataset.reviewStage || "all";
      if (state.view !== "genres") state.view = "genres";
      renderView();
      syncHashFromState();
      return;
    }

    const worldTab = event.target.closest("[data-world-tab]");
    if (worldTab) {
      event.preventDefault();
      state.worldTab = worldTab.dataset.worldTab || "shards";
      if (state.view !== "world") state.view = "world";
      renderView();
      syncHashFromState();
      return;
    }

    const setOpt = event.target.closest("[data-set-key]");
    if (setOpt) {
      event.preventDefault();
      updateSetting(setOpt.dataset.setKey, setOpt.dataset.setValue);
      return;
    }

    const setToggle = event.target.closest("[data-set-toggle]");
    if (setToggle) {
      event.preventDefault();
      const key = setToggle.dataset.setToggle;
      const cur = (state.settings || loadSettings())[key];
      updateSetting(key, cur === "off" ? "on" : "off");
      return;
    }

    if (event.target.closest("#btnResetSettings")) {
      event.preventDefault();
      resetSettings();
      return;
    }

    const gpPage = event.target.closest("[data-gp-page]");
    if (gpPage && !gpPage.disabled) {
      event.preventDefault();
      const gid = gpPage.dataset.gpPage;
      const dir = Number(gpPage.dataset.gpDir || 0);
      if (!gid || !dir) return;
      turnGoldPage(gid, dir);
      return;
    }

    const exploreFilter = event.target.closest("[data-explore-filter]");
    if (exploreFilter) {
      event.preventDefault();
      state.exploreFilter = exploreFilter.dataset.exploreFilter || "track:main";
      const gid = exploreFilter.dataset.openGroup;
      if (gid) state.groupId = gid;
      goView("groups");
      return;
    }

    const explore = event.target.closest("[data-explore]");
    if (explore) {
      event.preventDefault();
      const raw = explore.dataset.explore || "track:main";
      state.exploreFilter = raw;
      const gid = explore.dataset.openGroup;
      if (gid) state.groupId = gid;
      goView("groups");
      return;
    }

    const group = event.target.closest("[data-open-group]");
    if (group) {
      closeSearch();
      const id = group.dataset.openGroup;
      state.groupId = id || null;
      if (!id) state.exploreFilter = "track:main";
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

    const tocItem = event.target.closest("[data-toc-index]");
    if (tocItem) {
      const i = Number(tocItem.dataset.tocIndex);
      if (!Number.isNaN(i)) readerGoTo(i);
      return;
    }

    const deltaBtn = event.target.closest("[data-reader-delta]");
    if (deltaBtn) {
      const d = Number(deltaBtn.dataset.readerDelta);
      if (d) readerGo(d);
      return;
    }

    const entry = event.target.closest("[data-open-entry]");
    if (entry) {
      closeSearch();
      openEntry(entry.dataset.openEntry);
      return;
    }

    const shard = event.target.closest("[data-open-shard]");
    if (shard) {
      closeSearch();
      openShard(shard.dataset.openShard);
      return;
    }

    const doc = event.target.closest("[data-open-doc]");
    if (doc) {
      closeSearch();
      openDoc(doc.dataset.openDoc);
      return;
    }

    if (event.target.closest("[data-retry-body]")) {
      event.preventDefault();
      // 清掉该程缓存再取
      const p = state.reader?.path;
      if (p) textCache.delete(p);
      loadReaderBody();
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
  const dockPrev = $("#dockPrev");
  const dockNext = $("#dockNext");
  const dockToc = $("#dockToc");
  if (dockPrev) dockPrev.addEventListener("click", () => readerGo(-1));
  if (dockNext) dockNext.addEventListener("click", () => readerGo(1));
  if (dockToc) dockToc.addEventListener("click", toggleReaderToc);
  const tocToggle = $("#readerTocToggle");
  if (tocToggle) tocToggle.addEventListener("click", toggleReaderToc);
  const tocScrim = $("#readerTocScrim");
  if (tocScrim) tocScrim.addEventListener("click", () => setReaderTocOpen(false));
  const tocEdge = $("#readerTocEdge");
  if (tocEdge) tocEdge.addEventListener("click", () => setReaderTocOpen(true));

  // 审印条：扁条「详」展开全文批注
  const readerReviewRoot = $("#readerReview");
  if (readerReviewRoot) {
    readerReviewRoot.addEventListener("click", e => {
      const btn = e.target.closest("[data-rr-expand]");
      if (!btn) return;
      e.preventDefault();
      const box = readerReviewRoot;
      const open = box.classList.toggle("is-expanded");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.textContent = open ? "收" : "详";
      const detail = box.querySelector(".rr-detail");
      if (detail) detail.hidden = !open;
    });
  }

  // 侧栏内：窄轨展开 / 头栏「掩」（章目仍走 document 委托 data-toc-index）
  const tocRoot = $("#readerToc");
  if (tocRoot) {
    tocRoot.addEventListener("click", e => {
      if (e.target.closest("#readerTocMini")) {
        e.stopPropagation();
        setReaderTocOpen(true);
        return;
      }
      if (e.target.closest("#readerTocCollapse")) {
        e.stopPropagation();
        setReaderTocOpen(false);
      }
    });
  }

  // 视口跨断点时重载对应偏好
  if (typeof matchMedia === "function") {
    const mql = matchMedia("(max-width: 860px)");
    const onBreak = () => {
      if (!state.reader.open) return;
      state.reader.tocOpen = loadTocOpenPref();
      renderReaderToc();
    };
    if (typeof mql.addEventListener === "function") mql.addEventListener("change", onBreak);
    else if (typeof mql.addListener === "function") mql.addListener(onBreak);
  }

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
        // 窄屏程目展开时 Esc 先收栏，再掩卷
        if (isReaderMobile() && state.reader.tocOpen) {
          setReaderTocOpen(false);
          return;
        }
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
      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        toggleReaderToc();
        return;
      }
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
  try {
    applySettings(loadSettings());
    loadGsapIdle();
    $("#mainView").innerHTML = `<p class="empty">入世中……</p>`;
    $("#statusRight").textContent = "连接中…";
    bindEvents();
    window.addEventListener("hashchange", () => {
      try {
        applyHashRoute();
        if (state._pendingRead) {
          const id = state._pendingRead;
          state._pendingRead = null;
          openEntry(id);
          return;
        }
        if (state._pendingShard) {
          const id = state._pendingShard;
          state._pendingShard = null;
          openShard(id);
          return;
        }
        if (state._pendingDoc) {
          const p = state._pendingDoc;
          state._pendingDoc = null;
          openDoc(p);
          return;
        }
        if (state.reader.open) {
          showReader(false, () => {
            renderView();
            if (window.ShanheMotion) ShanheMotion.enterView();
          });
        } else {
          renderView();
        }
      } catch (e) {
        console.error("[hashchange]", e);
        $("#statusRight").textContent = "路由异常 · 请刷新";
      }
    });

    const ok = await loadCatalog();
    if (!ok) {
      $("#statusRight").textContent = "catalog 未加载 · 请用本地服务打开";
      renderCatalogError(state._catalogError);
      // 仍尝试拉索引，便于诊断
      scheduleConnectProject();
      return;
    }

    $("#statusRight").textContent = catalogStatusLine();
    applyHashRoute();
    if (state._pendingRead) {
      const id = state._pendingRead;
      state._pendingRead = null;
      renderView();
      openEntry(id);
    } else if (state._pendingShard) {
      const id = state._pendingShard;
      state._pendingShard = null;
      renderView();
      openShard(id);
    } else if (state._pendingDoc) {
      const p = state._pendingDoc;
      state._pendingDoc = null;
      renderView();
      openDoc(p);
    } else {
      renderView();
      syncHashFromState();
    }
    if (window.ShanheMotion) ShanheMotion.enterView({ first: true });

    // 重索引不挡首屏
    scheduleConnectProject();
  } catch (e) {
    console.error("[boot]", e);
    $("#statusRight").textContent = "启动失败";
    renderCatalogError(e?.message || "未知错误");
  }
}

boot();
