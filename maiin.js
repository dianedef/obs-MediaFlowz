const { Plugin } = require('obsidian');
const { ViewPlugin, Decoration, WidgetType } = require('@codemirror/view');
const { syntaxTree } = require('@codemirror/language');
const { EditorState } = require('@codemirror/state');
const { app } = require('obsidian');

// Interface pour les gestionnaires d'images
class ImageHandler {
    async rename(oldName, newName) { throw new Error('Not implemented'); }
    async move(newPath) { throw new Error('Not implemented'); }
    async delete() { throw new Error('Not implemented'); }
    getType() { throw new Error('Not implemented'); }
}

// Implémentation pour les images locales
class LocalImageHandler extends ImageHandler {
    constructor(plugin, path) {
        super();
        this.plugin = plugin;
        this.path = path;
    }

    async rename(oldName, newName) {
        const file = this.plugin.app.vault.getAbstractFileByPath(this.path);
        if (file) {
            await this.plugin.app.fileManager.renameFile(file, newName);
        }
    }

    async move(newPath) {
        const file = this.plugin.app.vault.getAbstractFileByPath(this.path);
        if (file) {
            await this.plugin.app.fileManager.renameFile(file, newPath);
        }
    }

    getType() { return 'local'; }
}

// Implémentation pour les images cloud
class CloudImageHandler extends ImageHandler {
    constructor(plugin, url) {
        super();
        this.plugin = plugin;
        this.url = url;
    }

    async rename(oldName, newName) {
        // TODO: Implémenter la logique pour renommer dans le cloud
        console.log('Renommage cloud:', oldName, '→', newName);
    }

    async move(newPath) {
        // TODO: Implémenter la logique pour déplacer dans le cloud
        console.log('Déplacement cloud vers:', newPath);
    }

    getType() { return 'cloud'; }
}

class ImageWidget {
    constructor(plugin, url, altText = '') {
        this.plugin = plugin;
        this.url = url;
        this.altText = altText;
        this.handler = this.createHandler(url);
    }

    createHandler(url) {
        if (url.startsWith('http')) {
            return new CloudImageHandler(this.plugin, url);
        }
        return new LocalImageHandler(this.plugin, url);
    }

    createWidget(isEditing = true) {
        const container = document.createElement('div');
        container.className = 'image-buttons-wrapper';

        // Conteneur pour le lien markdown (uniquement en mode édition)
        if (isEditing) {
            container.appendChild(this.createMarkdownEditor());
        }

        // Prévisualisation de l'image (pour les deux modes)
        container.appendChild(this.createPreview());
        
        // Boutons (les mêmes pour les deux modes)
        container.appendChild(this.createButtons());

        return container;
    }

    createMarkdownEditor() {
        const linkContainer = document.createElement('div');
        linkContainer.className = 'markdown-link-container';

        // Ligne 1 : [texte éditable]
        const textContainer = document.createElement('div');
        textContainer.appendChild(document.createTextNode('['));
        const altTextSpan = document.createElement('span');
        altTextSpan.contentEditable = true;
        altTextSpan.textContent = this.altText;
        textContainer.appendChild(altTextSpan);
        textContainer.appendChild(document.createTextNode(']'));
        linkContainer.appendChild(textContainer);
        
        // Ligne 2 : (url)
        const urlLine = document.createTextNode(`(${this.url})`);
        linkContainer.appendChild(urlLine);

        return linkContainer;
    }

    createPreview() {
        const preview = document.createElement('div');
        preview.className = 'image-preview-wrapper';
        const img = document.createElement('img');
        img.src = this.url;
        img.className = 'image-preview';
        preview.appendChild(img);
        return preview;
    }

    createButtons() {
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'buttons-container';

        // Ajouter le slider
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'slider-container';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '1';
        slider.max = '5';
        slider.value = '3'; // Position par défaut
        slider.className = 'image-slider';
        
        // Labels pour le slider
        const labels = document.createElement('div');
        labels.className = 'slider-labels';
        ['XS', 'S', 'M', 'L', 'XL'].forEach((label, index) => {
            const span = document.createElement('span');
            span.textContent = label;
            span.className = 'slider-label';
            labels.appendChild(span);
        });

        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(labels);
        buttonsContainer.appendChild(sliderContainer);

        // Boutons existants
        const buttons = [
            { text: 'Copier', onClick: () => navigator.clipboard.writeText(this.url) },
            { text: 'Ouvrir', onClick: () => window.open(this.url, '_blank') },
            { text: 'Déplacer', onClick: async () => {
                try {
                    await this.handler.move(this.url);
                } catch (error) {
                    console.error('Erreur lors du déplacement:', error);
                }
            }},
            { text: 'Vers le cloud', onClick: () => { /* TODO */ } },
            { text: 'Voir dans l\'explorateur', onClick: () => { /* TODO */ } },
            { text: 'Supprimer', onClick: () => { /* TODO */ } }
        ];

        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'button-group';
        buttons.forEach(({ text, onClick }) => {
            buttonGroup.appendChild(this.createButton(text, onClick));
        });
        buttonsContainer.appendChild(buttonGroup);

        return buttonsContainer;
    }

    createButton(text, onClick) {
        const button = document.createElement('button');
        button.className = 'image-button';
        button.textContent = text;
        if (onClick) {
            button.onclick = (e) => {
                e?.preventDefault();
                e?.stopPropagation();
                onClick();
            };
        }
        return button;
    }
}

class ImageButtonWidget extends WidgetType {
    constructor(url, from, to, view, plugin) {
        super();
        this.url = url;
        this.from = from;
        this.to = to;
        this.view = view;
        this.plugin = plugin;

        // Trouver le texte alternatif et sa position
        const line = view.state.doc.lineAt(from);
        const lineText = line.text;
        const urlStart = from - line.from;
        const beforeUrl = lineText.slice(0, urlStart);
        
        const altTextMatch = beforeUrl.match(/\[([^\]]*)\](?=[^[]*$)/);
        if (altTextMatch) {
            this.altText = altTextMatch[1];
            const matchStart = beforeUrl.lastIndexOf(altTextMatch[0]);
            this.altTextFrom = line.from + matchStart + 1;
            this.altTextTo = this.altTextFrom + this.altText.length;
        }
    }

    toDOM() {
        // Utiliser notre classe ImageWidget pour créer l'interface
        const widget = new ImageWidget(this.plugin, this.url, this.altText);
        const container = widget.createWidget(true);

        // Ajouter les gestionnaires d'événements pour l'édition
        const altTextDisplay = container.querySelector('.alt-text-display');
        const urlDisplay = container.querySelector('.url-display');

        if (altTextDisplay) {
            altTextDisplay.addEventListener('input', (e) => {
                const newAltText = e.target.textContent;
                this.view.dispatch({
                    changes: {
                        from: this.altTextFrom,
                        to: this.altTextTo,
                        insert: newAltText
                    }
                });
            });
        }

        if (urlDisplay) {
            urlDisplay.addEventListener('input', (e) => {
                const newUrl = e.target.textContent;
                this.view.dispatch({
                    changes: {
                        from: this.from,
                        to: this.to,
                        insert: newUrl
                    }
                });
            });
        }

        return container;
    }
}

class ImageButtonsPlugin extends Plugin {

    async onload() {
        this.originalContents = new Map();
        this.imageCache = new Map();
        this.imageCache = await this.loadData() || new Map();

        // Gestionnaire pour transformer les liens à l'ouverture du fichier
        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (!file) return;
                
                const view = this.app.workspace.activeLeaf?.view;
                if (view?.getViewType() !== 'markdown') return;
                const editor = view.editor;
                if (!editor) return;

                try {
                    const content = await this.app.vault.read(file);
                    console.log('📄 Fichier ouvert:', file.path);
                    this.originalContents.set(file.path, content);

                    // Transformer les liens d'images en supprimant le !
                    const newContent = content.replace(
                        /(!?\[\[([^\]]+\.(jpg|jpeg|png|gif|svg|webp)[^\]]*)\]\])|(!?\[([^\]]*)\]\(([^)]+\.(jpg|jpeg|png|gif|svg|webp)[^)]*)\))/gi,
                        (match) => {
                            if (match.startsWith('!')) {
                                return match.substring(1); // Supprimer le !
                            }
                            return match;
                        }
                    );

                    if (content !== newContent) {
                        editor.setValue(newContent);
                    }
                } catch (error) {
                    console.error('Error processing file:', error);
                }
            })
        );

        // Ajouter le support du mode lecture
        this.registerMarkdownPostProcessor((element, context) => {
            const imageLinks = element.querySelectorAll('a');
            imageLinks.forEach(link => {
                if (link.href.match(/\.(jpg|jpeg|png|gif|svg|webp)/i)) {
                    const widget = new ImageWidget(this, link.href, link.textContent);
                    const container = widget.createWidget(false); // false pour le mode lecture
                    link.parentNode.insertBefore(container, link.nextSibling);
                }
            });
        });

        // On garde uniquement la partie des widgets
        const imageButtonsPlugin = ViewPlugin.fromClass(class {
            constructor(view) {
                this.decorations = this.buildDecorations(view);
                
                // Mettre à jour les décorations quand le document change
                this.update = (update) => {
                    if (update.docChanged) {
                        this.decorations = this.buildDecorations(update.view);
                    }
                };
            }

            buildDecorations(view) {
                // Cette partie a été migrée vers ImageToolbarDecorator.ts
                // On la garde vide pour référence
                return Decoration.none;
            }
        }, {
            decorations: v => v.decorations
        });

        // Ajouter les boutons avec CodeMirror
        this.registerEditorExtension([imageButtonsPlugin]);

        // Styles pour les boutons et la prévisualisation
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            .image-buttons-wrapper {
                display: flex;
                flex-direction: column;
                gap: 8px;
                margin: 8px 0;
                padding: 8px;
                border: 1px solid var(--background-modifier-border);
                border-radius: 4px;
                background: var(--background-primary);
            }

            .image-url-display {
                font-family: var(--font-monospace);
                color: var(--text-muted);
                padding: 4px;
                background: var(--background-secondary);
                border-radius: 4px;
                word-break: break-all;
                cursor: text;
                outline: none;
            }

            .image-url-display:focus {
                background: var(--background-modifier-form-field);
                color: var(--text-normal);
            }

            .image-preview-wrapper {
                display: flex;
                justify-content: center;
                background: var(--background-secondary);
                padding: 8px;
                border-radius: 4px;
            }

            .image-preview {
                max-height: 200px;
                width: auto;
                border-radius: 4px;
            }

            .buttons-container {
                display: flex;
                gap: 16px;
                justify-content: flex-end;
                align-items: center;
                width: 100%;
                padding-right: 0;
            }

            .slider-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 4px;
                flex: 1;
                min-width: 0;
            }

            .image-slider {
                width: 100%;
                margin: 0;
            }

            .slider-labels {
                display: flex;
                justify-content: space-between;
                width: 100%;
                font-size: 10px;
                color: var(--text-muted);
                padding: 0 2px;
            }

            .button-group {
                display: flex;
                gap: 8px;
                flex-shrink: 0;
            }

            .image-button {
                padding: 4px 12px;
                border-radius: 4px;
                background: var(--interactive-accent);
                color: var(--text-on-accent);
                border: none;
                cursor: pointer;
                font-size: 12px;
            }

            .image-button:hover {
                opacity: 0.8;
            }

            .markdown-link-container {
                font-family: var(--font-monospace);
                padding: 4px;
                background: var(--background-secondary);
                border-radius: 4px;
            }

            .alt-text-display,
            .url-display {
                color: var(--text-normal);
                min-width: 20px;
                outline: none;
                margin: 0;
                padding: 0;
            }

            .alt-text-display:focus,
            .url-display:focus {
                background: var(--background-modifier-form-field);
                border-radius: 2px;
            }
        `;
        document.head.appendChild(styleEl);
        this.styleEl = styleEl;

        // Ajouter le support du mode lecture
        this.registerMarkdownPostProcessor((element, context) => {
            const imageLinks = element.querySelectorAll('a');
            imageLinks.forEach(link => {
                if (link.href.match(/\.(jpg|jpeg|png|gif|svg|webp)/i)) {
                    const widget = new ImageWidget(this, link.href, link.textContent);
                    const container = widget.createWidget(false); // false pour le mode lecture
                    link.parentNode.insertBefore(container, link.nextSibling);
                }
            });
        });
    }

    onunload() {
        // Restaurer le contenu original des fichiers
        this.app.workspace.iterateAllLeaves(leaf => {
            if (leaf.view?.getViewType() === 'markdown') {
                const file = leaf.view.file;
                if (file && this.originalContents.has(file.path)) {
                    const originalContent = this.originalContents.get(file.path);
                    this.app.vault.modify(file, originalContent);
                    console.log('📄 Fichier restauré:', file.path, '\n', originalContent);
                }
            }
        });

        if (this.styleEl) {
            this.styleEl.remove();
        }
    }
}

module.exports = ImageButtonsPlugin; 