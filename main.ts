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
};

export default class FoxDashboardPlugin extends Plugin {
	settings: FoxDashboardSettings;

	async onload() {
		await this.loadSettings();

		// Register the custom view
		this.registerView(
			VIEW_TYPE_FOX,
			(leaf) => new FoxDashboardView(leaf, this)
		);

		// Add ribbon icon
		this.addRibbonIcon('compass', '狐の工作台', () => {
			this.openView();
		});

		// Add command
		this.addCommand({
			id: 'open-fox-dashboard',
			name: '打开狐の工作台',
			callback: () => this.openView(),
		});

		// Auto-open on layout ready
		this.app.workspace.onLayoutReady(() => {
			// Small delay to let Obsidian finish initialization
			setTimeout(() => this.openView(), 200);
		});

		// Settings tab
		this.addSettingTab(new FoxDashboardSettingTab(this.app, this));
	}

	async onunload() {
		// Clean up views
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_FOX);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
		// Notify view to refresh if open
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_FOX);
		for (const leaf of leaves) {
			if (leaf.view instanceof FoxDashboardView) {
				leaf.view.onSettingsChanged();
			}
		}
	}

	async openView() {
		// Check if view already exists
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_FOX);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]);
			return;
		}

		// Create new leaf in main content area
		const leaf = this.app.workspace.getLeaf('tab');
		if (leaf) {
			await leaf.setViewState({
				type: VIEW_TYPE_FOX,
				active: true,
			});
			this.app.workspace.revealLeaf(leaf);
		}
	}
}

class FoxDashboardSettingTab extends PluginSettingTab {
	plugin: FoxDashboardPlugin;

	constructor(app: App, plugin: FoxDashboardPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: '狐の工作台设置' });

		new Setting(containerEl)
			.setName('座右铭列表')
			.setDesc('每行一句，随机轮换展示')
			.addTextArea((text) =>
				text
					.setPlaceholder('输入座右铭，每行一句')
					.setValue(this.plugin.settings.mottoList.join('\n'))
					.onChange(async (value) => {
						this.plugin.settings.mottoList = value.split('\n').filter(l => l.trim());
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('学习进度项')
			.setDesc('格式：名称|当前值|最大值，每行一项')
			.addTextArea((text) =>
				text
					.setPlaceholder('GRE 备考|0|100\nPython 数据分析|0|100')
					.setValue(
						this.plugin.settings.progressItems
							.map(p => `${p.name}|${p.value}|${p.max}`)
							.join('\n')
					)
					.onChange(async (value) => {
						this.plugin.settings.progressItems = value
							.split('\n')
							.filter(l => l.trim())
							.map(l => {
								const parts = l.split('|');
								return {
									name: parts[0] || '',
									value: parseInt(parts[1]) || 0,
									max: parseInt(parts[2]) || 100,
								};
							});
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName('第二森林入口')
			.setDesc('格式：显示名称|笔记/文件夹路径，每行一项。留空路径则不跳转。')
			.addTextArea((text) =>
				text
					.setPlaceholder('📚 图书馆|20-Notes/\n🎬 电影收藏|')
					.setValue(
						this.plugin.settings.secondForest
							.map(s => `${s.name}|${s.path}`)
							.join('\n')
					)
					.onChange(async (value) => {
						this.plugin.settings.secondForest = value
							.split('\n')
							.filter(l => l.trim())
							.map(l => {
								const parts = l.split('|');
								return {
									name: parts[0] || '',
									path: parts[1] || '',
								};
							});
						await this.plugin.saveSettings();
					})
			);
	}
}
