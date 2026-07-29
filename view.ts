import { ItemView, WorkspaceLeaf, TFile, Modal, Notice, App } from 'obsidian';
import FoxDashboardPlugin from './main';

export const VIEW_TYPE_FOX = 'fox-dashboard';

interface TaskItem {
	text: string;
	lineNum: number;
	source: 'yesterday' | 'today';
}

export class FoxDashboardView extends ItemView {
	plugin: FoxDashboardPlugin;
	private clockInterval: number | null = null;

	// Refs for clock updates
	private heroDateEl: HTMLElement | null = null;
	private heroTimeEl: HTMLElement | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: FoxDashboardPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string { return VIEW_TYPE_FOX; }
	getDisplayText(): string { return '狐の工作台'; }
	getIcon(): string { return 'compass'; }

	async onOpen() {
		this.render();
		this.startClock();
		this.loadStats();
		this.loadRecentUpdates();
		this.loadTasks();
		this.loadQuickCapture();
		this.loadProgress();
		this.loadFinance();

		// Wait for DOM to be ready, then load interactive components
		setTimeout(() => this.loadCountdowns(), 100);
		setTimeout(() => this.loadMood(), 150);
		setTimeout(() => this.loadHabits(), 200);
		setTimeout(() => this.loadHeatmap(), 250);

		// Auto-refresh finance when fox-finance saves
		this.registerEvent(
			this.app.workspace.on('fox-finance:updated', () => this.loadFinance()),
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
		container.className = 'fox-dashboard-view';
		container.classList.add(this.plugin.settings.theme === 'night' ? 'fox-night' : 'fox-day');

		container.appendChild(this.createBackgrounds());
		container.appendChild(this.createOverlay());
		container.appendChild(this.createContent());
	}

	// ─── BACKGROUNDS ───────────────────────────────

	private createBackgrounds(): HTMLElement {
		const bg = createDiv({ cls: 'fox-bg-layer' });
		const dayBg = bg.createEl('img', { cls: 'fox-bg-img' });
		dayBg.id = 'fox-bg-day';
		dayBg.src = this.getBgPath('assets/backgrounds/白天2.png');
		const nightBg = bg.createEl('img', { cls: 'fox-bg-img' });
		nightBg.id = 'fox-bg-night';
		nightBg.src = this.getBgPath('assets/backgrounds/黑夜1.png');
		return bg;
	}

	private getBgPath(relativePath: string): string {
		const file = this.app.vault.getAbstractFileByPath(relativePath);
		if (file instanceof TFile) return this.app.vault.getResourcePath(file);
		return relativePath;
	}

	private getAssetPath(relativePath: string): string {
		const file = this.app.vault.getAbstractFileByPath(relativePath);
		if (file instanceof TFile) return this.app.vault.getResourcePath(file);
		return relativePath;
	}


	private createOverlay(): HTMLElement {
		return createDiv({ cls: 'fox-overlay' });
	}

	// ─── CONTENT ───────────────────────────────────

	private createContent(): HTMLElement {
		const content = createDiv({ cls: 'fox-dashboard-content' });
		content.appendChild(this.createTopbar());
		content.appendChild(this.createWorkspace());
		content.appendChild(this.createHeatmapCard());
		content.appendChild(this.createSecondSpace());
		content.appendChild(this.createFooter());
		return content;
	}

	// ─── THREE-COLUMN WORKSPACE ─────────────────────

	private createWorkspace(): HTMLElement {
		const ws = createDiv({ cls: 'fox-workspace' });

		// Left Column: Status & Navigation
		const left = ws.createDiv({ cls: 'fox-col-left' });
		left.appendChild(this.createHero());
		left.appendChild(this.createCountdownCard());
		left.appendChild(this.createQuickNav());

		// Middle Column: Today's Actions
		const mid = ws.createDiv({ cls: 'fox-col-middle' });
		mid.appendChild(this.createTaskCard());
		const midMini = mid.createDiv({ cls: 'fox-grid-2' });
		midMini.appendChild(this.createMoodCard());
		midMini.appendChild(this.createHabitCard());
		mid.appendChild(this.createCard(
			'', '月光能量球.png', '最近更新', 'RECENT',
			'<div id="fox-recent-list"><div class="fox-placeholder">📝 加载中…</div></div>', '灵心水滴.png'
		));

		// Right Column: Quick Tools
		const right = ws.createDiv({ cls: 'fox-col-right' });
		right.appendChild(this.createQuickCaptureCard());
		right.appendChild(this.createProgressCard());
		right.appendChild(this.createFinanceCard());

		return ws;
	}

	// ─── Task Card (extracted from Main Grid) ───────

	private createTaskCard(): HTMLElement {
		const card = createDiv({ cls: 'fox-card fox-task-card' });
		const header = card.createDiv({ cls: 'fox-card-header' });
		const icon = header.createEl('img', { cls: 'fox-card-icon' });
		icon.src = this.getAssetPath('assets/icons/旅人提灯.png');
		header.createSpan({ cls: 'fox-card-title', text: '今日任务' });
		header.createSpan({ cls: 'fox-card-subtitle', text: 'TASKS' });
		card.createDiv({ cls: 'fox-task-list', attr: { id: 'fox-task-list' } });
		card.createDiv({ cls: 'fox-task-summary', attr: { id: 'fox-task-summary' } });
		const addRow = card.createDiv({ cls: 'fox-task-add-row' });
		addRow.createEl('input', { cls: 'fox-record-input', attr: { id: 'fox-task-input', type: 'text', placeholder: '添加待办…' } });
		addRow.createEl('button', { cls: 'fox-record-btn', attr: { id: 'fox-task-add-btn' }, text: '+ 添加' });
		card.createDiv({ cls: 'fox-task-status', attr: { id: 'fox-task-status' } });
		const deco = card.createDiv({ cls: 'fox-card-decoration' });
		deco.createEl('img', { attr: { src: this.getAssetPath('assets/icons/灵心水滴.png') } });
		return card;
	}

	// ═══════════════════════════════════════════════
	// TOPBAR
	// ═══════════════════════════════════════════════

	private createTopbar(): HTMLElement {
		const bar = createDiv({ cls: 'fox-topbar' });

		const left = bar.createDiv({ cls: 'fox-topbar-left' });
		const logo = left.createEl('img', { cls: 'fox-logo-icon' });
		logo.src = this.getAssetPath('assets/icons/孤狼守护者.png');
		left.createSpan({ cls: 'fox-title', text: '狐の工作台' });

		const center = bar.createDiv({ cls: 'fox-topbar-center' });
		center.createSpan({ cls: 'fox-topbar-tagline', text: '专注 · 成长 · 长期主义' });

		const right = bar.createDiv({ cls: 'fox-topbar-right' });
		const logLink = right.createEl('a', { cls: 'fox-header-link', href: '#' });
		logLink.onclick = (e) => { e.preventDefault(); this.openTodayDiary(); };
		const logIcon = logLink.createEl('img', { cls: 'fox-header-icon' });
		logIcon.src = this.getAssetPath('assets/icons/沉睡狐狸.png');

		const toggleBtn = right.createEl('button', {
			cls: 'fox-toggle-btn',
			text: this.plugin.settings.theme === 'night' ? '☀️ 白天' : '🌙 夜晚',
		});
		toggleBtn.onclick = () => this.toggleTheme();

		return bar;
	}

	private openFolder(path: string) {
		this.app.workspace.openLinkText(path, '/', false);
	}

	private openNote(path: string) {
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) this.app.workspace.getLeaf().openFile(file);
		else this.app.workspace.openLinkText(path, '/', false);
	}

	private openKnowledgeCreator() {
		new KnowledgeModal(this.app, this.plugin).open();
	}

	private toggleTheme() {
		this.plugin.settings.theme = this.plugin.settings.theme === 'night' ? 'day' : 'night';
		this.plugin.saveSettings();
		this.render();
	}

	// ═══════════════════════════════════════════════
	// HERO — Clock + Stats
	// ═══════════════════════════════════════════════

	private createHero(): HTMLElement {
		const hero = createDiv({ cls: 'fox-hero' });
		const left = hero.createDiv({ cls: 'fox-hero-left' });
		this.heroDateEl = left.createDiv({ cls: 'fox-hero-date', text: this.formatDate() });
		this.heroTimeEl = left.createDiv({ cls: 'fox-hero-time', text: this.formatTime() });
		left.createDiv({ cls: 'fox-hero-quote', text: this.getMotto() });

		const right = hero.createDiv({ cls: 'fox-hero-right' });
		const stats = right.createDiv({ cls: 'fox-hero-stats' });
		this.createStatItem(stats, '蓝色羽毛.png', '—', '日志数量', 'fox-stat-diaries');
		this.createStatItem(stats, '独行篝火.png', '—', '连续记录', 'fox-stat-streak');
		this.createStatItem(stats, '时间沙漏.png', '—', '本月天数', 'fox-stat-monthly');
		this.createStatItem(stats, '旅人提灯.png', '—', '今日目标', 'fox-stat-goal');
		return hero;
	}

	private createStatItem(parent: HTMLElement, iconFile: string, value: string, label: string, id: string) {
		const item = parent.createDiv({ cls: 'fox-stat-item' });
		const icon = item.createEl('img', { cls: 'fox-stat-icon' });
		icon.src = this.getAssetPath(`assets/icons/${iconFile}`)
		const valEl = item.createSpan({ cls: 'fox-stat-value', text: value, attr: { id } });
		item.createSpan({ cls: 'fox-stat-label', text: label });
	}

	private formatDate(): string {
		const now = new Date();
		const wd = ['日', '一', '二', '三', '四', '五', '六'];
		return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${wd[now.getDay()]}`;
	}

	private formatTime(): string {
		const now = new Date();
		return String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
	}

	private getMotto(): string {
		const list = this.plugin.settings.mottoList;
		if (list.length === 0) return '';
		return list[new Date().getDate() % list.length];
	}

	private startClock() {
		if (this.clockInterval) clearInterval(this.clockInterval);
		this.clockInterval = window.setInterval(() => {
			if (this.heroTimeEl) this.heroTimeEl.textContent = this.formatTime();
			if (this.heroDateEl) this.heroDateEl.textContent = this.formatDate();
		}, 1000);
	}

	// ═══════════════════════════════════════════════
	// QUICK NAV
	// ═══════════════════════════════════════════════

	private createQuickNav(): HTMLElement {
		const nav = createDiv({ cls: 'fox-quick-nav' });
		const items = [
			{ icon: '探索者罗盘.png', title: '知识森林', desc: '知识库', path: null, isKnowledge: true },
			{ icon: '雪山山峰.png', title: '学习专区', desc: '英语/GRE/CFA', path: '30-Learning/' },
			{ icon: '沉睡狐狸.png', title: '日志系统', desc: '日记/复盘', path: '10-Daily/' },
			{ icon: '狼爪印石碑.png', title: '工作管理', desc: '项目/任务', path: '40-Work/' },
			{ icon: '生命之树徽章.png', title: '目标规划', desc: '计划/愿景', path: '50-Application/' },
			{ icon: '平衡石堆.png', title: '健康生活', desc: '运动/心情', path: '' },
		];
		for (const item of items) {
			const btn = nav.createEl('a', { cls: 'fox-nav-btn', href: '#' });
			btn.onclick = (e) => {
				e.preventDefault();
				if (item.isDiary) this.openTodayDiary();
				else if (item.isKnowledge) this.openKnowledgeCreator();
				else if (item.path) this.openFolder(item.path);
			};
			btn.createEl('img', { attr: { src: this.getAssetPath(`assets/icons/${item.icon}`) }  });
			const td = btn.createDiv();
			td.createSpan({ cls: 'fox-nav-btn-title', text: item.title });
			td.createSpan({ cls: 'fox-nav-btn-desc', text: item.desc });
		}
		return nav;
	}


// ─── Card helper ───────────────────────────────

	private createCard(extraCls: string, iconFile: string, title: string, subtitle: string, bodyHtml: string, decoFile: string): HTMLElement {
		const card = createDiv({ cls: `fox-card ${extraCls}` });
		const header = card.createDiv({ cls: 'fox-card-header' });
		const icon = header.createEl('img', { cls: 'fox-card-icon' });
		icon.src = this.getAssetPath(`assets/icons/${iconFile}`)
		header.createSpan({ cls: 'fox-card-title', text: title });
		header.createSpan({ cls: 'fox-card-subtitle', text: subtitle });
		const body = card.createDiv({ cls: 'fox-card-body' });
		body.innerHTML = bodyHtml;
		const deco = card.createDiv({ cls: 'fox-card-decoration' });
		deco.createEl('img', { attr: { src: this.getAssetPath(`assets/icons/${decoFile}`) }  });
		return card;
	}

	// ─── Quick Capture Card ────────────────────────

	private createQuickCaptureCard(): HTMLElement {
		const card = createDiv({ cls: 'fox-card fox-capture-card' });
		const header = card.createDiv({ cls: 'fox-card-header' });
		const icon = header.createEl('img', { cls: 'fox-card-icon' });
		icon.src = this.getAssetPath('assets/icons/蓝色羽毛.png');
		header.createSpan({ cls: 'fox-card-title', text: '快速记录' });
		header.createSpan({ cls: 'fox-card-subtitle', text: 'CAPTURE' });

		const body = card.createDiv({ cls: 'fox-card-body' });
		const textarea = body.createEl('textarea', {
			cls: 'fox-capture-textarea',
			attr: { id: 'fox-capture-input', placeholder: '随手记点什么…\n支持多行' }
		});
		const btnRow = body.createDiv({ cls: 'fox-capture-btn-row' });
		btnRow.createEl('button', { cls: 'fox-record-btn', attr: { id: 'fox-capture-save' }, text: '💾 保存' });
		const status = btnRow.createSpan({ cls: 'fox-capture-status', attr: { id: 'fox-capture-status' } });

		const deco = card.createDiv({ cls: 'fox-card-decoration' });
		deco.createEl('img', { attr: { src: this.getAssetPath('assets/icons/蓝色羽毛.png') } });

		return card;
	}

	// ─── Mood Card ─────────────────────────────────

	private createMoodCard(): HTMLElement {
		const card = createDiv({ cls: 'fox-card fox-mood-card' });
		const header = card.createDiv({ cls: 'fox-card-header' });
		const icon = header.createEl('img', { cls: 'fox-card-icon' });
		icon.src = this.getAssetPath('assets/icons/森林蘑菇.png');
		header.createSpan({ cls: 'fox-card-title', text: '今日心情' });
		header.createSpan({ cls: 'fox-card-subtitle', text: 'MOOD' });

		const body = card.createDiv({ cls: 'fox-card-body' });
		const row = body.createDiv({ cls: 'fox-mood-row', attr: { id: 'fox-mood-row' } });
		const moods = [
			{ id: '明朗', file: '明朗.png' },
			{ id: '通透', file: '通透.png' },
			{ id: '怀旧', file: '怀旧.png' },
			{ id: '静默', file: '静默.png' },
			{ id: '纠结', file: '纠结.png' },
			{ id: '低沉', file: '低沉.png' },
			{ id: '愤怒', file: '愤怒.png' },
			{ id: '留白', file: '留白.png' },
		];
		for (const m of moods) {
			const btn = row.createEl('button', { cls: 'fox-mood-tag', attr: { 'data-mood': m.id } });
			const img = btn.createEl('img', { cls: 'fox-mood-img' });
			img.src = this.getAssetPath(`assets/emotions/${m.file}`);
			img.alt = m.id;
		}
		const noteInput = body.createEl('input', {
			cls: 'fox-mood-note',
			attr: { id: 'fox-mood-note', type: 'text', placeholder: '今天感觉怎么样…（选心情后自动保存）' }
		});
		const moodStatus = body.createSpan({ cls: 'fox-capture-status', attr: { id: 'fox-mood-status' } });

		const deco = card.createDiv({ cls: 'fox-card-decoration' });
		deco.createEl('img', { attr: { src: this.getAssetPath('assets/icons/月影水池.png') } });

		return card;
	}

	// ─── Habits Card ───────────────────────────────

	private createHabitCard(): HTMLElement {
		const card = createDiv({ cls: 'fox-card fox-habit-card' });
		const header = card.createDiv({ cls: 'fox-card-header' });
		const icon = header.createEl('img', { cls: 'fox-card-icon' });
		icon.src = this.getAssetPath('assets/icons/月牙石.png');
		header.createSpan({ cls: 'fox-card-title', text: '健康习惯' });
		header.createSpan({ cls: 'fox-card-subtitle', text: 'HABITS' });

		const body = card.createDiv({ cls: 'fox-card-body' });
		body.createDiv({ cls: 'fox-habit-list', attr: { id: 'fox-habit-list' } });
		const ring = body.createDiv({ cls: 'fox-habit-ring', attr: { id: 'fox-habit-ring' }, style: 'display:none' });
		const ringInner = ring.createDiv({ cls: 'fox-habit-ring-inner' });
		ringInner.createSpan({ attr: { id: 'fox-habit-ring-pct' }, text: '0%' });
		ringInner.createSpan({ cls: 'fox-habit-ring-label', text: '完成率' });

		const deco = card.createDiv({ cls: 'fox-card-decoration' });
		deco.createEl('img', { attr: { src: this.getAssetPath('assets/icons/古老树桩.png') } });

		return card;
	}

	// ═══════════════════════════════════════════════
	// TODAY'S TASKS — Load, Render, Toggle, Add
	// ═══════════════════════════════════════════════

	private dateStr(offset: number): string {
		const d = new Date();
		d.setDate(d.getDate() + offset);
		return d.toISOString().slice(0, 10);
	}

	private async loadTasks() {
		const listEl = this.contentEl.querySelector('#fox-task-list');
		const summaryEl = this.contentEl.querySelector('#fox-task-summary');
		const statusEl = this.contentEl.querySelector('#fox-task-status');
		if (!listEl) return;

		try {
			const todayStr = this.dateStr(0);
			const yesterdayStr = this.dateStr(-1);

			const tasks: TaskItem[] = [];

			// Scan today's diary
			await this.scanDiary(todayStr, 'today', tasks);
			// Scan yesterday's diary
			await this.scanDiary(yesterdayStr, 'yesterday', tasks);

			// Render
			if (tasks.length === 0) {
				listEl.innerHTML = '<div class="fox-task-empty">✅ 今日无待办</div>';
				if (summaryEl) summaryEl.textContent = '';
			} else {
				listEl.innerHTML = tasks.map((t, i) => {
					const badge = t.source === 'yesterday' ? '<span class="fox-task-badge">昨天</span>' : '';
					return `<div class="fox-task-item" data-index="${i}">☐ ${badge}${this.escapeHtml(t.text)}</div>`;
				}).join('');

				const done = tasks.filter(t => false).length; // all shown are undone
				if (summaryEl) summaryEl.textContent = `${tasks.length} 个未完成`;

				// Click handler
				listEl.querySelectorAll('.fox-task-item').forEach(el => {
					(el as HTMLElement).onclick = () => {
						const idx = parseInt((el as HTMLElement).dataset.index || '');
						if (isNaN(idx) || !tasks[idx]) return;
						this.completeTask(tasks[idx], listEl as HTMLElement, el as HTMLElement);
					};
				});
			}

			if (statusEl) statusEl.textContent = '';

			// Add button handler
			this.bindTaskAddBtn();

		} catch (e) {
			listEl.innerHTML = `<div class="fox-task-empty">⚠ ${e.message}</div>`;
		}
	}

	private async scanDiary(dateStr: string, source: 'yesterday' | 'today', tasks: TaskItem[]) {
		const filePath = `10-Daily/${dateStr}.md`;
		const exists = await this.app.vault.adapter.exists(filePath);
		if (!exists) return;

		const content = await this.app.vault.adapter.read(filePath);
		const lines = content.split('\n');
		let fmCount = 0;
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();
			if (line === '---') { fmCount++; continue; }
			if (fmCount < 2) continue;
			if (/^- \[ \]/.test(line)) {
				const text = line.replace(/^- \[ \] ?/, '').trim();
				if (text) tasks.push({ text, lineNum: i, source });
			}
		}
	}

	private async completeTask(task: TaskItem, listEl: HTMLElement, itemEl: HTMLElement) {
		try {
			const filePath = `10-Daily/${this.dateStr(task.source === 'yesterday' ? -1 : 0)}.md`;
			const content = await this.app.vault.adapter.read(filePath);
			const lines = content.split('\n');
			if (task.lineNum < lines.length && /^- \[ \]/.test(lines[task.lineNum])) {
				lines[task.lineNum] = lines[task.lineNum].replace('- [ ]', '- [x]');
				await this.app.vault.adapter.write(filePath, lines.join('\n'));

				// Animate
				itemEl.classList.add('fox-task-done');
				itemEl.innerHTML = '☑ ' + this.escapeHtml(task.text);

				setTimeout(() => {
					itemEl.style.maxHeight = itemEl.offsetHeight + 'px';
					itemEl.style.overflow = 'hidden';
					requestAnimationFrame(() => {
						itemEl.style.maxHeight = '0';
						itemEl.style.opacity = '0';
						itemEl.style.padding = '0';
						itemEl.style.margin = '0';
					});
					setTimeout(() => {
						itemEl.remove();
						// Update summary
						const remaining = listEl.querySelectorAll('.fox-task-item').length;
						const summaryEl = this.contentEl.querySelector('#fox-task-summary');
						if (summaryEl) summaryEl.textContent = remaining > 0 ? `${remaining} 个未完成` : '';
						if (remaining === 0) listEl.innerHTML = '<div class="fox-task-empty">✅ 今日无待办</div>';
						// Refresh stats
						this.loadStats();
					}, 500);
				}, 400);
			}
		} catch (e) {
			console.error('[Fox] Complete task error:', e);
		}
	}

	private bindTaskAddBtn() {
		const input = this.contentEl.querySelector('#fox-task-input') as HTMLInputElement;
		const btn = this.contentEl.querySelector('#fox-task-add-btn');
		const statusEl = this.contentEl.querySelector('#fox-task-status');

		if (!input || !btn) return;

		btn.onclick = async () => {
			const text = input.value.trim();
			if (!text) return;

			try {
				const dateStr = this.dateStr(0);
				const filePath = `10-Daily/${dateStr}.md`;
				const heading = '## 📋 待办';
				const taskLine = '- [ ] ' + text;

				const exists = await this.app.vault.adapter.exists(filePath);
				let content: string;
				if (exists) {
					content = await this.app.vault.adapter.read(filePath);
				} else {
					const tplExists = await this.app.vault.adapter.exists('模板/日志模板.md');
					content = tplExists
						? (await this.app.vault.adapter.read('模板/日志模板.md')).replace(/\{\{date\}\}/g, dateStr)
						: `---\ndate: ${dateStr}\ntags: [日志]\n---\n\n# ${dateStr}\n`;
				}

				if (content.includes(heading)) {
					const lines = content.split('\n');
					let pos = -1;
					for (let i = 0; i < lines.length; i++) {
						if (lines[i].trim() === heading) { pos = i + 1; break; }
					}
					lines.splice(pos, 0, taskLine);
					content = lines.join('\n');
				} else {
					content += `\n\n${heading}\n${taskLine}\n`;
				}

				await this.app.vault.adapter.write(filePath, content);
				input.value = '';
				if (statusEl) {
					statusEl.textContent = '✅ 已添加待办';
					statusEl.style.color = 'var(--fox-cd-today)';
					setTimeout(() => {
						statusEl.textContent = '';
						statusEl.style.color = '';
					}, 2500);
				}
				this.loadTasks();
				this.loadStats();
			} catch (e) {
				if (statusEl) {
					statusEl.textContent = '❌ ' + e.message;
					statusEl.style.color = 'var(--fox-cd-urgent)';
				}
			}
		};
	}

	// ═══════════════════════════════════════════════
	// COUNTDOWN — Render, CRUD, Sort, Urgency Colors
	// ═══════════════════════════════════════════════

	private createCountdownCard(): HTMLElement {
		const card = createDiv({ cls: 'fox-card fox-countdown-card' });

		const header = card.createDiv({ cls: 'fox-card-header' });
		const icon = header.createEl('img', { cls: 'fox-card-icon' });
		icon.src = this.getAssetPath('assets/icons/时间沙漏.png');
		header.createSpan({ cls: 'fox-card-title', text: '倒计时' });
		header.createSpan({ cls: 'fox-card-subtitle', text: 'COUNTDOWN' });

		card.createDiv({ cls: 'fox-countdown-list', attr: { id: 'fox-countdown-list' } });

		// Inline form
		const form = card.createDiv({ cls: 'fox-countdown-form', attr: { id: 'fox-countdown-form' } });
		form.style.display = 'none';
		form.createEl('input', { cls: 'fox-record-input', attr: { id: 'fox-cd-name', type: 'text', placeholder: '名称（如：📝 GRE考试）' } });
		form.createEl('input', { cls: 'fox-record-input', attr: { id: 'fox-cd-date', type: 'date' } });
		const formBtns = form.createDiv({ cls: 'fox-countdown-form-btns' });
		formBtns.createEl('button', { cls: 'fox-record-btn', attr: { id: 'fox-cd-confirm' }, text: '✅ 确认' });
		formBtns.createEl('button', { cls: 'fox-record-btn', attr: { id: 'fox-cd-cancel' }, text: '取消' });

		const addBtn = card.createEl('button', { cls: 'fox-add-mini', attr: { id: 'fox-countdown-add' }, text: '+ 添加' });

		const deco = card.createDiv({ cls: 'fox-card-decoration' });
		deco.createEl('img', { attr: { src: this.getAssetPath('assets/icons/旅人旗帜.png') } });

		return card;
	}

	private loadCountdowns() {
		const listEl = this.contentEl.querySelector('#fox-countdown-list');
		if (!listEl) return;

		const items = this.plugin.settings.countdowns || [];
		const sorted = this.sortCountdowns(items);

		if (sorted.length === 0) {
			listEl.innerHTML = '<div class="fox-task-empty">📭 暂无倒计时，点下方「+ 添加」</div>';
			this.bindCountdownButtons(sorted);
			return;
		}

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		listEl.innerHTML = sorted.map((it, idx) => {
			const target = new Date(it.date + 'T00:00:00');
			const diff = Math.ceil((target.getTime() - today.getTime()) / 86400000);
			const daysStr = diff > 0 ? String(diff) : diff === 0 ? '今天！' : String(Math.abs(diff));
			const unit = diff > 0 ? '天' : diff === 0 ? '' : '天前';
			const cls = this.urgencyClass(diff);
			return `<div class="fox-countdown-item ${cls}" data-sort-idx="${idx}" data-name="${this.escapeHtml(it.name)}" data-date="${it.date}">` +
				`<span class="fox-countdown-label">${this.escapeHtml(it.name)}</span>` +
				`<span class="fox-countdown-number">${daysStr}<span class="fox-countdown-unit">${unit}</span></span>` +
				`<span class="fox-countdown-urgency-dot"></span>` +
				`<button class="fox-item-del" data-sort-idx="${idx}" title="删除">×</button></div>`;
		}).join('');

		this.bindCountdownButtons(sorted);

		// Click to edit
		listEl.querySelectorAll('.fox-countdown-item').forEach(el => {
			el.addEventListener('click', (e) => {
				if ((e.target as HTMLElement).classList.contains('fox-item-del')) return;
				const idx = parseInt((el as HTMLElement).dataset.sortIdx || '');
				const name = (el as HTMLElement).dataset.name || '';
				const date = (el as HTMLElement).dataset.date || '';
				this.showCountdownForm(idx, name, date);
			});
		});

		// Delete button
		listEl.querySelectorAll('.fox-item-del').forEach(btn => {
			btn.addEventListener('click', (e) => {
				e.stopPropagation();
				const idx = parseInt((btn as HTMLElement).dataset.sortIdx || '');
				this.deleteCountdown(idx);
			});
		});
	}

	private sortCountdowns(items: { name: string; date: string }[]): { name: string; date: string }[] {
		const today = new Date(); today.setHours(0, 0, 0, 0);
		return [...items].sort((a, b) => {
			const da = Math.ceil((new Date(a.date + 'T00:00:00').getTime() - today.getTime()) / 86400000);
			const db = Math.ceil((new Date(b.date + 'T00:00:00').getTime() - today.getTime()) / 86400000);
			return da - db;
		});
	}

	private urgencyClass(days: number): string {
		if (days < 0) return 'fox-cd-overdue';
		if (days === 0) return 'fox-cd-today';
		if (days <= 7) return 'fox-cd-urgent';
		if (days <= 30) return 'fox-cd-soon';
		return '';
	}

	private showCountdownForm(editIdx: number, name: string, date: string) {
		const form = this.contentEl.querySelector('#fox-countdown-form') as HTMLElement;
		const nameInput = this.contentEl.querySelector('#fox-cd-name') as HTMLInputElement;
		const dateInput = this.contentEl.querySelector('#fox-cd-date') as HTMLInputElement;
		const confirmBtn = this.contentEl.querySelector('#fox-cd-confirm') as HTMLElement;
		const addBtn = this.contentEl.querySelector('#fox-countdown-add') as HTMLElement;
		if (!form || !nameInput || !dateInput) return;

		// Store editing state
		form.dataset.editIdx = String(editIdx);
		nameInput.value = name;
		dateInput.value = date;
		confirmBtn.textContent = editIdx >= 0 ? '✏️ 更新' : '✅ 确认';
		form.style.display = 'block';
		if (addBtn) addBtn.style.display = 'none';
		nameInput.focus();
	}

	private bindCountdownButtons(sorted: { name: string; date: string }[]) {
		const confirmBtn = this.contentEl.querySelector('#fox-cd-confirm');
		const cancelBtn = this.contentEl.querySelector('#fox-cd-cancel');
		const addBtn = this.contentEl.querySelector('#fox-countdown-add');

		if (confirmBtn) {
			confirmBtn.onclick = async () => {
				const nameInput = this.contentEl.querySelector('#fox-cd-name') as HTMLInputElement;
				const dateInput = this.contentEl.querySelector('#fox-cd-date') as HTMLInputElement;
				const form = this.contentEl.querySelector('#fox-countdown-form') as HTMLElement;
				const addBtnEl = this.contentEl.querySelector('#fox-countdown-add') as HTMLElement;

				const name = nameInput?.value.trim();
				const date = dateInput?.value;
				if (!name || !date) return;

				const editIdx = parseInt(form?.dataset.editIdx || '-1');
				const items = this.plugin.settings.countdowns || [];

				if (editIdx >= 0) {
					// Edit existing: find by position in sorted list
					const sortedItems = this.sortCountdowns(items);
					const target = sortedItems[editIdx];
					if (target) {
						const origIdx = items.findIndex(c => c.name === target.name && c.date === target.date);
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
				if (form) form.style.display = 'none';
				if (addBtnEl) addBtnEl.style.display = 'block';
				this.loadCountdowns();
			};
		}

		if (cancelBtn) {
			cancelBtn.onclick = () => {
				const form = this.contentEl.querySelector('#fox-countdown-form') as HTMLElement;
				const addBtnEl = this.contentEl.querySelector('#fox-countdown-add') as HTMLElement;
				if (form) form.style.display = 'none';
				if (addBtnEl) addBtnEl.style.display = 'block';
			};
		}

		if (addBtn) {
			addBtn.onclick = () => {
				this.showCountdownForm(-1, '', '');
			};
		}
	}

	private async deleteCountdown(sortedIdx: number) {
		const items = [...(this.plugin.settings.countdowns || [])];
		const sorted = this.sortCountdowns(items);
		const target = sorted[sortedIdx];
		if (!target) return;

		const origIdx = items.findIndex(c => c.name === target.name && c.date === target.date);
		if (origIdx >= 0) items.splice(origIdx, 1);

		this.plugin.settings.countdowns = items;
		await this.plugin.saveSettings();
		this.loadCountdowns();
	}

	// ═══════════════════════════════════════════════
	// QUICK CAPTURE
	// ═══════════════════════════════════════════════

	private async loadQuickCapture() {
		const btn = this.contentEl.querySelector('#fox-capture-save');
		const input = this.contentEl.querySelector('#fox-capture-input') as HTMLTextAreaElement;
		const status = this.contentEl.querySelector('#fox-capture-status');
		if (!btn || !input) return;

		btn.onclick = async () => {
			const text = input.value.trim();
			if (!text) return;

			try {
				const dateStr = this.dateStr(0);
				const filePath = `10-Daily/${dateStr}.md`;

				const exists = await this.app.vault.adapter.exists(filePath);
				let content: string;
				if (exists) {
					content = await this.app.vault.adapter.read(filePath);
				} else {
					const tplExists = await this.app.vault.adapter.exists('模板/日志模板.md');
					content = tplExists
						? (await this.app.vault.adapter.read('模板/日志模板.md')).replace(/\{\{date\}\}/g, dateStr)
						: `---\ndate: ${dateStr}\ntags: [日志]\n---\n\n# ${dateStr}\n`;
				}

				content += `\n- ${text}\n`;
				await this.app.vault.adapter.write(filePath, content);
				input.value = '';
				if (status) {
					status.textContent = '✅ 已保存';
					setTimeout(() => { status.textContent = ''; }, 2500);
				}
			} catch (e) {
				if (status) {
					status.textContent = '❌ ' + e.message;
				}
			}
		};
	}

	// ═══════════════════════════════════════════════
	// MOOD
	// ═══════════════════════════════════════════════

	private currentMood: string | null = null;

	private async loadMood() {
		const row = this.contentEl.querySelector('#fox-mood-row');
		const noteInput = this.contentEl.querySelector('#fox-mood-note') as HTMLInputElement;
				if (!row) return;

		// Load today's existing mood from diary
		const dateStr = this.dateStr(0);
		const filePath = `10-Daily/${dateStr}.md`;
		try {
			const exists = await this.app.vault.adapter.exists(filePath);
			if (exists) {
				const content = await this.app.vault.adapter.read(filePath);
				const moodMatch = content.match(/^mood:\s*(\S+)/m);

				if (moodMatch) {
					this.currentMood = moodMatch[1];
					row.querySelectorAll('.fox-mood-tag').forEach(btn => {
						if ((btn as HTMLElement).dataset.mood === this.currentMood) {
							(btn as HTMLElement).classList.add('active');
						}
					});
				}

			}
		} catch (e) { /* ignore */ }

		// Bind mood buttons
		row.querySelectorAll('.fox-mood-tag').forEach(btn => {
			(btn as HTMLElement).onclick = async () => {
				const mood = (btn as HTMLElement).dataset.mood || '';
				try {
					await this.saveMoodToDiary(mood, noteInput?.value || '');
					row.querySelectorAll('.fox-mood-tag').forEach(b => b.classList.remove('active'));
					(btn as HTMLElement).classList.add('active');
					this.currentMood = mood;
															this.showMoodStatus('✅ 心情已记录');
				} catch (e) {
					this.showMoodStatus('❌ ' + e.message);
				}
			};
		});


		// Bind note enter key
		if (noteInput) {
			noteInput.onkeydown = async (e) => {
				if (e.key === 'Enter') {
					e.preventDefault();
					if (this.currentMood) {
						try {
							await this.saveMoodToDiary(this.currentMood, noteInput.value.trim());
							this.showMoodStatus('✅ 心情备注已保存');
						} catch (e) {
							this.showMoodStatus('❌ ' + e.message);
						}
					}
				}
			};
		}
	}


	private async saveMoodToDiary(mood: string, note: string) {
		const dateStr = this.dateStr(0);
		const filePath = `10-Daily/${dateStr}.md`;

		const exists = await this.app.vault.adapter.exists(filePath);
		let content: string;
		if (exists) {
			content = await this.app.vault.adapter.read(filePath);
		} else {
			const tplExists = await this.app.vault.adapter.exists('模板/日志模板.md');
			content = tplExists
				? (await this.app.vault.adapter.read('模板/日志模板.md')).replace(/\{\{date\}\}/g, dateStr)
				: `---\ndate: ${dateStr}\ntags: [日志]\n---\n\n# ${dateStr}\n`;
		}

		const lines = content.split('\n');
		let fmEnd = -1;
		let fmCount = 0;
		let hasMood = false;
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim() === '---') {
				fmCount++;
				if (fmCount === 2) { fmEnd = i; break; }
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

		// Also update or add mood note if provided
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
					if (lines[i].trim() === '---') { insertPos = i + 1; break; }
				}
				if (hasMood) {
					for (let i = 0; i < fmEnd; i++) {
						if (lines[i].startsWith('mood:')) {
							insertPos = i + 1;
							break;
						}
					}
				}
				lines.splice(insertPos, 0, `mood_note: ${note}`);
			}
		}

		await this.app.vault.adapter.write(filePath, lines.join('\n'));
	}

	private showMoodStatus(msg: string) {
		const el = this.contentEl.querySelector('#fox-mood-status');
		if (el) {
			el.textContent = msg;
			setTimeout(() => { el.textContent = ''; }, 2500);
		}
	}

	// ═══════════════════════════════════════════════
	// HABITS
	// ═══════════════════════════════════════════════

	private readonly HABIT_DEFS = [
		{ id: '早起', label: '🌅 早起 (7:30前)' },
		{ id: '冥想', label: '🧘 冥想' },
		{ id: '运动', label: '🏃 运动' },
		{ id: '阅读', label: '📖 阅读' },
		{ id: '日记', label: '📝 日记' },
	];

	private async loadHabits() {
		const listEl = this.contentEl.querySelector('#fox-habit-list');
		const ringEl = this.contentEl.querySelector('#fox-habit-ring') as HTMLElement;
		if (!listEl) return;

		const dateStr = this.dateStr(0);
		const todayHabits = await this.getTodayHabits(dateStr);

		listEl.innerHTML = this.HABIT_DEFS.map(h => {
			const done = todayHabits.includes(h.id);
			return `<div class="fox-habit-item" data-habit="${h.id}">` +
				`<input type="checkbox" class="fox-habit-check" ${done ? 'checked' : ''}>` +
				`<span class="fox-habit-text">${h.label}</span></div>`;
		}).join('');

		// Bind checkboxes
		listEl.querySelectorAll('.fox-habit-item').forEach(item => {
			const cb = item.querySelector('.fox-habit-check') as HTMLInputElement;
			if (!cb) return;
			cb.onchange = async () => {
				const habitId = (item as HTMLElement).dataset.habit || '';
				await this.toggleHabit(habitId, cb.checked);
				this.loadHabits(); // Reload
			};
		});

		// Update ring
		const doneCount = todayHabits.length;
		const pct = Math.round((doneCount / this.HABIT_DEFS.length) * 100);
		if (ringEl) {
			ringEl.style.display = doneCount > 0 ? 'flex' : 'none';
			ringEl.style.setProperty('--habit-pct', String(pct));
			const pctEl = this.contentEl.querySelector('#fox-habit-ring-pct');
			if (pctEl) pctEl.textContent = `${pct}%`;
		}
	}

	private async getTodayHabits(dateStr: string): Promise<string[]> {
		const filePath = `10-Daily/${dateStr}.md`;
		try {
			const exists = await this.app.vault.adapter.exists(filePath);
			if (!exists) return [];

			const content = await this.app.vault.adapter.read(filePath);
			const match = content.match(/^habits:\s*\[([^\]]*)\]/m);
			if (match) {
				return match[1].split(',').map(s => s.trim().replace(/["']/g, '')).filter(Boolean);
			}
			return [];
		} catch { return []; }
	}

	private async toggleHabit(habitId: string, checked: boolean) {
		const dateStr = this.dateStr(0);
		const filePath = `10-Daily/${dateStr}.md`;

		const exists = await this.app.vault.adapter.exists(filePath);
		let content: string;
		if (exists) {
			content = await this.app.vault.adapter.read(filePath);
		} else {
			const tplExists = await this.app.vault.adapter.exists('模板/日志模板.md');
			content = tplExists
				? (await this.app.vault.adapter.read('模板/日志模板.md')).replace(/\{\{date\}\}/g, dateStr)
				: `---\ndate: ${dateStr}\ntags: [日志]\n---\n\n# ${dateStr}\n`;
		}

		const currentHabits = await this.getTodayHabits(dateStr);
		let newHabits: string[];
		if (checked) {
			if (!currentHabits.includes(habitId)) newHabits = [...currentHabits, habitId];
			else newHabits = currentHabits;
		} else {
			newHabits = currentHabits.filter(h => h !== habitId);
		}

		const lines = content.split('\n');
		let fmEnd = -1;
		let fmCount = 0;
		let hasHabits = false;
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim() === '---') {
				fmCount++;
				if (fmCount === 2) { fmEnd = i; break; }
				continue;
			}
			if (fmCount === 1 && /^habits:\s*/i.test(lines[i])) {
				lines[i] = `habits: [${newHabits.join(', ')}]`;
				hasHabits = true;
			}
		}

		if (!hasHabits && fmEnd >= 0) {
			lines.splice(fmEnd, 0, `habits: [${newHabits.join(', ')}]`);
		}

		await this.app.vault.adapter.write(filePath, lines.join('\n'));
	}

	// ═══════════════════════════════════════════════
	// PROGRESS

	private async loadProgress() {
		const listEl = this.contentEl.querySelector('#fox-progress-list');
		const statsEl = this.contentEl.querySelector('#fox-study-stats');
		if (!listEl) return;

		const items = this.plugin.settings.progressItems || [];
		if (items.length === 0) {
			listEl.innerHTML = '<div class="fox-task-empty">📭 暂无进度项，在设置中添加</div>';
			if (statsEl) statsEl.textContent = '';
			return;
		}

		listEl.innerHTML = items.map((p, i) => {
			const pct = p.max > 0 ? Math.min(100, Math.round((p.value / p.max) * 100)) : 0;
			return `<div class="fox-progress-item" data-pgidx="${i}">` +
				`<div class="fox-progress-header">` +
				`<span class="fox-progress-label">${this.escapeHtml(p.name)}</span>` +
				`<span class="fox-progress-pct">` +
				`<span class="fox-progress-value-editable" data-pgidx="${i}">${p.value}</span>` +
				`<span class="fox-progress-sep">/</span>${p.max} ` +
				`<span class="fox-progress-pct-num">${pct}%</span></span></div>` +
				`<div class="fox-progress-bar-row">` +
				`<button class="fox-step-btn" data-pgidx="${i}" data-step="-1">−</button>` +
				`<div class="fox-progress-bar" style="--pct: ${pct}%"></div>` +
				`<button class="fox-step-btn" data-pgidx="${i}" data-step="1">+</button></div></div>`;
		}).join('');

		// Bind step buttons
		listEl.querySelectorAll('.fox-step-btn').forEach(btn => {
			(btn as HTMLElement).onclick = (e) => {
				e.stopPropagation();
				const idx = parseInt((btn as HTMLElement).dataset.pgidx || '-1');
				const step = parseInt((btn as HTMLElement).dataset.step || '0');
				this.stepProgress(idx, step);
			};
		});

		// Bind editable value — click to type a new number
		listEl.querySelectorAll('.fox-progress-value-editable').forEach(el => {
			(el as HTMLElement).onclick = (e) => {
				e.stopPropagation();
				const idx = parseInt((el as HTMLElement).dataset.pgidx || '-1');
				this.editableProgressValue(idx, el as HTMLElement);
			};
		});

		const avg = items.reduce((s, p) => s + (p.max > 0 ? (p.value / p.max) * 100 : 0), 0) / items.length;
		if (statsEl) {
			statsEl.textContent = `📊 整体进度：${Math.round(avg)}% · ${items.filter(p => p.value >= p.max).length}/${items.length} 项完成`;
		}
	}

	private editableProgressValue(idx: number, el: HTMLElement) {
		const items = this.plugin.settings.progressItems;
		if (idx < 0 || idx >= items.length) return;
		const input = document.createElement('input');
		input.type = 'number';
		input.className = 'fox-progress-inline-input';
		input.value = String(items[idx].value);
		input.min = '0';
		input.max = String(items[idx].max);
		input.style.width = '36px';
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
			if (e.key === 'Enter') { e.preventDefault(); commit(); }
			if (e.key === 'Escape') { this.loadProgress(); }
		};
	}

	private async stepProgress(idx: number, delta: number) {
		const items = this.plugin.settings.progressItems;
		if (idx < 0 || idx >= items.length) return;
		const p = items[idx];
		p.value = Math.max(0, Math.min(p.max, (p.value || 0) + delta));
		await this.plugin.saveSettings();
		this.loadProgress();
	}

	private createProgressCard(): HTMLElement {
		const card = createDiv({ cls: 'fox-card fox-progress-card' });
		const header = card.createDiv({ cls: 'fox-card-header' });
		const icon = header.createEl('img', { cls: 'fox-card-icon' });
		icon.src = this.getAssetPath('assets/icons/冰霜树枝.png');
		header.createSpan({ cls: 'fox-card-title', text: '备考进度' });
		header.createSpan({ cls: 'fox-card-subtitle', text: 'PROGRESS' });

		card.createDiv({ cls: 'fox-progress-list', attr: { id: 'fox-progress-list' } });
		card.createDiv({ cls: 'fox-study-stats', attr: { id: 'fox-study-stats' } });

		const deco = card.createDiv({ cls: 'fox-card-decoration' });
		deco.createEl('img', { attr: { src: this.getAssetPath('assets/icons/蓝色水晶簇.png') } });

		return card;
	}

	private createFinanceCard(): HTMLElement {
		const card = createDiv({ cls: 'fox-card fox-finance-card' });
		const header = card.createDiv({ cls: 'fox-card-header' });
		const icon = header.createEl('img', { cls: 'fox-card-icon' });
		icon.src = this.getAssetPath('assets/icons/古松盆景.png');
		header.createSpan({ cls: 'fox-card-title', text: '财富森林' });
		header.createSpan({ cls: 'fox-card-subtitle', text: 'FOX FINANCE' });
		const toggleBtn = header.createEl('span', { cls: 'fox-finance-toggle', text: '👁' });
		toggleBtn.onclick = () => card.classList.toggle('fox-finance-blurred');

		card.createDiv({ cls: 'fox-finance-summary', attr: { id: 'fox-finance-summary' } });
		card.createDiv({ cls: 'fox-finance-accounts', attr: { id: 'fox-fc-accounts' } });
		card.createDiv({ cls: 'fox-finance-list', attr: { id: 'fox-finance-list' } });

		const btnRow = card.createDiv({ cls: 'fox-finance-toolbar' });
		btnRow.createEl('button', { cls: 'fox-add-mini', attr: { id: 'fox-fc-add' }, text: '📝 记一笔' });
		btnRow.createEl('button', { cls: 'fox-add-mini', attr: { id: 'fox-fc-open' }, text: '🌲 进入森林' });

		const deco = card.createDiv({ cls: 'fox-card-decoration' });
		deco.createEl('img', { attr: { src: this.getAssetPath('assets/icons/平衡石堆.png') } });

		return card;
	}

	private async loadFinance() {
		const summaryEl = this.contentEl.querySelector('#fox-finance-summary') as HTMLElement;
		const accEl = this.contentEl.querySelector('#fox-fc-accounts') as HTMLElement;
		const listEl = this.contentEl.querySelector('#fox-finance-list') as HTMLElement;
		if (!summaryEl || !listEl || !accEl) return;

		// 扫描所有账本文件，提取交易 + 推算余额
		const allTxs: any[] = [];
		const balances: Record<string, number> = {};

		try {
			const ledgerDir = 'Finance/Ledger';
			const exists = await this.app.vault.adapter.exists(ledgerDir);
			if (exists) {
				const { files } = await this.app.vault.adapter.list(ledgerDir);
				for (const file of files.filter((f: string) => f.endsWith('.md')).sort()) {
					const content = await this.app.vault.adapter.read(file);
					const lines = content.split('\n').filter((l: string) => l.startsWith('| ') && !l.startsWith('| date') && !l.startsWith('|---'));
					for (const line of lines) {
						const cols = line.split('|').map((c: string) => c.trim()).filter(Boolean);
						if (cols.length < 7) continue;
						const tx = {
							date: cols[0], type: cols[1], amount: parseFloat(cols[2]) || 0,
							account: cols[3], toAccount: cols[4] === '-' ? '' : cols[4],
							category: cols[5] || '', subcategory: cols[6] || '', note: cols[7] || '',
						};
						allTxs.push(tx);
						// 余额推算
						switch (tx.type) {
							case 'income': case 'refund':
								balances[tx.account] = (balances[tx.account] || 0) + tx.amount; break;
							case 'expense':
								balances[tx.account] = (balances[tx.account] || 0) - tx.amount; break;
							case 'transfer': case 'investment_in':
								balances[tx.account] = (balances[tx.account] || 0) - tx.amount;
								if (tx.toAccount) balances[tx.toAccount] = (balances[tx.toAccount] || 0) + tx.amount;
								break;
							case 'investment_return':
								if (tx.toAccount) balances[tx.toAccount] = (balances[tx.toAccount] || 0) + tx.amount;
								break;
							case 'balance_adjust':
								balances[tx.account] = tx.amount; break;
						}
					}
				}
			}
		} catch (_) { /* 目录尚未创建 */ }

		const now = new Date();
		const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
		const monthTxs = allTxs.filter((t: any) => t.date.startsWith(thisMonth));

		const income = monthTxs.filter((t: any) => t.type === 'income').reduce((s: number, t: any) => s + t.amount, 0);
		const expense = monthTxs.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0);
		const net = income - expense;
		const fmt = (n: number) => '¥' + n.toFixed(2);

		summaryEl.innerHTML = `
			<div class="fox-finance-summary-inner">
				<div class="fox-finance-stat"><span class="fox-finance-stat-label">收入</span><span class="fox-finance-stat-val income">${fmt(income)}</span></div>
				<div class="fox-finance-stat"><span class="fox-finance-stat-label">支出</span><span class="fox-finance-stat-val expense">${fmt(expense)}</span></div>
				<div class="fox-finance-stat"><span class="fox-finance-stat-label">净增</span><span class="fox-finance-stat-val ${net >= 0 ? 'income' : 'expense'}">${fmt(net)}</span></div>
			</div>
		`;

		// 账户余额列表
		accEl.empty();
		const sortedAccs = Object.keys(balances).sort();
		if (sortedAccs.length === 0) {
			accEl.createSpan({ cls: 'fox-task-empty', text: '暂无账户数据' });
		} else {
			for (const name of sortedAccs) {
				const bal = balances[name];
				const item = accEl.createDiv('fox-finance-account-item');
				item.createSpan({ cls: 'fox-finance-account-name', text: name });
				const balEl = item.createSpan({ cls: 'fox-finance-account-bal', text: fmt(bal) });
				(balEl as HTMLElement).style.color = bal >= 0 ? '#34d399' : '#f87171';
			}
		}

		// 最近 5 条
		const sorted = [...monthTxs].sort((a: any, b: any) => b.date.localeCompare(a.date)).slice(0, 5);
		if (sorted.length === 0) {
			listEl.innerHTML = '<div class="fox-task-empty">🌱 森林还很安静，记一笔吧</div>';
		} else {
			listEl.innerHTML = sorted.map((tx: any) => {
				const sign = tx.type === 'income' ? '+' : '-';
				const cls = tx.type === 'income' ? 'fox-finance-income' : 'fox-finance-expense';
				return `<div class="fox-finance-record ${cls}">` +
					`<span class="fox-finance-rec-date">${tx.date.slice(5)}</span>` +
					`<span class="fox-finance-rec-cat">${this.escapeHtml(tx.category)}</span>` +
					`<span class="fox-finance-rec-desc">${tx.note ? ' · ' + this.escapeHtml(tx.note) : ''}</span>` +
					`<span class="fox-finance-rec-amt">${sign}¥${tx.amount.toFixed(2)}</span></div>`;
			}).join('');
		}

		this.bindFinanceButtons();
	}

	private bindFinanceButtons() {
		const addBtn = this.contentEl.querySelector('#fox-fc-add') as HTMLElement;
		const openBtn = this.contentEl.querySelector('#fox-fc-open') as HTMLElement;

		if (addBtn) {
			addBtn.onclick = () => {
				// 优先通过事件触发（fox-finance 注册了 'fox-finance:quick-add'）
				this.app.workspace.trigger('fox-finance:quick-add');
				// 事件方式不行就 fallback 到命令
				setTimeout(() => {
					this.app.commands.executeCommandById('fox-finance:quick-add');
				}, 50);
			};
		}

		if (openBtn) {
			openBtn.onclick = () => {
				this.app.workspace.trigger('fox-finance:open-dashboard');
				// 尝试直接调 fox-finance 插件
				const ff = (this.app as any).plugins?.plugins?.['fox-finance'];
				if (ff?.activateView) ff.activateView();
			};
		}
	}

	// ═══════════════════════════════════════════════
	// HEATMAP — Full-width yearly card	// ═══════════════════════════════════════════════
	// HEATMAP — Full-width yearly card
	// ═══════════════════════════════════════════════
	// HEATMAP — Full-width yearly card
	// ═══════════════════════════════════════════════

	private createHeatmapCard(): HTMLElement {
		const card = createDiv({ cls: 'fox-card fox-heatmap-card' });
		const header = card.createDiv({ cls: 'fox-card-header' });
		const icon = header.createEl('img', { cls: 'fox-card-icon' });
		icon.src = this.getAssetPath('assets/icons/独行篝火.png');
		header.createSpan({ cls: 'fox-card-title', text: '年度热力图' });
		header.createSpan({ cls: 'fox-card-subtitle', text: 'HEATMAP' });
		card.createDiv({ cls: 'fox-heatmap-wrap', attr: { id: 'fox-heatmap-wrap' } });

		const deco = card.createDiv({ cls: 'fox-card-decoration' });
		deco.createEl('img', { attr: { src: this.getAssetPath('assets/icons/独行篝火.png') } });

		return card;
	}


// FOOTER
	// ═══════════════════════════════════════════════

	private createFooter(): HTMLElement {
		const footer = createDiv({ cls: 'fox-footer' });
		footer.createSpan({ text: '🐺' });
		footer.createSpan({ text: 'Stay hungry. Stay foolish.' });
		footer.createSpan({ text: '— 独行狼' });
		return footer;
	}

	// ═══════════════════════════════════════════════
	// SECOND SPACE
	// ═══════════════════════════════════════════════

	private createSecondSpace(): HTMLElement {
		const space = createDiv({ cls: 'fox-second-space' });
		space.createDiv({ cls: 'fox-section-title', text: '🌲 森林深处' });

		const grid = space.createDiv({ cls: 'fox-grid-4' });
		const cards = this.plugin.settings.secondForest;
		const iconMap = ['探索者罗盘.png', '月光能量球.png', '蓝色水晶簇.png', '生命之树徽章.png'];
		for (let i = 0; i < 4; i++) {
			const c = cards[i] || { name: '📄 页面', path: '' };
			const icon = iconMap[i] || '探索者罗盘.png';
			const card = grid.createDiv({ cls: 'fox-card' });
			const h = card.createDiv({ cls: 'fox-card-header' });
			const img = h.createEl('img', { cls: 'fox-card-icon' });
			img.src = this.getAssetPath(`assets/icons/${icon}`);
			h.createSpan({ cls: 'fox-card-title', text: c.name });
			const desc = card.createDiv({ cls: 'fox-task-empty', text: c.path ? `→ ${c.path}` : '🚧 未配置' });
			// Click to navigate
			if (c.path) {
				card.style.cursor = 'pointer';
				card.onclick = () => {
					this.openNoteOrFolder(c.path);
				};
			}
		}
		return space;
	}

	private openNoteOrFolder(path: string) {
		if (!path) return;
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) {
			this.app.workspace.getLeaf().openFile(file);
		} else {
			this.app.workspace.openLinkText(path, '/', false);
		}
	}

	private openTodayDiary() {
		const dateStr = this.dateStr(0);
		const path = `10-Daily/${dateStr}.md`;
		const file = this.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) {
			this.app.workspace.getLeaf().openFile(file);
		} else {
			this.app.workspace.openLinkText(path, '/', false);
		}
	}

	// ═══════════════════════════════════════════════
	// DATA: STATS
	// ═══════════════════════════════════════════════

	private async loadStats() {
		try {
			const files = this.app.vault.getMarkdownFiles()
				.filter(f => f.path.startsWith('10-Daily/') && /^\d{4}-\d{2}-\d{2}$/.test(f.basename));

			const today = new Date();
			const thisMonth = today.getMonth();
			const thisYear = today.getFullYear();

			const monthly = files.filter(f => {
				const d = new Date(f.basename);
				return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
			});

			const total = files.length;

			const dateSet = new Set(files.map(f => f.basename));
			let streak = 0;
			const cursor = new Date(today);
			for (let i = 0; i < 365; i++) {
				const ds = cursor.toISOString().slice(0, 10);
				if (dateSet.has(ds)) { streak++; cursor.setDate(cursor.getDate() - 1); }
				else break;
			}

			this.setText('fox-stat-diaries', `${total} 篇`);
			this.setText('fox-stat-streak', `${streak} 天`);
			this.setText('fox-stat-monthly', `${monthly.length} 天`);

			const todayStr = today.toISOString().slice(0, 10);
			const todayFile = files.find(f => f.basename === todayStr);
			if (todayFile) {
				const content = await this.app.vault.read(todayFile);
				const taskLines = content.split('\n').filter(l => /^- \[.\]/.test(l));
				const done = taskLines.filter(l => /^- \[x\]/.test(l)).length;
				const tt = taskLines.length;
				this.setText('fox-stat-goal', tt > 0 ? `${done}/${tt}` : '—');
			} else {
				this.setText('fox-stat-goal', '—');
			}
		} catch (e) {
			console.error('[Fox] Stats error:', e);
		}
	}

	private setText(id: string, text: string) {
		const el = this.contentEl.querySelector(`#${id}`);
		if (el) el.textContent = text;
	}

	// ═══════════════════════════════════════════════
	// DATA: RECENT UPDATES
	// ═══════════════════════════════════════════════

	private async loadRecentUpdates() {
		try {
			const listEl = this.contentEl.querySelector('#fox-recent-list');
			if (!listEl) return;

			const files = this.app.vault.getMarkdownFiles()
				.filter(f => !f.path.startsWith('.') && f.path !== 'Home.md' && f.path !== 'README.md')
				.sort((a, b) => b.stat.mtime - a.stat.mtime)
				.slice(0, 5);

			if (files.length === 0) {
				listEl.innerHTML = '<div class="fox-task-empty">📭 暂无笔记</div>';
				return;
			}

			const now = new Date();
			const yesterday = new Date(now);
			yesterday.setDate(yesterday.getDate() - 1);

			listEl.innerHTML = files.map(f => {
				const mtime = new Date(f.stat.mtime);
				const rel = mtime.toDateString() === now.toDateString()
					? `今天 ${mtime.toTimeString().slice(0, 5)}`
					: mtime.toDateString() === yesterday.toDateString()
						? `昨天 ${mtime.toTimeString().slice(0, 5)}`
						: `${(mtime.getMonth() + 1).toString().padStart(2, '0')}-${mtime.getDate().toString().padStart(2, '0')} ${mtime.toTimeString().slice(0, 5)}`;

				return `<a class="fox-recent-item" href="#" data-path="${f.path}">` +
					`<span class="fox-recent-name">${f.basename}</span>` +
					`<span class="fox-recent-time">${rel}</span></a>`;
			}).join('');

			listEl.querySelectorAll('.fox-recent-item').forEach(el => {
				el.addEventListener('click', (e) => {
					e.preventDefault();
					const path = (el as HTMLElement).dataset.path;
					if (path) this.openNote(path);
				});
			});
		} catch (e) {
			console.error('[Fox] Recent updates error:', e);
		}
	}

	// ═══════════════════════════════════════════════
	// HEATMAP
	// ═══════════════════════════════════════════════

	private heatmapMode: 'year' | 'month' | 'week' = 'year';

	private async loadHeatmap() {
		const wrap = this.contentEl.querySelector('#fox-heatmap-wrap');
		if (!wrap) return;

		try {
			const allFiles = this.app.vault.getMarkdownFiles()
				.filter(f => !f.path.startsWith('.') && f.path !== 'README.md' && f.path !== 'CLAUD.md');

			// Count entries per date based on file modification time
			const dateCount = new Map<string, number>();
			for (const f of allFiles) {
				const d = new Date(f.stat.mtime);
				const key = d.toISOString().slice(0, 10);
				dateCount.set(key, (dateCount.get(key) || 0) + 1);
			}

			if (dateCount.size === 0) {
				wrap.innerHTML = '<div class="fox-task-empty">📭 暂无日记记录</div>';
				return;
			}

			const today = new Date();
			const hmFill = getComputedStyle(this.contentEl).getPropertyValue('--fox-heatmap-fill').trim() || '#789B58';
			const hmR = parseInt(hmFill.slice(1, 3), 16), hmG = parseInt(hmFill.slice(3, 5), 16), hmB = parseInt(hmFill.slice(5, 7), 16);
			const hmRgba = (a: string) => `rgba(${hmR},${hmG},${hmB},${a})`;
			const hmStroke = hmRgba('0.15');
			// Continuous gradient: alpha 0.06 (0 notes) → 0.26 (1 note) → 0.90 (50+ notes)
			const fillColor = (count: number) =>
				count === 0 ? hmRgba('0.06') : hmRgba(String(Math.min(0.26 + ((count - 1) / 49) * 0.64, 0.90).toFixed(3)));

			// Tabs
			let html = '<div class="fox-heatmap-tabs">';
			const modes: Array<'year' | 'month' | 'week'> = ['week', 'month', 'year'];
			const labels = { week: '周', month: '月', year: '年' };
			for (const m of modes) {
				const active = m === this.heatmapMode ? ' active' : '';
				html += `<span class="fox-heatmap-tab${active}" data-mode="${m}">${labels[m]}</span>`;
			}
			html += '</div>';

			// Labels row
			html += '<div class="fox-heatmap-labels" id="fox-hm-labels"></div>';

			// SVG
			const cellGap = 3;

			if (this.heatmapMode === 'year') {
				const cellSize = 14;
				const step = cellSize + cellGap;
				const oneYearAgo = new Date(today.getFullYear(), 0, 1);
				const yearEnd = new Date(today.getFullYear(), 11, 31);
				const totalDays = Math.round((yearEnd.getTime() - oneYearAgo.getTime()) / 86400000) + 1;
				const cols = 53;
				const rows = 7;
				const dows = ['日', '一', '二', '三', '四', '五', '六'];

				const svgW = cols * step + 30;
				const svgH = rows * step + 30;
				let svg = `<svg class="fox-heatmap-svg fox-heatmap-svg-year" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">`;
				for (let i = 0; i < totalDays; i++) {
					const d = new Date(oneYearAgo);
					d.setDate(d.getDate() + i);
					const ds = d.toISOString().slice(0, 10);
					const count = dateCount.get(ds) || 0;
					const dow = d.getDay();
					const dayOfYear = Math.floor((d.getTime() - oneYearAgo.getTime()) / 86400000);
					const col = Math.max(0, Math.min(52, Math.floor(dayOfYear / 7)));
					const row = dow;
					const x = col * step + 28;
					const y = row * step + 6;
					svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="3" fill="${fillColor(count)}" stroke="${hmStroke}" stroke-width="0.5" data-date="${ds}"><title>${ds} · ${count > 0 ? count + ' 篇日记' : '无记录'}</title></rect>`;
				}
				for (let r = 0; r < 7; r++) {
					if (r % 2 === 0) {
						svg += `<text x="2" y="${r * step + cellSize + 5}" class="fox-hm-dow">${dows[r]}</text>`;
					}
				}
				// Legend — continuous gradient bar
				svg += `<defs><linearGradient id="hm-legend-grad" x1="0%" y1="0%" x2="100%" y2="0%">`;
				for (let g = 0; g <= 10; g++) {
					const pct = g / 10;
					const alpha = 0.06 + pct * 0.84;
					svg += `<stop offset="${Math.round(pct * 100)}%" stop-color="rgba(${hmR},${hmG},${hmB},${alpha.toFixed(3)})"/>`;
				}
				svg += `</linearGradient></defs>`;
				svg += `<g transform="translate(${cols * step - 130}, ${rows * step + 10})">`;
				svg += `<text x="0" y="0" class="fox-hm-dow" style="font-size:7px">少</text>`;
				svg += `<rect x="14" y="-8" width="60" height="14" rx="3" fill="url(#hm-legend-grad)" stroke="${hmStroke}" stroke-width="0.5"/>`;
				svg += `<text x="80" y="0" class="fox-hm-dow" style="font-size:7px">多</text></g>`;
				svg += '</svg>';

				wrap.innerHTML = html + '<div class="fox-heatmap-scroll-year"><div class="fox-heatmap-year-tag">' + today.getFullYear() + '</div>' + svg + '</div>';

			} else if (this.heatmapMode === 'month') {
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
				const dows = ['日', '一', '二', '三', '四', '五', '六'];

				let svg = `<svg class="fox-heatmap-svg fox-heatmap-svg-month" width="${cols * step + 38}" height="${rows * step + 18}" viewBox="0 0 ${cols * step + 38} ${rows * step + 18}">`;
				// Day-of-week headers
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
					svg += `<rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="3" fill="${fillColor(count)}" stroke="${hmStroke}" stroke-width="0.5" data-date="${ds}"><title>${ds} · ${count > 0 ? count + ' 篇日记' : '无记录'}</title></rect>`;
				}
				svg += '</svg>';

				const monthLabel = `${year}年${month + 1}月`;
				wrap.innerHTML = html + `<div class="fox-heatmap-labels" style="justify-content:center;font-size:0.7rem">${monthLabel}</div>` + svg;

			} else { // week
				const cellSize = 14;
				const step = cellSize + cellGap;
				const startOfWeek = new Date(today);
				const dow = today.getDay();
				startOfWeek.setDate(today.getDate() - dow);

				let svg = `<svg class="fox-heatmap-svg" width="${7 * step + 12}" height="${step + 18}" viewBox="0 0 ${7 * step + 12} ${step + 18}">`;
				const dows = ['日', '一', '二', '三', '四', '五', '六'];
				for (let c = 0; c < 7; c++) {
					const d = new Date(startOfWeek);
					d.setDate(startOfWeek.getDate() + c);
					const ds = d.toISOString().slice(0, 10);
					const count = dateCount.get(ds) || 0;
					const x = c * step + 10;
					svg += `<rect x="${x}" y="14" width="${cellSize}" height="${cellSize}" rx="3" fill="${fillColor(count)}" stroke="${hmStroke}" stroke-width="0.5" data-date="${ds}"><title>${ds} · ${count > 0 ? count + ' 篇日记' : '无记录'}</title></rect>`;
					svg += `<text x="${x + 2}" y="10" class="fox-hm-dow">${dows[c]}</text>`;
					const dayNum = d.getDate();
					svg += `<text x="${x + 2}" y="${step + 30}" class="fox-hm-dow" style="font-size:6px">${dayNum}</text>`;
				}
				svg += '</svg>';

				wrap.innerHTML = html + svg;
			}

			// Bind tab clicks
			wrap.querySelectorAll('.fox-heatmap-tab').forEach(tab => {
				(tab as HTMLElement).onclick = () => {
					const mode = (tab as HTMLElement).dataset.mode as 'year' | 'month' | 'week';
					if (mode && mode !== this.heatmapMode) {
						this.heatmapMode = mode;
						this.loadHeatmap();
					}
				};
			});

		} catch (e) {
			wrap.innerHTML = '<div class="fox-task-empty">⚠ 热力图加载失败</div>';
			console.error('[Fox] Heatmap error:', e);
		}
	}

	// ═══════════════════════════════════════════════
	// UTILITY
	// ═══════════════════════════════════════════════

	private escapeHtml(s: string): string {
		return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	}
}


/* ═══════════════════════════════════════════════
   KNOWLEDGE MODAL
   ═══════════════════════════════════════════════ */

interface TemplateOption {
	id: string;
	label: string;
	templateFile: string | null; // null = 内联, path = 读取文件
	getContent: (title: string, date: string) => string;
}

const TEMPLATES: TemplateOption[] = [
		{ id: 'concept',           label: '📘 概念',       templateFile: '模板/概念笔记模板.md',       getContent: () => '' },
		{ id: 'tutorial',          label: '📗 教程',       templateFile: '模板/教程笔记模板.md',       getContent: () => '' },
		{ id: 'methodology',       label: '📙 方法论',     templateFile: '模板/方法论笔记模板.md',     getContent: () => '' },
		{ id: 'tool',              label: '🔧 工具',       templateFile: '模板/工具笔记模板.md',       getContent: () => '' },
		{ id: 'thinking',          label: '💡 思考',       templateFile: '模板/思考笔记模板.md',       getContent: () => '' },
		{ id: 'research-concept',  label: '🔬 科研概念笔记', templateFile: '模板/科研概念笔记模板.md', getContent: () => '' },
		{ id: 'lit-note',          label: '📄 文献笔记',   templateFile: '模板/文献笔记模板.md',       getContent: () => '' },
	];

class KnowledgeModal extends Modal {
	plugin: FoxDashboardPlugin;
	titleInput: HTMLInputElement;
	selectedId: string;
	createBtn: HTMLButtonElement;

	constructor(app: App, plugin: FoxDashboardPlugin) {
		super(app);
		this.plugin = plugin;
		this.selectedId = 'concept';
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.addClass('fox-knowledge-modal');
		contentEl.empty();

		contentEl.createEl('h2', { text: '📚 新建知识卡片' });

		// Title input
		this.titleInput = contentEl.createEl('input', {
			type: 'text',
			attr: { placeholder: '知识卡片名称…', autofocus: '' },
		});
		this.titleInput.addClass('fox-knowledge-input');

		// Template list
		const list = contentEl.createDiv({ cls: 'fox-knowledge-tpl-list' });
		for (const tpl of TEMPLATES) {
			const btn = list.createEl('button', { cls: 'fox-knowledge-tpl-btn', text: tpl.label });
			if (tpl.id === this.selectedId) btn.addClass('active');
			btn.onclick = () => {
				list.querySelectorAll('.fox-knowledge-tpl-btn').forEach((b) => b.removeClass('active'));
				btn.addClass('active');
				this.selectedId = tpl.id;
			};
		}

		// Buttons
		const btnRow = contentEl.createDiv({ cls: 'fox-knowledge-actions' });
		const cancelBtn = btnRow.createEl('button', { cls: 'fox-record-btn', text: '取消' });
		cancelBtn.onclick = () => this.close();

		this.createBtn = btnRow.createEl('button', {
			cls: 'fox-record-btn',
			text: '🌱 创建',
			attr: { style: 'background: var(--fox-accent); color: #fff;' },
		});
		this.createBtn.onclick = () => this.doCreate();

		// Enter to submit
		this.titleInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') this.doCreate();
		});

		setTimeout(() => this.titleInput.focus(), 50);
	}

	private async doCreate() {
		const title = this.titleInput.value.trim();
		if (!title) {
			new Notice('请输入知识卡片名称');
			this.titleInput.focus();
			return;
		}

		// Sanitize filename
		const safeName = title.replace(/[\/:*?"<>|]/g, '').trim() || '未命名';
		const path = '20-Knowledge/' + safeName + '.md';

		// Check if exists
		if (this.app.vault.getAbstractFileByPath(path)) {
			new Notice('⚠ 已存在同名笔记：' + safeName);
			return;
		}

		// Build content
		const tpl = TEMPLATES.find((t) => t.id === this.selectedId)!;
		const now = new Date();
		const dateStr = now.toISOString().slice(0, 10);
		let content: string;

		try {
			const raw = await this.app.vault.adapter.read(tpl.templateFile!);
			// Replace known variables, clear any unrecognized {{...}} placeholders
			content = raw
				.replace(/\{\{title\}\}/g, title)
				.replace(/\{\{概念名\}\}/g, title)
				.replace(/\{\{date\}\}/g, dateStr)
				.replace(/\{\{.*?\}\}/g, '');
		} catch {
			new Notice('⚠ 读取模板文件失败');
			return;
		}

		try {
			await this.app.vault.create(path, content);
			const file = this.app.vault.getAbstractFileByPath(path);
			if (file instanceof TFile) {
				this.app.workspace.getLeaf().openFile(file);
			}
			this.close();
		} catch (e) {
			new Notice('⚠ 创建笔记失败');
			console.error('[Fox] Knowledge create error:', e);
		}
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
