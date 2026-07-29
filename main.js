var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => FoxDashboardPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// view.ts
var import_obsidian = require("obsidian");
var VIEW_TYPE_FOX = "fox-dashboard";
var FoxDashboardView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.clockInterval = null;
    // Refs for clock updates
    this.heroDateEl = null;
    this.heroTimeEl = null;
    // ═══════════════════════════════════════════════
    // MOOD
    // ═══════════════════════════════════════════════
    this.currentMood = null;
    // ═══════════════════════════════════════════════
    // HEATMAP
    // ═══════════════════════════════════════════════
    this.heatmapMode = "year";
    this.plugin = plugin;
  }
  getViewType() {
    return VIEW_TYPE_FOX;
  }
  getDisplayText() {
    return "\u72D0\u306E\u5DE5\u4F5C\u53F0";
  }
  getIcon() {
    return "compass";
  }
  async onOpen() {
    this.render();
    this.startClock();
    this.loadStats();
    this.loadRecentUpdates();
    this.loadTasks();
    this.loadQuickCapture();
    this.loadProgress();
    this.loadFinance();
    setTimeout(() => this.loadCountdowns(), 100);
    setTimeout(() => this.loadMood(), 150);
    setTimeout(() => this.loadHabits(), 200);
    setTimeout(() => this.loadHeatmap(), 250);
    this.registerEvent(
      this.app.workspace.on("fox-finance:updated", () => this.loadFinance())
    );
  }
  async onClose() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }
  onSettingsChanged() {
    this.render();
    setTimeout(() => {
      this.startClock();
      this.loadStats();
      this.loadRecentUpdates();
      this.loadTasks();
      this.loadQuickCapture();
      this.loadProgress();
      this.loadCountdowns();
      this.loadMood();
      this.loadHabits();
      this.loadHeatmap();
    }, 50);
    this.loadFinance();
  }
  // ═══════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════
  render() {
    const container = this.contentEl;
    container.empty();
    container.className = "fox-dashboard-view";
    container.classList.add(this.plugin.settings.theme === "night" ? "fox-night" : "fox-day");
    container.appendChild(this.createBackgrounds());
    container.appendChild(this.createOverlay());
    container.appendChild(this.createContent());
  }
  // ─── BACKGROUNDS ───────────────────────────────
  createBackgrounds() {
    const bg = createDiv({ cls: "fox-bg-layer" });
    const dayBg = bg.createEl("img", { cls: "fox-bg-img" });
    dayBg.id = "fox-bg-day";
    dayBg.src = this.getBgPath("assets/backgrounds/\u767D\u59292.png");
    const nightBg = bg.createEl("img", { cls: "fox-bg-img" });
    nightBg.id = "fox-bg-night";
    nightBg.src = this.getBgPath("assets/backgrounds/\u9ED1\u591C1.png");
    return bg;
  }
  getBgPath(relativePath) {
    const file = this.app.vault.getAbstractFileByPath(relativePath);
    if (file instanceof import_obsidian.TFile)
      return this.app.vault.getResourcePath(file);
    return relativePath;
  }
  getAssetPath(relativePath) {
    const file = this.app.vault.getAbstractFileByPath(relativePath);
    if (file instanceof import_obsidian.TFile)
      return this.app.vault.getResourcePath(file);
    return relativePath;
  }
  createOverlay() {
    return createDiv({ cls: "fox-overlay" });
  }
  // ─── CONTENT ───────────────────────────────────
  createContent() {
    const content = createDiv({ cls: "fox-dashboard-content" });
    content.appendChild(this.createTopbar());
    content.appendChild(this.createWorkspace());
    content.appendChild(this.createHeatmapCard());
    content.appendChild(this.createSecondSpace());
    content.appendChild(this.createFooter());
    return content;
  }
  // ─── THREE-COLUMN WORKSPACE ─────────────────────
  createWorkspace() {
    const ws = createDiv({ cls: "fox-workspace" });
    const left = ws.createDiv({ cls: "fox-col-left" });
    left.appendChild(this.createHero());
    left.appendChild(this.createCountdownCard());
    left.appendChild(this.createQuickNav());
    const mid = ws.createDiv({ cls: "fox-col-middle" });
    mid.appendChild(this.createTaskCard());
    const midMini = mid.createDiv({ cls: "fox-grid-2" });
    midMini.appendChild(this.createMoodCard());
    midMini.appendChild(this.createHabitCard());
    mid.appendChild(this.createCard(
      "",
      "\u6708\u5149\u80FD\u91CF\u7403.png",
      "\u6700\u8FD1\u66F4\u65B0",
      "RECENT",
      '<div id="fox-recent-list"><div class="fox-placeholder">\u{1F4DD} \u52A0\u8F7D\u4E2D\u2026</div></div>',
      "\u7075\u5FC3\u6C34\u6EF4.png"
    ));
    const right = ws.createDiv({ cls: "fox-col-right" });
    right.appendChild(this.createQuickCaptureCard());
    right.appendChild(this.createProgressCard());
    right.appendChild(this.createFinanceCard());
    return ws;
  }
  // ─── Task Card (extracted from Main Grid) ───────
  createTaskCard() {
    const card = createDiv({ cls: "fox-card fox-task-card" });
    const header = card.createDiv({ cls: "fox-card-header" });
    const icon = header.createEl("img", { cls: "fox-card-icon" });
    icon.src = this.getAssetPath("assets/icons/\u65C5\u4EBA\u63D0\u706F.png");
    header.createSpan({ cls: "fox-card-title", text: "\u4ECA\u65E5\u4EFB\u52A1" });
    header.createSpan({ cls: "fox-card-subtitle", text: "TASKS" });
    card.createDiv({ cls: "fox-task-list", attr: { id: "fox-task-list" } });
    card.createDiv({ cls: "fox-task-summary", attr: { id: "fox-task-summary" } });
    const addRow = card.createDiv({ cls: "fox-task-add-row" });
    addRow.createEl("input", { cls: "fox-record-input", attr: { id: "fox-task-input", type: "text", placeholder: "\u6DFB\u52A0\u5F85\u529E\u2026" } });
    addRow.createEl("button", { cls: "fox-record-btn", attr: { id: "fox-task-add-btn" }, text: "+ \u6DFB\u52A0" });
    card.createDiv({ cls: "fox-task-status", attr: { id: "fox-task-status" } });
    const deco = card.createDiv({ cls: "fox-card-decoration" });
    deco.createEl("img", { attr: { src: this.getAssetPath("assets/icons/\u7075\u5FC3\u6C34\u6EF4.png") } });
    return card;
  }
  // ═══════════════════════════════════════════════
  // TOPBAR
  // ═══════════════════════════════════════════════
  createTopbar() {
    const bar = createDiv({ cls: "fox-topbar" });
    const left = bar.createDiv({ cls: "fox-topbar-left" });
    const logo = left.createEl("img", { cls: "fox-logo-icon" });
    logo.src = this.getAssetPath("assets/icons/\u5B64\u72FC\u5B88\u62A4\u8005.png");
    left.createSpan({ cls: "fox-title", text: "\u72D0\u306E\u5DE5\u4F5C\u53F0" });
    const center = bar.createDiv({ cls: "fox-topbar-center" });
    center.createSpan({ cls: "fox-topbar-tagline", text: "\u4E13\u6CE8 \xB7 \u6210\u957F \xB7 \u957F\u671F\u4E3B\u4E49" });
    const right = bar.createDiv({ cls: "fox-topbar-right" });
    const logLink = right.createEl("a", { cls: "fox-header-link", href: "#" });
    logLink.onclick = (e) => {
      e.preventDefault();
      this.openTodayDiary();
    };
    const logIcon = logLink.createEl("img", { cls: "fox-header-icon" });
    logIcon.src = this.getAssetPath("assets/icons/\u6C89\u7761\u72D0\u72F8.png");
    const toggleBtn = right.createEl("button", {
      cls: "fox-toggle-btn",
      text: this.plugin.settings.theme === "night" ? "\u2600\uFE0F \u767D\u5929" : "\u{1F319} \u591C\u665A"
    });
    toggleBtn.onclick = () => this.toggleTheme();
    return bar;
  }
  openFolder(path) {
    this.app.workspace.openLinkText(path, "/", false);
  }
  openNote(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof import_obsidian.TFile)
      this.app.workspace.getLeaf().openFile(file);
    else
      this.app.workspace.openLinkText(path, "/", false);
  }
  openKnowledgeCreator() {
    new KnowledgeModal(this.app, this.plugin).open();
  }
  toggleTheme() {
    this.plugin.settings.theme = this.plugin.settings.theme === "night" ? "day" : "night";
    this.plugin.saveSettings();
    this.render();
  }
  // ═══════════════════════════════════════════════
  // HERO — Clock + Stats
  // ═══════════════════════════════════════════════
  createHero() {
    const hero = createDiv({ cls: "fox-hero" });
    const left = hero.createDiv({ cls: "fox-hero-left" });
    this.heroDateEl = left.createDiv({ cls: "fox-hero-date", text: this.formatDate() });
    this.heroTimeEl = left.createDiv({ cls: "fox-hero-time", text: this.formatTime() });
    left.createDiv({ cls: "fox-hero-quote", text: this.getMotto() });
    const right = hero.createDiv({ cls: "fox-hero-right" });
    const stats = right.createDiv({ cls: "fox-hero-stats" });
    this.createStatItem(stats, "\u84DD\u8272\u7FBD\u6BDB.png", "\u2014", "\u65E5\u5FD7\u6570\u91CF", "fox-stat-diaries");
    this.createStatItem(stats, "\u72EC\u884C\u7BDD\u706B.png", "\u2014", "\u8FDE\u7EED\u8BB0\u5F55", "fox-stat-streak");
    this.createStatItem(stats, "\u65F6\u95F4\u6C99\u6F0F.png", "\u2014", "\u672C\u6708\u5929\u6570", "fox-stat-monthly");
    this.createStatItem(stats, "\u65C5\u4EBA\u63D0\u706F.png", "\u2014", "\u4ECA\u65E5\u76EE\u6807", "fox-stat-goal");
    return hero;
  }
  createStatItem(parent, iconFile, value, label, id) {
    const item = parent.createDiv({ cls: "fox-stat-item" });
    const icon = item.createEl("img", { cls: "fox-stat-icon" });
    icon.src = this.getAssetPath(`assets/icons/${iconFile}`);
    const valEl = item.createSpan({ cls: "fox-stat-value", text: value, attr: { id } });
    item.createSpan({ cls: "fox-stat-label", text: label });
  }
  formatDate() {
    const now = /* @__PURE__ */ new Date();
    const wd = ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"];
    return `${now.getFullYear()}\u5E74${now.getMonth() + 1}\u6708${now.getDate()}\u65E5 \u661F\u671F${wd[now.getDay()]}`;
  }
  formatTime() {
    const now = /* @__PURE__ */ new Date();
    return String(now.getHours()).padStart(2, "0") + ":" + String(now.getMinutes()).padStart(2, "0");
  }
  getMotto() {
    const list = this.plugin.settings.mottoList;
    if (list.length === 0)
      return "";
    return list[(/* @__PURE__ */ new Date()).getDate() % list.length];
  }
  startClock() {
    if (this.clockInterval)
      clearInterval(this.clockInterval);
    this.clockInterval = window.setInterval(() => {
      if (this.heroTimeEl)
        this.heroTimeEl.textContent = this.formatTime();
      if (this.heroDateEl)
        this.heroDateEl.textContent = this.formatDate();
    }, 1e3);
  }
  // ═══════════════════════════════════════════════
  // QUICK NAV
  // ═══════════════════════════════════════════════
  createQuickNav() {
    const nav = createDiv({ cls: "fox-quick-nav" });
    const items = [
      { icon: "\u63A2\u7D22\u8005\u7F57\u76D8.png", title: "\u77E5\u8BC6\u68EE\u6797", desc: "\u77E5\u8BC6\u5E93", path: null, isKnowledge: true },
      { icon: "\u96EA\u5C71\u5C71\u5CF0.png", title: "\u5B66\u4E60\u4E13\u533A", desc: "\u82F1\u8BED/GRE/CFA", path: "30-Learning/" },
      { icon: "\u6C89\u7761\u72D0\u72F8.png", title: "\u65E5\u5FD7\u7CFB\u7EDF", desc: "\u65E5\u8BB0/\u590D\u76D8", isDiary: true },
      { icon: "\u72FC\u722A\u5370\u77F3\u7891.png", title: "\u5DE5\u4F5C\u7BA1\u7406", desc: "\u9879\u76EE/\u4EFB\u52A1", path: "40-Work/" },
      { icon: "\u751F\u547D\u4E4B\u6811\u5FBD\u7AE0.png", title: "\u76EE\u6807\u89C4\u5212", desc: "\u8BA1\u5212/\u613F\u666F", path: "50-Application/" },
      { icon: "\u5E73\u8861\u77F3\u5806.png", title: "\u5065\u5EB7\u751F\u6D3B", desc: "\u8FD0\u52A8/\u5FC3\u60C5", path: "" }
    ];
    for (const item of items) {
      const btn = nav.createEl("a", { cls: "fox-nav-btn", href: "#" });
      btn.onclick = (e) => {
        e.preventDefault();
        if (item.isDiary)
          this.openTodayDiary();
        else if (item.isKnowledge)
          this.openKnowledgeCreator();
        else if (item.path)
          this.openFolder(item.path);
      };
      btn.createEl("img", { attr: { src: this.getAssetPath(`assets/icons/${item.icon}`) } });
      const td = btn.createDiv();
      td.createSpan({ cls: "fox-nav-btn-title", text: item.title });
      td.createSpan({ cls: "fox-nav-btn-desc", text: item.desc });
    }
    return nav;
  }
  // ─── Card helper ───────────────────────────────
  createCard(extraCls, iconFile, title, subtitle, bodyHtml, decoFile) {
    const card = createDiv({ cls: `fox-card ${extraCls}` });
    const header = card.createDiv({ cls: "fox-card-header" });
    const icon = header.createEl("img", { cls: "fox-card-icon" });
    icon.src = this.getAssetPath(`assets/icons/${iconFile}`);
    header.createSpan({ cls: "fox-card-title", text: title });
    header.createSpan({ cls: "fox-card-subtitle", text: subtitle });
    const body = card.createDiv({ cls: "fox-card-body" });
    body.innerHTML = bodyHtml;
    const deco = card.createDiv({ cls: "fox-card-decoration" });
    deco.createEl("img", { attr: { src: this.getAssetPath(`assets/icons/${decoFile}`) } });
    return card;
  }
  // ─── Quick Capture Card ────────────────────────
  createQuickCaptureCard() {
    const card = createDiv({ cls: "fox-card fox-capture-card" });
    const header = card.createDiv({ cls: "fox-card-header" });
    const icon = header.createEl("img", { cls: "fox-card-icon" });
    icon.src = this.getAssetPath("assets/icons/\u84DD\u8272\u7FBD\u6BDB.png");
    header.createSpan({ cls: "fox-card-title", text: "\u5FEB\u901F\u8BB0\u5F55" });
    header.createSpan({ cls: "fox-card-subtitle", text: "CAPTURE" });
    const body = card.createDiv({ cls: "fox-card-body" });
    const textarea = body.createEl("textarea", {
      cls: "fox-capture-textarea",
      attr: { id: "fox-capture-input", placeholder: "\u968F\u624B\u8BB0\u70B9\u4EC0\u4E48\u2026\n\u652F\u6301\u591A\u884C" }
    });
    const btnRow = body.createDiv({ cls: "fox-capture-btn-row" });
    btnRow.createEl("button", { cls: "fox-record-btn", attr: { id: "fox-capture-save" }, text: "\u{1F4BE} \u4FDD\u5B58" });
    const status = btnRow.createSpan({ cls: "fox-capture-status", attr: { id: "fox-capture-status" } });
    const deco = card.createDiv({ cls: "fox-card-decoration" });
    deco.createEl("img", { attr: { src: this.getAssetPath("assets/icons/\u84DD\u8272\u7FBD\u6BDB.png") } });
    return card;
  }
  // ─── Mood Card ─────────────────────────────────
  createMoodCard() {
    const card = createDiv({ cls: "fox-card fox-mood-card" });
    const header = card.createDiv({ cls: "fox-card-header" });
    const icon = header.createEl("img", { cls: "fox-card-icon" });
    icon.src = this.getAssetPath("assets/icons/\u68EE\u6797\u8611\u83C7.png");
    header.createSpan({ cls: "fox-card-title", text: "\u4ECA\u65E5\u5FC3\u60C5" });
    header.createSpan({ cls: "fox-card-subtitle", text: "MOOD" });
    const body = card.createDiv({ cls: "fox-card-body" });
    const row = body.createDiv({ cls: "fox-mood-row", attr: { id: "fox-mood-row" } });
    const moods = [
      { id: "\u660E\u6717", file: "\u660E\u6717.png" },
      { id: "\u901A\u900F", file: "\u901A\u900F.png" },
      { id: "\u6000\u65E7", file: "\u6000\u65E7.png" },
      { id: "\u9759\u9ED8", file: "\u9759\u9ED8.png" },
      { id: "\u7EA0\u7ED3", file: "\u7EA0\u7ED3.png" },
      { id: "\u4F4E\u6C89", file: "\u4F4E\u6C89.png" },
      { id: "\u6124\u6012", file: "\u6124\u6012.png" },
      { id: "\u7559\u767D", file: "\u7559\u767D.png" }
    ];
    for (const m of moods) {
      const btn = row.createEl("button", { cls: "fox-mood-tag", attr: { "data-mood": m.id } });
      const img = btn.createEl("img", { cls: "fox-mood-img" });
      img.src = this.getAssetPath(`assets/emotions/${m.file}`);
      img.alt = m.id;
    }
    const noteInput = body.createEl("input", {
      cls: "fox-mood-note",
      attr: { id: "fox-mood-note", type: "text", placeholder: "\u4ECA\u5929\u611F\u89C9\u600E\u4E48\u6837\u2026\uFF08\u9009\u5FC3\u60C5\u540E\u81EA\u52A8\u4FDD\u5B58\uFF09" }
    });
    const moodStatus = body.createSpan({ cls: "fox-capture-status", attr: { id: "fox-mood-status" } });
    const deco = card.createDiv({ cls: "fox-card-decoration" });
    deco.createEl("img", { attr: { src: this.getAssetPath("assets/icons/\u6708\u5F71\u6C34\u6C60.png") } });
    return card;
  }
  // ─── Habits Card ───────────────────────────────
  createHabitCard() {
    const card = createDiv({ cls: "fox-card fox-habit-card" });
    const header = card.createDiv({ cls: "fox-card-header" });
    const icon = header.createEl("img", { cls: "fox-card-icon" });
    icon.src = this.getAssetPath("assets/icons/\u6708\u7259\u77F3.png");
    header.createSpan({ cls: "fox-card-title", text: "\u5065\u5EB7\u4E60\u60EF" });
    header.createSpan({ cls: "fox-card-subtitle", text: "HABITS" });
    const body = card.createDiv({ cls: "fox-card-body" });
    body.createDiv({ cls: "fox-habit-list", attr: { id: "fox-habit-list" } });
    const ring = body.createDiv({ cls: "fox-habit-ring", attr: { id: "fox-habit-ring" }, style: "display:none" });
    const ringInner = ring.createDiv({ cls: "fox-habit-ring-inner" });
    ringInner.createSpan({ attr: { id: "fox-habit-ring-pct" }, text: "0%" });
    ringInner.createSpan({ cls: "fox-habit-ring-label", text: "\u5B8C\u6210\u7387" });
    const deco = card.createDiv({ cls: "fox-card-decoration" });
    deco.createEl("img", { attr: { src: this.getAssetPath("assets/icons/\u53E4\u8001\u6811\u6869.png") } });
    return card;
  }
  // ═══════════════════════════════════════════════
  // TODAY'S TASKS — Load, Render, Toggle, Add
  // ═══════════════════════════════════════════════
  dateStr(offset) {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().slice(0, 10);
  }
  async loadTasks() {
    const listEl = this.contentEl.querySelector("#fox-task-list");
    const summaryEl = this.contentEl.querySelector("#fox-task-summary");
    const statusEl = this.contentEl.querySelector("#fox-task-status");
    if (!listEl)
      return;
    try {
      const todayStr = this.dateStr(0);
      const yesterdayStr = this.dateStr(-1);
      const tasks = [];
      await this.scanDiary(todayStr, "today", tasks);
      await this.scanDiary(yesterdayStr, "yesterday", tasks);
      if (tasks.length === 0) {
        listEl.innerHTML = '<div class="fox-task-empty">\u2705 \u4ECA\u65E5\u65E0\u5F85\u529E</div>';
        if (summaryEl)
          summaryEl.textContent = "";
      } else {
        listEl.innerHTML = tasks.map((t, i) => {
          const badge = t.source === "yesterday" ? '<span class="fox-task-badge">\u6628\u5929</span>' : "";
          return `<div class="fox-task-item" data-index="${i}">\u2610 ${badge}${this.escapeHtml(t.text)}</div>`;
        }).join("");
        const done = tasks.filter((t) => false).length;
        if (summaryEl)
          summaryEl.textContent = `${tasks.length} \u4E2A\u672A\u5B8C\u6210`;
        listEl.querySelectorAll(".fox-task-item").forEach((el) => {
          el.onclick = () => {
            const idx = parseInt(el.dataset.index || "");
            if (isNaN(idx) || !tasks[idx])
              return;
            this.completeTask(tasks[idx], listEl, el);
          };
        });
      }
      if (statusEl)
        statusEl.textContent = "";
      this.bindTaskAddBtn();
    } catch (e) {
      listEl.innerHTML = `<div class="fox-task-empty">\u26A0 ${e.message}</div>`;
    }
  }
  async scanDiary(dateStr, source, tasks) {
    const filePath = `10-Daily/${dateStr}.md`;
    const exists = await this.app.vault.adapter.exists(filePath);
    if (!exists)
      return;
    const content = await this.app.vault.adapter.read(filePath);
    const lines = content.split("\n");
    let fmCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === "---") {
        fmCount++;
        continue;
      }
      if (fmCount < 2)
        continue;
      if (/^- \[ \]/.test(line)) {
        const text = line.replace(/^- \[ \] ?/, "").trim();
        if (text)
          tasks.push({ text, lineNum: i, source });
      }
    }
  }
  async completeTask(task, listEl, itemEl) {
    try {
      const filePath = `10-Daily/${this.dateStr(task.source === "yesterday" ? -1 : 0)}.md`;
      const content = await this.app.vault.adapter.read(filePath);
      const lines = content.split("\n");
      if (task.lineNum < lines.length && /^- \[ \]/.test(lines[task.lineNum])) {
        lines[task.lineNum] = lines[task.lineNum].replace("- [ ]", "- [x]");
        await this.app.vault.adapter.write(filePath, lines.join("\n"));
        itemEl.classList.add("fox-task-done");
        itemEl.innerHTML = "\u2611 " + this.escapeHtml(task.text);
        setTimeout(() => {
          itemEl.style.maxHeight = itemEl.offsetHeight + "px";
          itemEl.style.overflow = "hidden";
          requestAnimationFrame(() => {
            itemEl.style.maxHeight = "0";
            itemEl.style.opacity = "0";
            itemEl.style.padding = "0";
            itemEl.style.margin = "0";
          });
          setTimeout(() => {
            itemEl.remove();
            const remaining = listEl.querySelectorAll(".fox-task-item").length;
            const summaryEl = this.contentEl.querySelector("#fox-task-summary");
            if (summaryEl)
              summaryEl.textContent = remaining > 0 ? `${remaining} \u4E2A\u672A\u5B8C\u6210` : "";
            if (remaining === 0)
              listEl.innerHTML = '<div class="fox-task-empty">\u2705 \u4ECA\u65E5\u65E0\u5F85\u529E</div>';
            this.loadStats();
          }, 500);
        }, 400);
      }
    } catch (e) {
      console.error("[Fox] Complete task error:", e);
    }
  }
  bindTaskAddBtn() {
    const input = this.contentEl.querySelector("#fox-task-input");
    const btn = this.contentEl.querySelector("#fox-task-add-btn");
    const statusEl = this.contentEl.querySelector("#fox-task-status");
    if (!input || !btn)
      return;
    btn.onclick = async () => {
      const text = input.value.trim();
      if (!text)
        return;
      try {
        const dateStr = this.dateStr(0);
        const filePath = `10-Daily/${dateStr}.md`;
        const heading = "## \u{1F4CB} \u5F85\u529E";
        const taskLine = "- [ ] " + text;
        const exists = await this.app.vault.adapter.exists(filePath);
        let content;
        if (exists) {
          content = await this.app.vault.adapter.read(filePath);
        } else {
          const tplExists = await this.app.vault.adapter.exists("\u6A21\u677F/\u65E5\u5FD7\u6A21\u677F.md");
          content = tplExists ? (await this.app.vault.adapter.read("\u6A21\u677F/\u65E5\u5FD7\u6A21\u677F.md")).replace(/\{\{date\}\}/g, dateStr) : `---
date: ${dateStr}
tags: [\u65E5\u5FD7]
---

# ${dateStr}
`;
        }
        if (content.includes(heading)) {
          const lines = content.split("\n");
          let pos = -1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === heading) {
              pos = i + 1;
              break;
            }
          }
          lines.splice(pos, 0, taskLine);
          content = lines.join("\n");
        } else {
          content += `

${heading}
${taskLine}
`;
        }
        await this.app.vault.adapter.write(filePath, content);
        input.value = "";
        if (statusEl) {
          statusEl.textContent = "\u2705 \u5DF2\u6DFB\u52A0\u5F85\u529E";
          statusEl.style.color = "var(--fox-cd-today)";
          setTimeout(() => {
            statusEl.textContent = "";
            statusEl.style.color = "";
          }, 2500);
        }
        this.loadTasks();
        this.loadStats();
      } catch (e) {
        if (statusEl) {
          statusEl.textContent = "\u274C " + e.message;
          statusEl.style.color = "var(--fox-cd-urgent)";
        }
      }
    };
  }
  // ═══════════════════════════════════════════════
  // COUNTDOWN — Render, CRUD, Sort, Urgency Colors
  // ═══════════════════════════════════════════════
  createCountdownCard() {
    const card = createDiv({ cls: "fox-card fox-countdown-card" });
    const header = card.createDiv({ cls: "fox-card-header" });
    const icon = header.createEl("img", { cls: "fox-card-icon" });
    icon.src = this.getAssetPath("assets/icons/\u65F6\u95F4\u6C99\u6F0F.png");
    header.createSpan({ cls: "fox-card-title", text: "\u5012\u8BA1\u65F6" });
    header.createSpan({ cls: "fox-card-subtitle", text: "COUNTDOWN" });
    card.createDiv({ cls: "fox-countdown-list", attr: { id: "fox-countdown-list" } });
    const form = card.createDiv({ cls: "fox-countdown-form", attr: { id: "fox-countdown-form" } });
    form.style.display = "none";
    form.createEl("input", { cls: "fox-record-input", attr: { id: "fox-cd-name", type: "text", placeholder: "\u540D\u79F0\uFF08\u5982\uFF1A\u{1F4DD} GRE\u8003\u8BD5\uFF09" } });
    form.createEl("input", { cls: "fox-record-input", attr: { id: "fox-cd-date", type: "date" } });
    const formBtns = form.createDiv({ cls: "fox-countdown-form-btns" });
    formBtns.createEl("button", { cls: "fox-record-btn", attr: { id: "fox-cd-confirm" }, text: "\u2705 \u786E\u8BA4" });
    formBtns.createEl("button", { cls: "fox-record-btn", attr: { id: "fox-cd-cancel" }, text: "\u53D6\u6D88" });
    const addBtn = card.createEl("button", { cls: "fox-add-mini", attr: { id: "fox-countdown-add" }, text: "+ \u6DFB\u52A0" });
    const deco = card.createDiv({ cls: "fox-card-decoration" });
    deco.createEl("img", { attr: { src: this.getAssetPath("assets/icons/\u65C5\u4EBA\u65D7\u5E1C.png") } });
    return card;
  }
  loadCountdowns() {
    const listEl = this.contentEl.querySelector("#fox-countdown-list");
    if (!listEl)
      return;
    const items = this.plugin.settings.countdowns || [];
    const sorted = this.sortCountdowns(items);
    if (sorted.length === 0) {
      listEl.innerHTML = '<div class="fox-task-empty">\u{1F4ED} \u6682\u65E0\u5012\u8BA1\u65F6\uFF0C\u70B9\u4E0B\u65B9\u300C+ \u6DFB\u52A0\u300D</div>';
      this.bindCountdownButtons(sorted);
      return;
    }
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    listEl.innerHTML = sorted.map((it, idx) => {
      const target = /* @__PURE__ */ new Date(it.date + "T00:00:00");
      const diff = Math.ceil((target.getTime() - today.getTime()) / 864e5);
      const daysStr = diff > 0 ? String(diff) : diff === 0 ? "\u4ECA\u5929\uFF01" : String(Math.abs(diff));
      const unit = diff > 0 ? "\u5929" : diff === 0 ? "" : "\u5929\u524D";
      const cls = this.urgencyClass(diff);
      return `<div class="fox-countdown-item ${cls}" data-sort-idx="${idx}" data-name="${this.escapeHtml(it.name)}" data-date="${it.date}"><span class="fox-countdown-label">${this.escapeHtml(it.name)}</span><span class="fox-countdown-number">${daysStr}<span class="fox-countdown-unit">${unit}</span></span><span class="fox-countdown-urgency-dot"></span><button class="fox-item-del" data-sort-idx="${idx}" title="\u5220\u9664">\xD7</button></div>`;
    }).join("");
    this.bindCountdownButtons(sorted);
    listEl.querySelectorAll(".fox-countdown-item").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (e.target.classList.contains("fox-item-del"))
          return;
        const idx = parseInt(el.dataset.sortIdx || "");
        const name = el.dataset.name || "";
        const date = el.dataset.date || "";
        this.showCountdownForm(idx, name, date);
      });
    });
    listEl.querySelectorAll(".fox-item-del").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.sortIdx || "");
        this.deleteCountdown(idx);
      });
    });
  }
  sortCountdowns(items) {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    return [...items].sort((a, b) => {
      const da = Math.ceil(((/* @__PURE__ */ new Date(a.date + "T00:00:00")).getTime() - today.getTime()) / 864e5);
      const db = Math.ceil(((/* @__PURE__ */ new Date(b.date + "T00:00:00")).getTime() - today.getTime()) / 864e5);
      return da - db;
    });
  }
  urgencyClass(days) {
    if (days < 0)
      return "fox-cd-overdue";
    if (days === 0)
      return "fox-cd-today";
    if (days <= 7)
      return "fox-cd-urgent";
    if (days <= 30)
      return "fox-cd-soon";
    return "";
  }
  showCountdownForm(editIdx, name, date) {
    const form = this.contentEl.querySelector("#fox-countdown-form");
    const nameInput = this.contentEl.querySelector("#fox-cd-name");
    const dateInput = this.contentEl.querySelector("#fox-cd-date");
    const confirmBtn = this.contentEl.querySelector("#fox-cd-confirm");
    const addBtn = this.contentEl.querySelector("#fox-countdown-add");
    if (!form || !nameInput || !dateInput)
      return;
    form.dataset.editIdx = String(editIdx);
    nameInput.value = name;
    dateInput.value = date;
    confirmBtn.textContent = editIdx >= 0 ? "\u270F\uFE0F \u66F4\u65B0" : "\u2705 \u786E\u8BA4";
    form.style.display = "block";
    if (addBtn)
      addBtn.style.display = "none";
    nameInput.focus();
  }
  bindCountdownButtons(sorted) {
    const confirmBtn = this.contentEl.querySelector("#fox-cd-confirm");
    const cancelBtn = this.contentEl.querySelector("#fox-cd-cancel");
    const addBtn = this.contentEl.querySelector("#fox-countdown-add");
    if (confirmBtn) {
      confirmBtn.onclick = async () => {
        const nameInput = this.contentEl.querySelector("#fox-cd-name");
        const dateInput = this.contentEl.querySelector("#fox-cd-date");
        const form = this.contentEl.querySelector("#fox-countdown-form");
        const addBtnEl = this.contentEl.querySelector("#fox-countdown-add");
        const name = nameInput?.value.trim();
        const date = dateInput?.value;
        if (!name || !date)
          return;
        const editIdx = parseInt(form?.dataset.editIdx || "-1");
        const items = this.plugin.settings.countdowns || [];
        if (editIdx >= 0) {
          const sortedItems = this.sortCountdowns(items);
          const target = sortedItems[editIdx];
          if (target) {
            const origIdx = items.findIndex((c) => c.name === target.name && c.date === target.date);
            if (origIdx >= 0) {
              items[origIdx].name = name;
              items[origIdx].date = date;
            }
          }
        } else {
          items.push({ name, date });
        }
        this.plugin.settings.countdowns = items;
        await this.plugin.saveSettings();
        if (form)
          form.style.display = "none";
        if (addBtnEl)
          addBtnEl.style.display = "block";
        this.loadCountdowns();
      };
    }
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        const form = this.contentEl.querySelector("#fox-countdown-form");
        const addBtnEl = this.contentEl.querySelector("#fox-countdown-add");
        if (form)
          form.style.display = "none";
        if (addBtnEl)
          addBtnEl.style.display = "block";
      };
    }
    if (addBtn) {
      addBtn.onclick = () => {
        this.showCountdownForm(-1, "", "");
      };
    }
  }
  async deleteCountdown(sortedIdx) {
    const items = [...this.plugin.settings.countdowns || []];
    const sorted = this.sortCountdowns(items);
    const target = sorted[sortedIdx];
    if (!target)
      return;
    const origIdx = items.findIndex((c) => c.name === target.name && c.date === target.date);
    if (origIdx >= 0)
      items.splice(origIdx, 1);
    this.plugin.settings.countdowns = items;
    await this.plugin.saveSettings();
    this.loadCountdowns();
  }
  // ═══════════════════════════════════════════════
  // QUICK CAPTURE
  // ═══════════════════════════════════════════════
  async loadQuickCapture() {
    const btn = this.contentEl.querySelector("#fox-capture-save");
    const input = this.contentEl.querySelector("#fox-capture-input");
    const status = this.contentEl.querySelector("#fox-capture-status");
    if (!btn || !input)
      return;
    btn.onclick = async () => {
      const text = input.value.trim();
      if (!text)
        return;
      try {
        const dateStr = this.dateStr(0);
        const filePath = `10-Daily/${dateStr}.md`;
        const exists = await this.app.vault.adapter.exists(filePath);
        let content;
        if (exists) {
          content = await this.app.vault.adapter.read(filePath);
        } else {
          const tplExists = await this.app.vault.adapter.exists("\u6A21\u677F/\u65E5\u5FD7\u6A21\u677F.md");
          content = tplExists ? (await this.app.vault.adapter.read("\u6A21\u677F/\u65E5\u5FD7\u6A21\u677F.md")).replace(/\{\{date\}\}/g, dateStr) : `---
date: ${dateStr}
tags: [\u65E5\u5FD7]
---

# ${dateStr}
`;
        }
        content += `
- ${text}
`;
        await this.app.vault.adapter.write(filePath, content);
        input.value = "";
        if (status) {
          status.textContent = "\u2705 \u5DF2\u4FDD\u5B58";
          setTimeout(() => {
            status.textContent = "";
          }, 2500);
        }
      } catch (e) {
        if (status) {
          status.textContent = "\u274C " + e.message;
        }
      }
    };
  }
  async loadMood() {
    const row = this.contentEl.querySelector("#fox-mood-row");
    const noteInput = this.contentEl.querySelector("#fox-mood-note");
    if (!row)
      return;
    const dateStr = this.dateStr(0);
    const filePath = `10-Daily/${dateStr}.md`;
    try {
      const exists = await this.app.vault.adapter.exists(filePath);
      if (exists) {
        const content = await this.app.vault.adapter.read(filePath);
        const moodMatch = content.match(/^mood:\s*(\S+)/m);
        if (moodMatch) {
          this.currentMood = moodMatch[1];
          row.querySelectorAll(".fox-mood-tag").forEach((btn) => {
            if (btn.dataset.mood === this.currentMood) {
              btn.classList.add("active");
            }
          });
        }
      }
    } catch (e) {
    }
    row.querySelectorAll(".fox-mood-tag").forEach((btn) => {
      btn.onclick = async () => {
        const mood = btn.dataset.mood || "";
        try {
          await this.saveMoodToDiary(mood, noteInput?.value || "");
          row.querySelectorAll(".fox-mood-tag").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.currentMood = mood;
          this.showMoodStatus("\u2705 \u5FC3\u60C5\u5DF2\u8BB0\u5F55");
        } catch (e) {
          this.showMoodStatus("\u274C " + e.message);
        }
      };
    });
    if (noteInput) {
      noteInput.onkeydown = async (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          if (this.currentMood) {
            try {
              await this.saveMoodToDiary(this.currentMood, noteInput.value.trim());
              this.showMoodStatus("\u2705 \u5FC3\u60C5\u5907\u6CE8\u5DF2\u4FDD\u5B58");
            } catch (e2) {
              this.showMoodStatus("\u274C " + e2.message);
            }
          }
        }
      };
    }
  }
  async saveMoodToDiary(mood, note) {
    const dateStr = this.dateStr(0);
    const filePath = `10-Daily/${dateStr}.md`;
    const exists = await this.app.vault.adapter.exists(filePath);
    let content;
    if (exists) {
      content = await this.app.vault.adapter.read(filePath);
    } else {
      const tplExists = await this.app.vault.adapter.exists("\u6A21\u677F/\u65E5\u5FD7\u6A21\u677F.md");
      content = tplExists ? (await this.app.vault.adapter.read("\u6A21\u677F/\u65E5\u5FD7\u6A21\u677F.md")).replace(/\{\{date\}\}/g, dateStr) : `---
date: ${dateStr}
tags: [\u65E5\u5FD7]
---

# ${dateStr}
`;
    }
    const lines = content.split("\n");
    let fmEnd = -1;
    let fmCount = 0;
    let hasMood = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        fmCount++;
        if (fmCount === 2) {
          fmEnd = i;
          break;
        }
        continue;
      }
      if (fmCount === 1 && /^mood:\s*/i.test(lines[i])) {
        lines[i] = `mood: ${mood}`;
        hasMood = true;
      }
    }
    if (!hasMood && fmEnd >= 0) {
      lines.splice(fmEnd, 0, `mood: ${mood}`);
    }
    if (note) {
      let hasNote = false;
      for (let i = 0; i < lines.length; i++) {
        if (fmCount === 1 && /^mood_note:\s*/i.test(lines[i])) {
          lines[i] = `mood_note: ${note}`;
          hasNote = true;
          break;
        }
      }
      if (!hasNote && fmEnd >= 0) {
        let insertPos = fmEnd;
        for (let i = fmEnd - 1; i >= 0; i--) {
          if (lines[i].trim() === "---") {
            insertPos = i + 1;
            break;
          }
        }
        if (hasMood) {
          for (let i = 0; i < fmEnd; i++) {
            if (lines[i].startsWith("mood:")) {
              insertPos = i + 1;
              break;
            }
          }
        }
        lines.splice(insertPos, 0, `mood_note: ${note}`);
      }
    }
    await this.app.vault.adapter.write(filePath, lines.join("\n"));
  }
  showMoodStatus(msg) {
    const el = this.contentEl.querySelector("#fox-mood-status");
    if (el) {
      el.textContent = msg;
      setTimeout(() => {
        el.textContent = "";
      }, 2500);
    }
  }
  // ═══════════════════════════════════════════════
  // HABITS
  // ═══════════════════════════════════════════════
  get HABIT_DEFS() {
    return this.plugin.settings.habitDefs;
  }
  async loadHabits() {
    const listEl = this.contentEl.querySelector("#fox-habit-list");
    const ringEl = this.contentEl.querySelector("#fox-habit-ring");
    if (!listEl)
      return;
    const dateStr = this.dateStr(0);
    const todayHabits = await this.getTodayHabits(dateStr);
    listEl.innerHTML = this.HABIT_DEFS.map((h) => {
      const done = todayHabits.includes(h.id);
      return `<div class="fox-habit-item" data-habit="${h.id}"><input type="checkbox" class="fox-habit-check" ${done ? "checked" : ""}><span class="fox-habit-text">${h.label}</span></div>`;
    }).join("");
    listEl.querySelectorAll(".fox-habit-item").forEach((item) => {
      const cb = item.querySelector(".fox-habit-check");
      if (!cb)
        return;
      cb.onchange = async () => {
        const habitId = item.dataset.habit || "";
        await this.toggleHabit(habitId, cb.checked);
        this.loadHabits();
      };
    });
    const doneCount = todayHabits.length;
    const pct = Math.round(doneCount / this.HABIT_DEFS.length * 100);
    if (ringEl) {
      ringEl.style.display = doneCount > 0 ? "flex" : "none";
      ringEl.style.setProperty("--habit-pct", String(pct));
      const pctEl = this.contentEl.querySelector("#fox-habit-ring-pct");
      if (pctEl)
        pctEl.textContent = `${pct}%`;
    }
  }
  async getTodayHabits(dateStr) {
    const filePath = `10-Daily/${dateStr}.md`;
    try {
      const exists = await this.app.vault.adapter.exists(filePath);
      if (!exists)
        return [];
      const content = await this.app.vault.adapter.read(filePath);
      const match = content.match(/^habits:\s*\[([^\]]*)\]/m);
      if (match) {
        return match[1].split(",").map((s) => s.trim().replace(/["']/g, "")).filter(Boolean);
      }
      return [];
    } catch {
      return [];
    }
  }
  async toggleHabit(habitId, checked) {
    const dateStr = this.dateStr(0);
    const filePath = `10-Daily/${dateStr}.md`;
    const exists = await this.app.vault.adapter.exists(filePath);
    let content;
    if (exists) {
      content = await this.app.vault.adapter.read(filePath);
    } else {
      const tplExists = await this.app.vault.adapter.exists("\u6A21\u677F/\u65E5\u5FD7\u6A21\u677F.md");
      content = tplExists ? (await this.app.vault.adapter.read("\u6A21\u677F/\u65E5\u5FD7\u6A21\u677F.md")).replace(/\{\{date\}\}/g, dateStr) : `---
date: ${dateStr}
tags: [\u65E5\u5FD7]
---

# ${dateStr}
`;
    }
    const currentHabits = await this.getTodayHabits(dateStr);
    let newHabits;
    if (checked) {
      if (!currentHabits.includes(habitId))
        newHabits = [...currentHabits, habitId];
      else
        newHabits = currentHabits;
    } else {
      newHabits = currentHabits.filter((h) => h !== habitId);
    }
    const lines = content.split("\n");
    let fmEnd = -1;
    let fmCount = 0;
    let hasHabits = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === "---") {
        fmCount++;
        if (fmCount === 2) {
          fmEnd = i;
          break;
        }
        continue;
      }
      if (fmCount === 1 && /^habits:\s*/i.test(lines[i])) {
        lines[i] = `habits: [${newHabits.join(", ")}]`;
        hasHabits = true;
      }
    }
    if (!hasHabits && fmEnd >= 0) {
      lines.splice(fmEnd, 0, `habits: [${newHabits.join(", ")}]`);
    }
    await this.app.vault.adapter.write(filePath, lines.join("\n"));
  }
  // ═══════════════════════════════════════════════
  // PROGRESS
  async loadProgress() {
    const listEl = this.contentEl.querySelector("#fox-progress-list");
    const statsEl = this.contentEl.querySelector("#fox-study-stats");
    if (!listEl)
      return;
    const items = this.plugin.settings.progressItems || [];
    if (items.length === 0) {
      listEl.innerHTML = '<div class="fox-task-empty">\u{1F4ED} \u6682\u65E0\u8FDB\u5EA6\u9879\uFF0C\u5728\u8BBE\u7F6E\u4E2D\u6DFB\u52A0</div>';
      if (statsEl)
        statsEl.textContent = "";
      return;
    }
    listEl.innerHTML = items.map((p, i) => {
      const pct = p.max > 0 ? Math.min(100, Math.round(p.value / p.max * 100)) : 0;
      return `<div class="fox-progress-item" data-pgidx="${i}"><div class="fox-progress-header"><span class="fox-progress-label">${this.escapeHtml(p.name)}</span><span class="fox-progress-pct"><span class="fox-progress-value-editable" data-pgidx="${i}">${p.value}</span><span class="fox-progress-sep">/</span>${p.max} <span class="fox-progress-pct-num">${pct}%</span></span></div><div class="fox-progress-bar-row"><button class="fox-step-btn" data-pgidx="${i}" data-step="-1">\u2212</button><div class="fox-progress-bar" style="--pct: ${pct}%"></div><button class="fox-step-btn" data-pgidx="${i}" data-step="1">+</button></div></div>`;
    }).join("");
    listEl.querySelectorAll(".fox-step-btn").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.pgidx || "-1");
        const step = parseInt(btn.dataset.step || "0");
        this.stepProgress(idx, step);
      };
    });
    listEl.querySelectorAll(".fox-progress-value-editable").forEach((el) => {
      el.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(el.dataset.pgidx || "-1");
        this.editableProgressValue(idx, el);
      };
    });
    const avg = items.reduce((s, p) => s + (p.max > 0 ? p.value / p.max * 100 : 0), 0) / items.length;
    if (statsEl) {
      statsEl.textContent = `\u{1F4CA} \u6574\u4F53\u8FDB\u5EA6\uFF1A${Math.round(avg)}% \xB7 ${items.filter((p) => p.value >= p.max).length}/${items.length} \u9879\u5B8C\u6210`;
    }
  }
  editableProgressValue(idx, el) {
    const items = this.plugin.settings.progressItems;
    if (idx < 0 || idx >= items.length)
      return;
    const input = document.createElement("input");
    input.type = "number";
    input.className = "fox-progress-inline-input";
    input.value = String(items[idx].value);
    input.min = "0";
    input.max = String(items[idx].max);
    input.style.width = "36px";
    el.replaceWith(input);
    input.focus();
    input.select();
    const commit = async () => {
      const v = parseInt(input.value);
      if (!isNaN(v) && v >= 0) {
        items[idx].value = Math.min(items[idx].max, v);
        await this.plugin.saveSettings();
      }
      this.loadProgress();
    };
    input.onblur = commit;
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }
      if (e.key === "Escape") {
        this.loadProgress();
      }
    };
  }
  async stepProgress(idx, delta) {
    const items = this.plugin.settings.progressItems;
    if (idx < 0 || idx >= items.length)
      return;
    const p = items[idx];
    p.value = Math.max(0, Math.min(p.max, (p.value || 0) + delta));
    await this.plugin.saveSettings();
    this.loadProgress();
  }
  createProgressCard() {
    const card = createDiv({ cls: "fox-card fox-progress-card" });
    const header = card.createDiv({ cls: "fox-card-header" });
    const icon = header.createEl("img", { cls: "fox-card-icon" });
    icon.src = this.getAssetPath("assets/icons/\u51B0\u971C\u6811\u679D.png");
    header.createSpan({ cls: "fox-card-title", text: "\u5907\u8003\u8FDB\u5EA6" });
    header.createSpan({ cls: "fox-card-subtitle", text: "PROGRESS" });
    card.createDiv({ cls: "fox-progress-list", attr: { id: "fox-progress-list" } });
    card.createDiv({ cls: "fox-study-stats", attr: { id: "fox-study-stats" } });
    const deco = card.createDiv({ cls: "fox-card-decoration" });
    deco.createEl("img", { attr: { src: this.getAssetPath("assets/icons/\u84DD\u8272\u6C34\u6676\u7C07.png") } });
    return card;
  }
  createFinanceCard() {
    const card = createDiv({ cls: "fox-card fox-finance-card" });
    const header = card.createDiv({ cls: "fox-card-header" });
    const icon = header.createEl("img", { cls: "fox-card-icon" });
    icon.src = this.getAssetPath("assets/icons/\u53E4\u677E\u76C6\u666F.png");
    header.createSpan({ cls: "fox-card-title", text: "\u8D22\u5BCC\u68EE\u6797" });
    header.createSpan({ cls: "fox-card-subtitle", text: "FOX FINANCE" });
    const toggleBtn = header.createEl("span", { cls: "fox-finance-toggle", text: "\u{1F441}" });
    toggleBtn.onclick = () => card.classList.toggle("fox-finance-blurred");
    card.createDiv({ cls: "fox-finance-summary", attr: { id: "fox-finance-summary" } });
    card.createDiv({ cls: "fox-finance-accounts", attr: { id: "fox-fc-accounts" } });
    card.createDiv({ cls: "fox-finance-list", attr: { id: "fox-finance-list" } });
    const btnRow = card.createDiv({ cls: "fox-finance-toolbar" });
    btnRow.createEl("button", { cls: "fox-add-mini", attr: { id: "fox-fc-add" }, text: "\u{1F4DD} \u8BB0\u4E00\u7B14" });
    btnRow.createEl("button", { cls: "fox-add-mini", attr: { id: "fox-fc-open" }, text: "\u{1F332} \u8FDB\u5165\u68EE\u6797" });
    const deco = card.createDiv({ cls: "fox-card-decoration" });
    deco.createEl("img", { attr: { src: this.getAssetPath("assets/icons/\u5E73\u8861\u77F3\u5806.png") } });
    return card;
  }
  async loadFinance() {
    const summaryEl = this.contentEl.querySelector("#fox-finance-summary");
    const accEl = this.contentEl.querySelector("#fox-fc-accounts");
    const listEl = this.contentEl.querySelector("#fox-finance-list");
    if (!summaryEl || !listEl || !accEl)
      return;
    const allTxs = [];
    const balances = {};
    try {
      const ledgerDir = "Finance/Ledger";
      const exists = await this.app.vault.adapter.exists(ledgerDir);
      if (exists) {
        const { files } = await this.app.vault.adapter.list(ledgerDir);
        for (const file of files.filter((f) => f.endsWith(".md")).sort()) {
          const content = await this.app.vault.adapter.read(file);
          const lines = content.split("\n").filter((l) => l.startsWith("| ") && !l.startsWith("| date") && !l.startsWith("|---"));
          for (const line of lines) {
            const cols = line.split("|").map((c) => c.trim()).filter(Boolean);
            if (cols.length < 7)
              continue;
            const tx = {
              date: cols[0],
              type: cols[1],
              amount: parseFloat(cols[2]) || 0,
              account: cols[3],
              toAccount: cols[4] === "-" ? "" : cols[4],
              category: cols[5] || "",
              subcategory: cols[6] || "",
              note: cols[7] || ""
            };
            allTxs.push(tx);
            switch (tx.type) {
              case "income":
              case "refund":
                balances[tx.account] = (balances[tx.account] || 0) + tx.amount;
                break;
              case "expense":
                balances[tx.account] = (balances[tx.account] || 0) - tx.amount;
                break;
              case "transfer":
              case "investment_in":
                balances[tx.account] = (balances[tx.account] || 0) - tx.amount;
                if (tx.toAccount)
                  balances[tx.toAccount] = (balances[tx.toAccount] || 0) + tx.amount;
                break;
              case "investment_return":
                if (tx.toAccount)
                  balances[tx.toAccount] = (balances[tx.toAccount] || 0) + tx.amount;
                break;
              case "balance_adjust":
                balances[tx.account] = tx.amount;
                break;
            }
          }
        }
      }
    } catch (_) {
    }
    const now = /* @__PURE__ */ new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const monthTxs = allTxs.filter((t) => t.date.startsWith(thisMonth));
    const income = monthTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = monthTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const net = income - expense;
    const fmt = (n) => "\xA5" + n.toFixed(2);
    summaryEl.innerHTML = `
			<div class="fox-finance-summary-inner">
				<div class="fox-finance-stat"><span class="fox-finance-stat-label">\u6536\u5165</span><span class="fox-finance-stat-val income">${fmt(income)}</span></div>
				<div class="fox-finance-stat"><span class="fox-finance-stat-label">\u652F\u51FA</span><span class="fox-finance-stat-val expense">${fmt(expense)}</span></div>
				<div class="fox-finance-stat"><span class="fox-finance-stat-label">\u51C0\u589E</span><span class="fox-finance-stat-val ${net >= 0 ? "income" : "expense"}">${fmt(net)}</span></div>
			</div>
		`;
    accEl.empty();
    const sortedAccs = Object.keys(balances).sort();
    if (sortedAccs.length === 0) {
      accEl.createSpan({ cls: "fox-task-empty", text: "\u6682\u65E0\u8D26\u6237\u6570\u636E" });
    } else {
      for (const name of sortedAccs) {
        const bal = balances[name];
        const item = accEl.createDiv("fox-finance-account-item");
        item.createSpan({ cls: "fox-finance-account-name", text: name });
        const balEl = item.createSpan({ cls: "fox-finance-account-bal", text: fmt(bal) });
        balEl.style.color = bal >= 0 ? "#34d399" : "#f87171";
      }
    }
    const sorted = [...monthTxs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    if (sorted.length === 0) {
      listEl.innerHTML = '<div class="fox-task-empty">\u{1F331} \u68EE\u6797\u8FD8\u5F88\u5B89\u9759\uFF0C\u8BB0\u4E00\u7B14\u5427</div>';
    } else {
      listEl.innerHTML = sorted.map((tx) => {
        const sign = tx.type === "income" ? "+" : "-";
        const cls = tx.type === "income" ? "fox-finance-income" : "fox-finance-expense";
        return `<div class="fox-finance-record ${cls}"><span class="fox-finance-rec-date">${tx.date.slice(5)}</span><span class="fox-finance-rec-cat">${this.escapeHtml(tx.category)}</span><span class="fox-finance-rec-desc">${tx.note ? " \xB7 " + this.escapeHtml(tx.note) : ""}</span><span class="fox-finance-rec-amt">${sign}\xA5${tx.amount.toFixed(2)}</span></div>`;
      }).join("");
    }
    this.bindFinanceButtons();
  }
  bindFinanceButtons() {
    const addBtn = this.contentEl.querySelector("#fox-fc-add");
    const openBtn = this.contentEl.querySelector("#fox-fc-open");
    if (addBtn) {
      addBtn.onclick = () => {
        this.app.workspace.trigger("fox-finance:quick-add");
        setTimeout(() => {
          this.app.commands.executeCommandById("fox-finance:quick-add");
        }, 50);
      };
    }
    if (openBtn) {
      openBtn.onclick = () => {
        this.app.workspace.trigger("fox-finance:open-dashboard");
        const ff = this.app.plugins?.plugins?.["fox-finance"];
        if (ff?.activateView)
          ff.activateView();
      };
    }
  }
  // ═══════════════════════════════════════════════
  // HEATMAP — Full-width yearly card	// ═══════════════════════════════════════════════
  // HEATMAP — Full-width yearly card
  // ═══════════════════════════════════════════════
  // HEATMAP — Full-width yearly card
  // ═══════════════════════════════════════════════
  createHeatmapCard() {
    const card = createDiv({ cls: "fox-card fox-heatmap-card" });
    const header = card.createDiv({ cls: "fox-card-header" });
    const icon = header.createEl("img", { cls: "fox-card-icon" });
    icon.src = this.getAssetPath("assets/icons/\u72EC\u884C\u7BDD\u706B.png");
    header.createSpan({ cls: "fox-card-title", text: "\u5E74\u5EA6\u70ED\u529B\u56FE" });
    header.createSpan({ cls: "fox-card-subtitle", text: "HEATMAP" });
    card.createDiv({ cls: "fox-heatmap-wrap", attr: { id: "fox-heatmap-wrap" } });
    const deco = card.createDiv({ cls: "fox-card-decoration" });
    deco.createEl("img", { attr: { src: this.getAssetPath("assets/icons/\u72EC\u884C\u7BDD\u706B.png") } });
    return card;
  }
  // FOOTER
  // ═══════════════════════════════════════════════
  createFooter() {
    const footer = createDiv({ cls: "fox-footer" });
    footer.createSpan({ text: "\u{1F43A}" });
    footer.createSpan({ text: "Stay hungry. Stay foolish." });
    footer.createSpan({ text: "\u2014 \u72EC\u884C\u72FC" });
    return footer;
  }
  // ═══════════════════════════════════════════════
  // SECOND SPACE
  // ═══════════════════════════════════════════════
  createSecondSpace() {
    const space = createDiv({ cls: "fox-second-space" });
    space.createDiv({ cls: "fox-section-title", text: "\u{1F332} \u68EE\u6797\u6DF1\u5904" });
    const grid = space.createDiv({ cls: "fox-grid-4" });
    const cards = this.plugin.settings.secondForest;
    const iconMap = ["\u63A2\u7D22\u8005\u7F57\u76D8.png", "\u6708\u5149\u80FD\u91CF\u7403.png", "\u84DD\u8272\u6C34\u6676\u7C07.png", "\u751F\u547D\u4E4B\u6811\u5FBD\u7AE0.png"];
    for (let i = 0; i < 4; i++) {
      const c = cards[i] || { name: "\u{1F4C4} \u9875\u9762", path: "" };
      const icon = iconMap[i] || "\u63A2\u7D22\u8005\u7F57\u76D8.png";
      const card = grid.createDiv({ cls: "fox-card" });
      const h = card.createDiv({ cls: "fox-card-header" });
      const img = h.createEl("img", { cls: "fox-card-icon" });
      img.src = this.getAssetPath(`assets/icons/${icon}`);
      h.createSpan({ cls: "fox-card-title", text: c.name });
      const desc = card.createDiv({ cls: "fox-task-empty", text: c.path ? `\u2192 ${c.path}` : "\u{1F6A7} \u672A\u914D\u7F6E" });
      if (c.path) {
        card.style.cursor = "pointer";
        card.onclick = () => {
          this.openNoteOrFolder(c.path);
        };
      }
    }
    return space;
  }
  openNoteOrFolder(path) {
    if (!path)
      return;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof import_obsidian.TFile) {
      this.app.workspace.getLeaf().openFile(file);
    } else {
      this.app.workspace.openLinkText(path, "/", false);
    }
  }
  openTodayDiary() {
    const dateStr = this.dateStr(0);
    const path = `10-Daily/${dateStr}.md`;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof import_obsidian.TFile) {
      this.app.workspace.getLeaf().openFile(file);
    } else {
      this.app.workspace.openLinkText(path, "/", false);
    }
  }
  // ═══════════════════════════════════════════════
  // DATA: STATS
  // ═══════════════════════════════════════════════
  async loadStats() {
    try {
      const files = this.app.vault.getMarkdownFiles().filter((f) => f.path.startsWith("10-Daily/") && /^\d{4}-\d{2}-\d{2}$/.test(f.basename));
      const today = /* @__PURE__ */ new Date();
      const thisMonth = today.getMonth();
      const thisYear = today.getFullYear();
      const monthly = files.filter((f) => {
        const d = new Date(f.basename);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      });
      const total = files.length;
      const dateSet = new Set(files.map((f) => f.basename));
      let streak = 0;
      const cursor = new Date(today);
      for (let i = 0; i < 365; i++) {
        const ds = cursor.toISOString().slice(0, 10);
        if (dateSet.has(ds)) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        } else
          break;
      }
      this.setText("fox-stat-diaries", `${total} \u7BC7`);
      this.setText("fox-stat-streak", `${streak} \u5929`);
      this.setText("fox-stat-monthly", `${monthly.length} \u5929`);
      const todayStr = today.toISOString().slice(0, 10);
      const todayFile = files.find((f) => f.basename === todayStr);
      if (todayFile) {
        const content = await this.app.vault.read(todayFile);
        const taskLines = content.split("\n").filter((l) => /^- \[.\]/.test(l));
        const done = taskLines.filter((l) => /^- \[x\]/.test(l)).length;
        const tt = taskLines.length;
        this.setText("fox-stat-goal", tt > 0 ? `${done}/${tt}` : "\u2014");
      } else {
        this.setText("fox-stat-goal", "\u2014");
      }
    } catch (e) {
      console.error("[Fox] Stats error:", e);
    }
  }
  setText(id, text) {
    const el = this.contentEl.querySelector(`#${id}`);
    if (el)
      el.textContent = text;
  }
  // ═══════════════════════════════════════════════
  // DATA: RECENT UPDATES
  // ═══════════════════════════════════════════════
  async loadRecentUpdates() {
    try {
      const listEl = this.contentEl.querySelector("#fox-recent-list");
      if (!listEl)
        return;
      const files = this.app.vault.getMarkdownFiles().filter((f) => !f.path.startsWith(".") && f.path !== "Home.md" && f.path !== "README.md").sort((a, b) => b.stat.mtime - a.stat.mtime).slice(0, 5);
      if (files.length === 0) {
        listEl.innerHTML = '<div class="fox-task-empty">\u{1F4ED} \u6682\u65E0\u7B14\u8BB0</div>';
        return;
      }
      const now = /* @__PURE__ */ new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      listEl.innerHTML = files.map((f) => {
        const mtime = new Date(f.stat.mtime);
        const rel = mtime.toDateString() === now.toDateString() ? `\u4ECA\u5929 ${mtime.toTimeString().slice(0, 5)}` : mtime.toDateString() === yesterday.toDateString() ? `\u6628\u5929 ${mtime.toTimeString().slice(0, 5)}` : `${(mtime.getMonth() + 1).toString().padStart(2, "0")}-${mtime.getDate().toString().padStart(2, "0")} ${mtime.toTimeString().slice(0, 5)}`;
        return `<a class="fox-recent-item" href="#" data-path="${f.path}"><span class="fox-recent-name">${f.basename}</span><span class="fox-recent-time">${rel}</span></a>`;
      }).join("");
      listEl.querySelectorAll(".fox-recent-item").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.preventDefault();
          const path = el.dataset.path;
          if (path)
            this.openNote(path);
        });
      });
    } catch (e) {
      console.error("[Fox] Recent updates error:", e);
    }
  }
  async loadHeatmap() {
    const wrap = this.contentEl.querySelector("#fox-heatmap-wrap");
    if (!wrap)
      return;
    try {
      const allFiles = this.app.vault.getMarkdownFiles().filter((f) => !f.path.startsWith(".") && f.path !== "README.md" && f.path !== "CLAUD.md");
      const dateCount = /* @__PURE__ */ new Map();
      for (const f of allFiles) {
        const d = new Date(f.stat.mtime);
        const key = d.toISOString().slice(0, 10);
        dateCount.set(key, (dateCount.get(key) || 0) + 1);
      }
      if (dateCount.size === 0) {
        wrap.innerHTML = '<div class="fox-task-empty">\u{1F4ED} \u6682\u65E0\u65E5\u8BB0\u8BB0\u5F55</div>';
        return;
      }
      const today = /* @__PURE__ */ new Date();
      const hmFill = getComputedStyle(this.contentEl).getPropertyValue("--fox-heatmap-fill").trim() || "#789B58";
      const hmR = parseInt(hmFill.slice(1, 3), 16), hmG = parseInt(hmFill.slice(3, 5), 16), hmB = parseInt(hmFill.slice(5, 7), 16);
      const hmRgba = (a) => `rgba(${hmR},${hmG},${hmB},${a})`;
      const hmStroke = hmRgba("0.15");
      const fillColor = (count) => count === 0 ? hmRgba("0.06") : hmRgba(String(Math.min(0.26 + (count - 1) / 49 * 0.64, 0.9).toFixed(3)));
      let html = '<div class="fox-heatmap-tabs">';
      const modes = ["week", "month", "year"];
      const labels = { week: "\u5468", month: "\u6708", year: "\u5E74" };
      for (const m of modes) {
        const active = m === this.heatmapMode ? " active" : "";
        html += `<span class="fox-heatmap-tab${active}" data-mode="${m}">${labels[m]}</span>`;
      }
      html += "</div>";
      html += '<div class="fox-heatmap-labels" id="fox-hm-labels"></div>';
      const cellGap = 3;
      if (this.heatmapMode === "year") {
        const cellSize = 14;
        const step = cellSize + cellGap;
        const oneYearAgo = new Date(today.getFullYear(), 0, 1);
        const yearEnd = new Date(today.getFullYear(), 11, 31);
        const totalDays = Math.round((yearEnd.getTime() - oneYearAgo.getTime()) / 864e5) + 1;
        const cols = 53;
        const rows = 7;
        const dows = ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"];
        const svgW = cols * step + 30;
        const svgH = rows * step + 30;
        let svg = `<svg class="fox-heatmap-svg fox-heatmap-svg-year" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
        for (let i = 0; i < totalDays; i++) {
          const d = new Date(oneYearAgo);
          d.setDate(d.getDate() + i);
          const ds = d.toISOString().slice(0, 10);
          const count = dateCount.get(ds) || 0;
          const dow = d.getDay();
          const dayOfYear = Math.floor((d.getTime() - oneYearAgo.getTime()) / 864e5);
          const col = Math.max(0, Math.min(52, Math.floor(dayOfYear / 7)));
          const row = dow;
          const x = col * step + 28;
          const y = row * step + 6;
          svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="3" fill="${fillColor(count)}" stroke="${hmStroke}" stroke-width="0.5" data-date="${ds}"><title>${ds} \xB7 ${count > 0 ? count + " \u7BC7\u65E5\u8BB0" : "\u65E0\u8BB0\u5F55"}</title></rect>`;
        }
        for (let r = 0; r < 7; r++) {
          if (r % 2 === 0) {
            svg += `<text x="2" y="${r * step + cellSize + 5}" class="fox-hm-dow">${dows[r]}</text>`;
          }
        }
        svg += `<defs><linearGradient id="hm-legend-grad" x1="0%" y1="0%" x2="100%" y2="0%">`;
        for (let g = 0; g <= 10; g++) {
          const pct = g / 10;
          const alpha = 0.06 + pct * 0.84;
          svg += `<stop offset="${Math.round(pct * 100)}%" stop-color="rgba(${hmR},${hmG},${hmB},${alpha.toFixed(3)})"/>`;
        }
        svg += `</linearGradient></defs>`;
        svg += `<g transform="translate(${cols * step - 130}, ${rows * step + 10})">`;
        svg += `<text x="0" y="0" class="fox-hm-dow" style="font-size:7px">\u5C11</text>`;
        svg += `<rect x="14" y="-8" width="60" height="14" rx="3" fill="url(#hm-legend-grad)" stroke="${hmStroke}" stroke-width="0.5"/>`;
        svg += `<text x="80" y="0" class="fox-hm-dow" style="font-size:7px">\u591A</text></g>`;
        svg += "</svg>";
        wrap.innerHTML = html + '<div class="fox-heatmap-scroll-year"><div class="fox-heatmap-year-tag">' + today.getFullYear() + "</div>" + svg + "</div>";
      } else if (this.heatmapMode === "month") {
        const cellSize = 14;
        const step = cellSize + cellGap;
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDow = firstDay.getDay();
        const cols = 7;
        const rows = Math.ceil((startDow + daysInMonth) / 7);
        const dows = ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"];
        let svg = `<svg class="fox-heatmap-svg fox-heatmap-svg-month" width="${cols * step + 38}" height="${rows * step + 18}" viewBox="0 0 ${cols * step + 38} ${rows * step + 18}">`;
        for (let c = 0; c < 7; c++) {
          svg += `<text x="${c * step + 36}" y="10" class="fox-hm-dow">${dows[c]}</text>`;
        }
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month, d);
          const ds = date.toISOString().slice(0, 10);
          const count = dateCount.get(ds) || 0;
          const dow = date.getDay();
          const dayIndex = startDow + d - 1;
          const col = dayIndex % 7;
          const row = Math.floor(dayIndex / 7);
          const x = col * step + 34;
          const y = row * step + 16;
          svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="3" fill="${fillColor(count)}" stroke="${hmStroke}" stroke-width="0.5" data-date="${ds}"><title>${ds} \xB7 ${count > 0 ? count + " \u7BC7\u65E5\u8BB0" : "\u65E0\u8BB0\u5F55"}</title></rect>`;
        }
        svg += "</svg>";
        const monthLabel = `${year}\u5E74${month + 1}\u6708`;
        wrap.innerHTML = html + `<div class="fox-heatmap-labels" style="justify-content:center;font-size:0.7rem">${monthLabel}</div>` + svg;
      } else {
        const cellSize = 14;
        const step = cellSize + cellGap;
        const startOfWeek = new Date(today);
        const dow = today.getDay();
        startOfWeek.setDate(today.getDate() - dow);
        let svg = `<svg class="fox-heatmap-svg" width="${7 * step + 12}" height="${step + 18}" viewBox="0 0 ${7 * step + 12} ${step + 18}">`;
        const dows = ["\u65E5", "\u4E00", "\u4E8C", "\u4E09", "\u56DB", "\u4E94", "\u516D"];
        for (let c = 0; c < 7; c++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + c);
          const ds = d.toISOString().slice(0, 10);
          const count = dateCount.get(ds) || 0;
          const x = c * step + 10;
          svg += `<rect x="${x}" y="14" width="${cellSize}" height="${cellSize}" rx="3" fill="${fillColor(count)}" stroke="${hmStroke}" stroke-width="0.5" data-date="${ds}"><title>${ds} \xB7 ${count > 0 ? count + " \u7BC7\u65E5\u8BB0" : "\u65E0\u8BB0\u5F55"}</title></rect>`;
          svg += `<text x="${x + 2}" y="10" class="fox-hm-dow">${dows[c]}</text>`;
          const dayNum = d.getDate();
          svg += `<text x="${x + 2}" y="${step + 30}" class="fox-hm-dow" style="font-size:6px">${dayNum}</text>`;
        }
        svg += "</svg>";
        wrap.innerHTML = html + svg;
      }
      wrap.querySelectorAll(".fox-heatmap-tab").forEach((tab) => {
        tab.onclick = () => {
          const mode = tab.dataset.mode;
          if (mode && mode !== this.heatmapMode) {
            this.heatmapMode = mode;
            this.loadHeatmap();
          }
        };
      });
    } catch (e) {
      wrap.innerHTML = '<div class="fox-task-empty">\u26A0 \u70ED\u529B\u56FE\u52A0\u8F7D\u5931\u8D25</div>';
      console.error("[Fox] Heatmap error:", e);
    }
  }
  // ═══════════════════════════════════════════════
  // UTILITY
  // ═══════════════════════════════════════════════
  escapeHtml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
};
var TEMPLATES = [
  { id: "concept", label: "\u{1F4D8} \u6982\u5FF5", templateFile: "\u6A21\u677F/\u6982\u5FF5\u7B14\u8BB0\u6A21\u677F.md", getContent: () => "" },
  { id: "tutorial", label: "\u{1F4D7} \u6559\u7A0B", templateFile: "\u6A21\u677F/\u6559\u7A0B\u7B14\u8BB0\u6A21\u677F.md", getContent: () => "" },
  { id: "methodology", label: "\u{1F4D9} \u65B9\u6CD5\u8BBA", templateFile: "\u6A21\u677F/\u65B9\u6CD5\u8BBA\u7B14\u8BB0\u6A21\u677F.md", getContent: () => "" },
  { id: "tool", label: "\u{1F527} \u5DE5\u5177", templateFile: "\u6A21\u677F/\u5DE5\u5177\u7B14\u8BB0\u6A21\u677F.md", getContent: () => "" },
  { id: "thinking", label: "\u{1F4A1} \u601D\u8003", templateFile: "\u6A21\u677F/\u601D\u8003\u7B14\u8BB0\u6A21\u677F.md", getContent: () => "" },
  { id: "research-concept", label: "\u{1F52C} \u79D1\u7814\u6982\u5FF5\u7B14\u8BB0", templateFile: "\u6A21\u677F/\u79D1\u7814\u6982\u5FF5\u7B14\u8BB0\u6A21\u677F.md", getContent: () => "" },
  { id: "lit-note", label: "\u{1F4C4} \u6587\u732E\u7B14\u8BB0", templateFile: "\u6A21\u677F/\u6587\u732E\u7B14\u8BB0\u6A21\u677F.md", getContent: () => "" }
];
var KnowledgeModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.selectedId = "concept";
  }
  onOpen() {
    const { contentEl } = this;
    contentEl.addClass("fox-knowledge-modal");
    contentEl.empty();
    contentEl.createEl("h2", { text: "\u{1F4DA} \u65B0\u5EFA\u77E5\u8BC6\u5361\u7247" });
    this.titleInput = contentEl.createEl("input", {
      type: "text",
      attr: { placeholder: "\u77E5\u8BC6\u5361\u7247\u540D\u79F0\u2026", autofocus: "" }
    });
    this.titleInput.addClass("fox-knowledge-input");
    const list = contentEl.createDiv({ cls: "fox-knowledge-tpl-list" });
    for (const tpl of TEMPLATES) {
      const btn = list.createEl("button", { cls: "fox-knowledge-tpl-btn", text: tpl.label });
      if (tpl.id === this.selectedId)
        btn.addClass("active");
      btn.onclick = () => {
        list.querySelectorAll(".fox-knowledge-tpl-btn").forEach((b) => b.removeClass("active"));
        btn.addClass("active");
        this.selectedId = tpl.id;
      };
    }
    const btnRow = contentEl.createDiv({ cls: "fox-knowledge-actions" });
    const cancelBtn = btnRow.createEl("button", { cls: "fox-record-btn", text: "\u53D6\u6D88" });
    cancelBtn.onclick = () => this.close();
    this.createBtn = btnRow.createEl("button", {
      cls: "fox-record-btn",
      text: "\u{1F331} \u521B\u5EFA",
      attr: { style: "background: var(--fox-accent); color: #fff;" }
    });
    this.createBtn.onclick = () => this.doCreate();
    this.titleInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter")
        this.doCreate();
    });
    setTimeout(() => this.titleInput.focus(), 50);
  }
  async doCreate() {
    const title = this.titleInput.value.trim();
    if (!title) {
      new import_obsidian.Notice("\u8BF7\u8F93\u5165\u77E5\u8BC6\u5361\u7247\u540D\u79F0");
      this.titleInput.focus();
      return;
    }
    const safeName = title.replace(/[\/:*?"<>|]/g, "").trim() || "\u672A\u547D\u540D";
    const path = "20-Knowledge/" + safeName + ".md";
    if (this.app.vault.getAbstractFileByPath(path)) {
      new import_obsidian.Notice("\u26A0 \u5DF2\u5B58\u5728\u540C\u540D\u7B14\u8BB0\uFF1A" + safeName);
      return;
    }
    const tpl = TEMPLATES.find((t) => t.id === this.selectedId);
    const now = /* @__PURE__ */ new Date();
    const dateStr = now.toISOString().slice(0, 10);
    let content;
    try {
      const raw = await this.app.vault.adapter.read(tpl.templateFile);
      content = raw.replace(/\{\{title\}\}/g, title).replace(/\{\{概念名\}\}/g, title).replace(/\{\{date\}\}/g, dateStr).replace(/\{\{.*?\}\}/g, "");
    } catch {
      new import_obsidian.Notice("\u26A0 \u8BFB\u53D6\u6A21\u677F\u6587\u4EF6\u5931\u8D25");
      return;
    }
    try {
      await this.app.vault.create(path, content);
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof import_obsidian.TFile) {
        this.app.workspace.getLeaf().openFile(file);
      }
      this.close();
    } catch (e) {
      new import_obsidian.Notice("\u26A0 \u521B\u5EFA\u7B14\u8BB0\u5931\u8D25");
      console.error("[Fox] Knowledge create error:", e);
    }
  }
  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
};

// main.ts
var DEFAULT_SETTINGS = {
  theme: "day",
  bgDayIndex: 0,
  bgNightIndex: 0,
  mottoList: [
    "\u771F\u6B63\u7684\u81EA\u7531\uFF0C\u662F\u8D70\u81EA\u5DF1\u7684\u8DEF\uFF0C\u5E76\u628A\u5B83\u505A\u5230\u6781\u81F4\u3002",
    "\u6DF1\u5EA6\u601D\u8003\uFF0C\u523B\u610F\u7EC3\u4E60\u3002",
    "\u4E13\u6CE8 \xB7 \u6210\u957F \xB7 \u957F\u671F\u4E3B\u4E49"
  ],
  countdowns: [],
  progressItems: [
    { name: "GRE \u5907\u8003", value: 0, max: 100 },
    { name: "Python \u6570\u636E\u5206\u6790", value: 0, max: 100 },
    { name: "\u8D22\u52A1\u5EFA\u6A21", value: 0, max: 100 }
  ],
  secondForest: [
    { name: "\u{1F4DA} \u56FE\u4E66\u9986", path: "" },
    { name: "\u{1F3AC} \u7535\u5F71\u6536\u85CF", path: "" },
    { name: "\u{1F4DD} \u957F\u671F\u9879\u76EE", path: "" },
    { name: "\u{1F331} \u6210\u957F\u8BB0\u5F55", path: "" }
  ],
  habitDefs: [
    { id: "\u65E9\u8D77", label: "\u{1F305} \u65E9\u8D77 (7:30\u524D)" },
    { id: "\u51A5\u60F3", label: "\u{1F9D8} \u51A5\u60F3" },
    { id: "\u8FD0\u52A8", label: "\u{1F3C3} \u8FD0\u52A8" },
    { id: "\u9605\u8BFB", label: "\u{1F4D6} \u9605\u8BFB" },
    { id: "\u65E5\u8BB0", label: "\u{1F4DD} \u65E5\u8BB0" }
  ]
};
var FoxDashboardPlugin = class extends import_obsidian2.Plugin {
  async onload() {
    await this.loadSettings();
    this.registerView(VIEW_TYPE_FOX, (leaf) => new FoxDashboardView(leaf, this));
    this.addRibbonIcon("compass", "\u72D0\u306E\u5DE5\u4F5C\u53F0", () => this.openView());
    this.addCommand({ id: "open-fox-dashboard", name: "\u6253\u5F00\u72D0\u306E\u5DE5\u4F5C\u53F0", callback: () => this.openView() });
    this.app.workspace.onLayoutReady(() => setTimeout(() => this.openView(), 200));
    this.addSettingTab(new FoxDashboardSettingTab(this.app, this));
  }
  async onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_FOX);
  }
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }
  async saveSettings() {
    await this.saveData(this.settings);
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FOX);
    for (const leaf of leaves) {
      if (leaf.view instanceof FoxDashboardView)
        leaf.view.onSettingsChanged();
    }
  }
  async openView() {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_FOX);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getLeaf("tab");
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE_FOX, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }
};
function FoxItemList(el, items, config) {
  const listEl = el.createDiv();
  function render() {
    listEl.empty();
    if (items.length === 0) {
      listEl.createEl("p", { cls: "fox-sub-empty", text: config.emptyText || "\u6682\u65E0\u9879\u76EE" });
    } else {
      items.forEach((item, i) => {
        const fields = config.renderRow(item, i);
        const s = new import_obsidian2.Setting(listEl);
        for (const f of fields) {
          if (f.type === "text") {
            s.addText((t) => t.setPlaceholder(f.placeholder).setValue(String(f.value)).onChange(f.onChange));
          } else {
            s.addText((t) => t.setPlaceholder(f.placeholder).setValue(String(f.value)).onChange((v) => f.onChange(v)));
          }
        }
        s.addButton((b) => b.setIcon("trash").setWarning().onClick(async () => {
          items.splice(i, 1);
          await config.onSave();
          render();
        }));
        s.settingEl.addClass("fox-setting-row");
      });
    }
  }
  render();
  new import_obsidian2.Setting(el).addButton((b) => b.setButtonText(config.addBtnText || "\uFF0B \u6DFB\u52A0").setCta().onClick(async () => {
    items.push(config.onAdd());
    await config.onSave();
    render();
  }));
}
var FoxDashboardSettingTab = class extends import_obsidian2.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  get p() {
    return this.plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "\u{1F98A} \u72D0\u306E\u5DE5\u4F5C\u53F0\u8BBE\u7F6E" });
    containerEl.createEl("h3", { text: "\u5EA7\u53F3\u94ED\u5217\u8868" });
    FoxItemList(containerEl, this.p.settings.mottoList, {
      emptyText: "\u6682\u65E0\u5EA7\u53F3\u94ED",
      addBtnText: "\uFF0B \u6DFB\u52A0\u5EA7\u53F3\u94ED",
      onAdd: () => "",
      renderRow: (item, i) => [
        { type: "text", placeholder: "\u8F93\u5165\u5EA7\u53F3\u94ED\u2026", value: item, onChange: (v) => {
          this.p.settings.mottoList[i] = v;
        } }
      ],
      onSave: async () => {
        await this.p.saveSettings();
      }
    });
    containerEl.createEl("h3", { text: "\u5B66\u4E60\u8FDB\u5EA6\u9879" });
    FoxItemList(containerEl, this.p.settings.progressItems, {
      emptyText: "\u6682\u65E0\u8FDB\u5EA6\u9879",
      addBtnText: "\uFF0B \u6DFB\u52A0\u9879\u76EE",
      onAdd: () => ({ name: "", value: 0, max: 100 }),
      renderRow: (item, i) => [
        { type: "text", placeholder: "\u540D\u79F0\uFF08\u5982 GRE \u5907\u8003\uFF09", value: item.name, onChange: (v) => {
          item.name = v;
        } },
        { type: "number", placeholder: "\u5F53\u524D", value: item.value, onChange: (v) => {
          item.value = parseInt(v) || 0;
        } },
        { type: "number", placeholder: "\u76EE\u6807", value: item.max, onChange: (v) => {
          item.max = parseInt(v) || 100;
        } }
      ],
      onSave: async () => {
        await this.p.saveSettings();
      }
    });
    containerEl.createEl("h3", { text: "\u7B2C\u4E8C\u68EE\u6797\u5165\u53E3" });
    FoxItemList(containerEl, this.p.settings.secondForest, {
      emptyText: "\u6682\u65E0\u5165\u53E3",
      addBtnText: "\uFF0B \u6DFB\u52A0\u5165\u53E3",
      onAdd: () => ({ name: "", path: "" }),
      renderRow: (item, i) => [
        { type: "text", placeholder: "\u663E\u793A\u540D\u79F0", value: item.name, onChange: (v) => {
          item.name = v;
        } },
        { type: "text", placeholder: "\u7B14\u8BB0/\u6587\u4EF6\u5939\u8DEF\u5F84", value: item.path, onChange: (v) => {
          item.path = v;
        } }
      ],
      onSave: async () => {
        await this.p.saveSettings();
      }
    });
    containerEl.createEl("h3", { text: "\u5065\u5EB7\u4E60\u60EF" });
    FoxItemList(containerEl, this.p.settings.habitDefs, {
      emptyText: "\u6682\u65E0\u4E60\u60EF",
      addBtnText: "\uFF0B \u6DFB\u52A0\u4E60\u60EF",
      onAdd: () => ({ id: "", label: "" }),
      renderRow: (item, i) => [
        { type: "text", placeholder: "id\uFF08\u5982 \u65E9\u8D77\uFF09", value: item.id, onChange: (v) => {
          item.id = v;
        } },
        { type: "text", placeholder: "\u663E\u793A\u6587\u5B57\uFF08\u5982 \u{1F305} \u65E9\u8D77\uFF09", value: item.label, onChange: (v) => {
          item.label = v;
        } }
      ],
      onSave: async () => {
        await this.p.saveSettings();
      }
    });
    containerEl.createEl("hr");
    new import_obsidian2.Setting(containerEl).addButton((b) => b.setButtonText("\u{1F4BE} \u4FDD\u5B58\u8BBE\u7F6E").setCta().onClick(async () => {
      await this.p.saveSettings();
      new Notice("\u2705 \u8BBE\u7F6E\u5DF2\u4FDD\u5B58");
    }));
  }
};
