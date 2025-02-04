import { App, Modal, Setting } from 'obsidian';

export class DeleteConfirmModal extends Modal {
    private result: boolean = false;

    constructor(
        app: App,
        private readonly imagePath: string,
        private readonly onConfirm: () => void
    ) {
        super(app);
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.addClass('delete-confirm-modal');

        contentEl.createEl('h2', { text: 'Confirmer la suppression' });

        contentEl.createEl('p', {
            text: `Êtes-vous sûr de vouloir supprimer cette image ? Cette action est irréversible.`,
            cls: 'delete-confirm-message'
        });

        contentEl.createEl('p', {
            text: this.imagePath,
            cls: 'delete-confirm-path'
        });

        new Setting(contentEl)
            .addButton(btn => {
                btn.setButtonText('Annuler')
                    .setCta()
                    .onClick(() => {
                        this.close();
                    });
            })
            .addButton(btn => {
                btn.setButtonText('Supprimer')
                    .setWarning()
                    .onClick(() => {
                        this.result = true;
                        this.close();
                    });
            });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        if (this.result) {
            this.onConfirm();
        }
    }
} 