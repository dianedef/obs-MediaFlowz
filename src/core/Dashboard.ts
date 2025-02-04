import { ItemView, Plugin, WorkspaceLeaf } from 'obsidian';
import { createApp, type App, type ComponentPublicInstance } from 'vue';

interface DashboardInstance extends ComponentPublicInstance {
    refresh?: () => Promise<void>;
}

export class DashboardView extends ItemView {
    private vueApp: App | null = null;

    constructor(leaf: WorkspaceLeaf, private plugin: Plugin) {
        super(leaf);
    }

    getViewType(): string {
        return 'pluginflowz-view';
    }

    getDisplayText(): string {
        return 'PluginFlowz';
    }

    async onOpen() {
        const container = this.containerEl;
        container.empty();
        
        // Créer et monter l'application Vue
        const app = createApp(Dashboard, {
            plugin: this.plugin
        });
        
        // Monter l'application
        const mountPoint = container.createDiv({ cls: 'pluginflowz-container' });
        this.vueApp = app;
        this.vueApp.mount(mountPoint);
    }

    async onClose() {
        // Nettoyer l'application Vue
        if (this.vueApp) {
            this.vueApp.unmount();
            this.vueApp = null;
        }
    }

    async refresh() {
        // Forcer le rafraîchissement du composant
        if (this.vueApp) {
            const vm = this.vueApp._instance?.proxy as DashboardInstance;
            if (vm?.refresh) {
                await vm.refresh();
            }
        }
    }
}

