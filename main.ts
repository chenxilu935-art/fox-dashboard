import { App, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';
import { FoxDashboardView, VIEW_TYPE_FOX } from './view';

interface FoxDashboardSettings {
	theme: 'day' | 'night';
	bgDayIndex: number;
	bgNightIndex: number;
	mottoList: string[];
	countdowns: { name: string; date: string }[];
	progressItems: { name: string; value: number; max: number }[];
	secondForest: { name: string; path: string }[];
	habitDefs: { id: string; label: string }[];
}

const DEFAULT_SETTINGS: FoxDashboardSettings = {
	theme: 'day',
	bgDayIndex: 0,
	bgNightIndex: 0,
	mottoList: [
		'真正的自由，是走自己的路，并把它做到极致。',
		'深度思考，刻意练习。',
		'专注 · 成长 · 长期主义',
	],
	countdowns: [],
	progressItems: [
		{ name: 'GRE 备考', value: 0, max: 100 },
		{ name: 'Python 数据分析', value: 0, max: 100 },
		{ name: '财务建模', value: 0, max: 100 },
	],
	secondForest: [
		{ name: '📚 图书馆', path: '' },
		{ name: '🎬 电影收藏', path: '' },
		{ name: '📝 长期项目', path: '' },
		{ name: '🌱 成长记录', path: '' },
	],
	habitDefs: [
		{ id: '早起', label: '🌅 早起 (7:30前)' },
		{ id: '冥想', label: '🧘 冥想' },
		{ id: '运动', label: '🏃 运动' },
		{ id: '阅读', label: '📖 阅读' },
		{ id: '日记', label: '📝 日记' },
	],
};

export default class FoxDashboardPlugin extends Plugin {
	settings: FoxDashboardSettings;

	async onload() {
		await this.loadSettings();
		this.registerView(VIEW_TYPE_FOX, (leaf) => new FoxDashboardView(leaf, this));
		this.addRibbonIcon('compass', '狐の工作台', () => this.openView());
		this.addCommand({ id: 'open-fox-dashboard', name: '打开狐の工作台', callback: () => this.openView() });
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
			if (leaf.view instanceof FoxDashboardView) leaf.view.onSettingsChanged();
		}
	}

	async openView() {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_FOX);
		if (existing.length > 0) { this.app.workspace.revealLeaf(existing[0]); return; }
		const leaf = this.app.workspace.getLeaf('tab');
		if (leaf) {
			await leaf.setViewState({ type: VIEW_TYPE_FOX, active: true });
			this.app.workspace.revealLeaf(leaf);
		}
	}
}

// ═══════════════════════════════════════════════
// FoxItemList — 通用可编辑列表组件
// ═══════════════════════════════════════════════
//
// 渲染一个 fox-finance 风格的列表：
//   每行 = Setting(input(s) + 删除按钮)
//   底部 = + 添加按钮
//
// 只在「添加」和「删除」时重建 DOM。
// 编辑时仅触发 onChange 回调，不重建，光标不丢失。

interface FoxItemField {
	type: 'text' | 'number';
	placeholder: string;
	value: string | number;
	onChange: (v: string) => void;
}

interface FoxItemListConfig<T> {
	emptyText?: string;
	addBtnText?: string;
	onAdd: () => T;
	renderRow: (item: T, index: number) => FoxItemField[];
	onSave: () => Promise<void>;
}

function FoxItemList<T>(el: HTMLElement, items: T[], config: FoxItemListConfig<T>) {
	const listEl = el.createDiv();

	function render() {
		listEl.empty();

		if (items.length === 0) {
			listEl.createEl('p', { cls: 'fox-sub-empty', text: config.emptyText || '暂无项目' });
		} else {
			items.forEach((item, i) => {
				const fields = config.renderRow(item, i);
				const s = new Setting(listEl);

				for (const f of fields) {
					if (f.type === 'text') {
						s.addText(t => t.setPlaceholder(f.placeholder).setValue(String(f.value)).onChange(f.onChange));
					} else {
						s.addText(t => t.setPlaceholder(f.placeholder).setValue(String(f.value)).onChange(v => f.onChange(v)));
					}
				}

				s.addButton(b => b.setIcon('trash').setWarning().onClick(async () => {
					items.splice(i, 1);
					await config.onSave();
					render();
				}));

				s.settingEl.addClass('fox-setting-row');
			});
		}
	}

	render();

	// 添加按钮在列表外，不会随 render 重建
	new Setting(el)
		.addButton(b => b.setButtonText(config.addBtnText || '＋ 添加').setCta().onClick(async () => {
			items.push(config.onAdd());
			await config.onSave();
			render();
		}));
}

// ═══════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════

class FoxDashboardSettingTab extends PluginSettingTab {
	plugin: FoxDashboardPlugin;
	constructor(app: App, plugin: FoxDashboardPlugin) { super(app, plugin); this.plugin = plugin; }

	get p(): FoxDashboardPlugin { return this.plugin; }

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: '🦊 狐の工作台设置' });

		// ─── 座右铭列表 ────────────────────────────
		containerEl.createEl('h3', { text: '座右铭列表' });
		FoxItemList(containerEl, this.p.settings.mottoList, {
			emptyText: '暂无座右铭',
			addBtnText: '＋ 添加座右铭',
			onAdd: () => '',
			renderRow: (item, i) => [
				{ type: 'text', placeholder: '输入座右铭…', value: item, onChange: v => { this.p.settings.mottoList[i] = v; } },
			],
			onSave: async () => { await this.p.saveSettings(); },
		});

		// ─── 学习进度项 ────────────────────────────
		containerEl.createEl('h3', { text: '学习进度项' });
		FoxItemList(containerEl, this.p.settings.progressItems, {
			emptyText: '暂无进度项',
			addBtnText: '＋ 添加项目',
			onAdd: () => ({ name: '', value: 0, max: 100 }),
			renderRow: (item, i) => [
				{ type: 'text', placeholder: '名称（如 GRE 备考）', value: item.name, onChange: v => { item.name = v; } },
				{ type: 'number', placeholder: '当前', value: item.value, onChange: v => { item.value = parseInt(v) || 0; } },
				{ type: 'number', placeholder: '目标', value: item.max, onChange: v => { item.max = parseInt(v) || 100; } },
			],
			onSave: async () => { await this.p.saveSettings(); },
		});

		// ─── 第二森林入口 ──────────────────────────
		containerEl.createEl('h3', { text: '第二森林入口' });
		FoxItemList(containerEl, this.p.settings.secondForest, {
			emptyText: '暂无入口',
			addBtnText: '＋ 添加入口',
			onAdd: () => ({ name: '', path: '' }),
			renderRow: (item, i) => [
				{ type: 'text', placeholder: '显示名称', value: item.name, onChange: v => { item.name = v; } },
				{ type: 'text', placeholder: '笔记/文件夹路径', value: item.path, onChange: v => { item.path = v; } },
			],
			onSave: async () => { await this.p.saveSettings(); },
		});

		// ─── 健康习惯 ──────────────────────────────
		containerEl.createEl('h3', { text: '健康习惯' });
		FoxItemList(containerEl, this.p.settings.habitDefs, {
			emptyText: '暂无习惯',
			addBtnText: '＋ 添加习惯',
			onAdd: () => ({ id: '', label: '' }),
			renderRow: (item, i) => [
				{ type: 'text', placeholder: 'id（如 早起）', value: item.id, onChange: v => { item.id = v; } },
				{ type: 'text', placeholder: '显示文字（如 🌅 早起）', value: item.label, onChange: v => { item.label = v; } },
			],
			onSave: async () => { await this.p.saveSettings(); },
		});

		// ─── 保存按钮 ──────────────────────────────────
		containerEl.createEl('hr');
		new Setting(containerEl)
			.addButton(b => b
				.setButtonText('💾 保存设置')
				.setCta()
				.onClick(async () => {
					await this.p.saveSettings();
					new Notice('✅ 设置已保存');
				}));
	}
}
