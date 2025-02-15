import { Plugin as ObsidianPlugin, MarkdownView, Notice, TFile, RequestUrlParam, RequestUrlResponse, request, requestUrl } from 'obsidian';
import { WidgetType } from '@codemirror/view';
import { MediaLinkInfo } from '../types/media';
import { MediaServiceFactory } from '../services/MediaServiceFactory';
import { SettingsService } from '../core/SettingsService';
import { FileNameService } from '../utils/fileNameService';
import { ImagePathService } from '@/utils/ImagePathService';
import imageCompression from 'browser-image-compression';
import { EventBusService } from '@/services/EventBusService';
import { EventName } from '@/types/events';

interface Plugin extends ObsidianPlugin {
    requestUrl(request: RequestUrlParam): Promise<RequestUrlResponse>;
}

// Interface pour les gestionnaires d'images
abstract class ImageHandler {
    abstract rename(newName: string): Promise<void>;
    abstract move(newPath: string): Promise<void>;
    abstract delete(): Promise<void>;
    abstract getType(): string;
}

// Implémentation pour les images locales
class LocalImageHandler extends ImageHandler {
    private settingsService: SettingsService;

    constructor(private plugin: Plugin, private path: string) {
        super();
        this.settingsService = SettingsService.getInstance();
    }

    async rename(newName: string): Promise<void> {
        const file = this.plugin.app.vault.getAbstractFileByPath(this.path);
        if (file) {
            await this.plugin.app.fileManager.renameFile(file, newName);
        }
    }

    async move(newPath: string): Promise<void> {
        const file = this.plugin.app.vault.getAbstractFileByPath(this.path);
        if (file) {
            await this.plugin.app.fileManager.renameFile(file, newPath);
        }
    }

    async delete(): Promise<void> {
        const service = MediaServiceFactory.getService(this.settingsService.getSettings(), true);
        await service.delete(this.path);
    }

    getType(): string {
        return 'local';
    }
}

// Implémentation pour les images cloud
class CloudImageHandler extends ImageHandler {
    private settingsService: SettingsService;

    constructor(private plugin: Plugin, private url: string) {
        super();
        this.settingsService = SettingsService.getInstance();
    }

    private isKnownService(url: string): boolean {
        return url.includes('cloudinary.com') || 
               url.includes('bunny.net') || 
               url.includes('b-cdn.net') || 
               url.includes('cloudflare') || 
               url.includes('twicpics.com');
    }

    async rename(newName: string): Promise<void> {
        console.log('Renommage cloud:', newName);
    }

    async move(newPath: string): Promise<void> {
        console.log('Déplacement cloud vers:', newPath);
    }

    async delete(): Promise<void> {
        // Si c'est une URL externe non gérée (comme Giphy), on ne supprime pas le fichier
        if (!this.isKnownService(this.url)) {
            return;
        }
        
        const service = MediaServiceFactory.getService(this.settingsService.getSettings(), false);
        await service.delete(this.url);
    }

    getType(): string {
        return this.isKnownService(this.url) ? 'cloud' : 'external';
    }
}

class ImageWidget extends WidgetType {
    private handler: ImageHandler;
    private url: string;
    private altText: string;
    private imageElement: HTMLImageElement | null = null;
    private containerElement: HTMLElement | null = null;
    private startPosition: number = 0;
    
    // Définition des tailles au niveau de la classe
    private readonly sizePixels: Record<string, number> = {
        '1': 100,  // extra-small
        '2': 200,  // small
        '3': 400,  // medium
        '4': 600,  // large
        '5': 800   // extra-large
    };

    constructor(private plugin: Plugin, private mediaInfo: MediaLinkInfo, startPosition: number) {
        super();
        // Pour les images externes, utiliser l'URL sans la taille pour l'affichage
        this.url = mediaInfo.resolvedUrl.split('|')[0];
        this.altText = mediaInfo.altText || '';
        this.handler = this.createHandler(this.url);
        this.startPosition = startPosition;
    }

    private createHandler(url: string): ImageHandler {
        if (url.startsWith('http')) {
            return new CloudImageHandler(this.plugin, url);
        }
        return new LocalImageHandler(this.plugin, url);
    }

    toDOM(): HTMLElement {
        return this.createWidget(true);
    }

    private createWidget(isEditing: boolean = true): HTMLElement {
        const container = document.createElement('div');
        container.className = 'mediaflowz-image-buttons-wrapper';
        this.containerElement = container;

        // Conteneur pour le lien markdown (uniquement en mode édition)
        if (isEditing) {
            container.appendChild(this.createMarkdownEditor());
        }

        // Créer une nouvelle rangée pour les informations et les boutons
        const infoButtonsGroup = document.createElement('div');
        infoButtonsGroup.className = 'mediaflowz-info-buttons-group';
        infoButtonsGroup.style.marginTop = '8px';
        infoButtonsGroup.style.marginBottom = '8px';
        infoButtonsGroup.style.display = 'flex';
        infoButtonsGroup.style.alignItems = 'center';
        infoButtonsGroup.style.gap = '8px';
        infoButtonsGroup.style.flexWrap = 'wrap';

        // Créer l'élément qui affiche le type
        const typeInfo = document.createElement('span');
        typeInfo.className = 'mediaflowz-type-info';
        typeInfo.style.fontSize = '0.8em';
        typeInfo.style.color = 'var(--text-muted)';
        
        const type = this.handler.getType();
        let typeText = type === 'external' ? 'Externe' : 'Local';
        
        if (type === 'cloud' || type === 'external') {
            if (this.url.includes('cloudinary.com')) {
                typeText = 'Cloudinary';
            } else if (this.url.includes('bunny.net') || this.url.includes('b-cdn.net')) {
                typeText = 'Bunny';
            } else if (this.url.includes('cloudflare')) {
                typeText = 'Cloudflare';
            } else if (this.url.includes('twicpics.com')) {
                typeText = 'TwicPics';
            } else if (type === 'external') {
                typeText = 'Externe';
            }
        }
        
        typeInfo.textContent = typeText;
        infoButtonsGroup.appendChild(typeInfo);

        // Créer l'élément qui affiche la taille
        const sizeInfo = document.createElement('span');
        sizeInfo.className = 'mediaflowz-size-info';
        sizeInfo.style.fontSize = '0.8em';
        sizeInfo.style.color = 'var(--text-muted)';
        sizeInfo.textContent = 'Chargement...';

        // Créer la prévisualisation de l'image
        const preview = this.createPreview();
        
        // Écouter l'événement imageLoaded pour mettre à jour les dimensions
        preview.addEventListener('imageLoaded', ((e: Event) => {
            const customEvent = e as CustomEvent<{width: number, height: number}>;
            const { width, height } = customEvent.detail;
            if (width && height) {
                sizeInfo.textContent = `${width}x${height}px`;
            }
        }) as EventListener);

        infoButtonsGroup.appendChild(document.createTextNode(' • '));
        infoButtonsGroup.appendChild(sizeInfo);

        // Créer l'élément qui affiche le poids du fichier
        const fileSizeInfo = document.createElement('span');
        fileSizeInfo.className = 'mediaflowz-filesize-info';
        fileSizeInfo.style.fontSize = '0.8em';
        fileSizeInfo.style.color = 'var(--text-muted)';
        fileSizeInfo.textContent = 'Chargement...';

        // Récupérer et afficher le poids du fichier
        this.getFileSize().then(size => {
            fileSizeInfo.textContent = size;
        });

        infoButtonsGroup.appendChild(document.createTextNode(' • '));
        infoButtonsGroup.appendChild(fileSizeInfo);

        // Créer un conteneur pour les boutons d'action rapide
        const quickActionsGroup = document.createElement('div');
        quickActionsGroup.className = 'mediaflowz-quick-actions';
        quickActionsGroup.style.marginLeft = 'auto'; // Pour pousser les boutons à droite
        quickActionsGroup.style.display = 'flex';
        quickActionsGroup.style.gap = '8px'; // Ajouter un gap entre les boutons

        // Boutons d'action rapide
        const quickActions = [
            { 
                text: 'Copier', 
                onClick: async () => {
                    await navigator.clipboard.writeText(this.url);
                    this.showInfoBar('Lien copié dans le presse-papier', 'info', 2000);
                },
                condition: () => true
            },
            { 
                text: 'Ouvrir', 
                onClick: () => {
                    if (this.handler.getType() === 'local') {
                        try {
                            let fileName = this.url;
                            if (this.url.startsWith('app://')) {
                                const url = new URL(this.url);
                                const fullPath = decodeURIComponent(url.pathname);
                                const parts = fullPath.split('/');
                                fileName = parts[parts.length - 1].split('?')[0];
                            }

                            const file = this.plugin.app.vault.getAbstractFileByPath(fileName);
                            if (!file) {
                                this.showInfoBar('Image introuvable dans le vault', 'error');
                                return;
                            }

                            this.plugin.app.workspace.openLinkText(
                                fileName,
                                '',
                                true
                            );
                            this.showInfoBar('Image ouverte dans Obsidian', 'info', 2000);
                        } catch (error) {
                            console.error('Erreur lors de l\'ouverture:', error);
                            this.showInfoBar('Erreur lors de l\'ouverture de l\'image', 'error');
                        }
                    } else {
                        window.open(this.url, '_blank');
                        this.showInfoBar('Image ouverte dans un nouvel onglet', 'info', 2000);
                    }
                },
                condition: () => true
            },
            { 
                text: 'Voir dans l\'explorateur', 
                onClick: () => {
                    try {
                        let fileName = this.url;
                        if (this.url.startsWith('app://')) {
                            const url = new URL(this.url);
                            const fullPath = decodeURIComponent(url.pathname);
                            const parts = fullPath.split('Dev - Plugin Obsidian/');
                            fileName = parts[parts.length - 1].split('?')[0];
                        }

                        const activeFile = this.plugin.app.workspace.getActiveFile();
                        const sourcePath = activeFile ? activeFile.path : '';
                        const file = ImagePathService.getInstance(this.plugin.app).getImageFile(fileName, sourcePath);

                        if (!file) {
                            this.showInfoBar('Image introuvable dans le vault', 'error');
                            return;
                        }

                        // @ts-ignore
                        this.plugin.app.vault.adapter.exists(file.path).then(exists => {
                            if (exists) {
                                // @ts-ignore
                                this.plugin.app.showInFolder(file.path);
                                this.showInfoBar('Fichier localisé dans l\'explorateur', 'info', 2000);
                            } else {
                                this.showInfoBar('Fichier introuvable', 'error');
                            }
                        });
                    } catch (error) {
                        console.error('Erreur lors de l\'ouverture du dossier:', error);
                        this.showInfoBar('Erreur lors de l\'ouverture du dossier', 'error');
                    }
                },
                condition: () => this.handler.getType() === 'local'
            }
        ];

        // Ne créer que les boutons qui satisfont leur condition
        quickActions.filter(button => button.condition()).forEach(({ text, onClick }) => {
            quickActionsGroup.appendChild(this.createButton(text, onClick));
        });

        // Ajouter les boutons d'action rapide à la barre d'info
        infoButtonsGroup.appendChild(quickActionsGroup);
        container.appendChild(infoButtonsGroup);

        // Prévisualisation de l'image
        container.appendChild(preview);
        
        // Contrôles principaux (slider et boutons d'action)
        container.appendChild(this.createControls());

        return container;
    }

    private createMarkdownEditor(): HTMLElement {
        const linkContainer = document.createElement('div');
        linkContainer.className = 'mediaflowz-markdown-link-container';

        // Ligne 1 : [texte éditable]
        const textContainer = document.createElement('div');
        textContainer.appendChild(document.createTextNode('['));
        const altTextSpan = document.createElement('span');
        altTextSpan.contentEditable = 'true';
        altTextSpan.textContent = this.altText;
        textContainer.appendChild(altTextSpan);
        textContainer.appendChild(document.createTextNode(']'));
        linkContainer.appendChild(textContainer);
        
        // Ligne 2 : (url)
        const urlLine = document.createTextNode(`(${this.url})`);
        linkContainer.appendChild(urlLine);

        return linkContainer;
    }

    private createPreview(): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'mediaflowz-image-preview-wrapper';
        wrapper.style.position = 'relative';
        wrapper.style.width = '100%';
        wrapper.style.height = 'auto';
        wrapper.style.minHeight = '100px';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'center';
        wrapper.style.alignItems = 'center';
        wrapper.style.backgroundColor = 'var(--background-secondary)';
        wrapper.style.borderRadius = '4px';
        wrapper.style.overflow = 'hidden';

        // Créer l'élément image
        this.imageElement = document.createElement('img');
        this.imageElement.style.maxWidth = '100%';
        this.imageElement.style.height = 'auto';
        this.imageElement.style.objectFit = 'contain';
        this.imageElement.alt = 'Image preview';
        
        // Ajouter les écouteurs d'événements avant de définir la source
        this.imageElement.addEventListener('load', () => {
            wrapper.style.backgroundColor = 'transparent';
            const event = new CustomEvent('imageLoaded', { 
                detail: { 
                    width: this.imageElement?.naturalWidth, 
                    height: this.imageElement?.naturalHeight 
                } 
            });
            wrapper.dispatchEvent(event);
        });

        this.imageElement.addEventListener('error', (e) => {
            console.warn('⚠️ Erreur de chargement de l\'image:', this.url);
            wrapper.style.backgroundColor = 'var(--background-secondary)';
            
            const errorMessage = document.createElement('div');
            errorMessage.textContent = 'Erreur de chargement de l\'image';
            errorMessage.style.color = 'var(--text-error)';
            wrapper.appendChild(errorMessage);
        });

        this.imageElement.src = this.url;
        wrapper.appendChild(this.imageElement);
        return wrapper;
    }

    private createControls(): HTMLElement {
        const controlsContainer = document.createElement('div');
        controlsContainer.className = 'mediaflowz-controls-container';

        // Créer un conteneur flex pour organiser le slider et les boutons
        const flexContainer = document.createElement('div');
        flexContainer.style.display = 'flex';
        flexContainer.style.width = '100%';
        flexContainer.style.alignItems = 'center';
        flexContainer.style.gap = '16px';

        // Ajouter le slider
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'mediaflowz-slider-container';
        
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = '1';
        slider.max = '5';
        slider.className = 'mediaflowz-image-slider';

        // Charger la taille sauvegardée ou la valeur par défaut
        const savedSize = this.loadSavedSize();
        slider.value = savedSize;
        
        // Appliquer la taille initiale
        if (this.imageElement) {
            const width = this.sizePixels[savedSize as '1'|'2'|'3'|'4'|'5'];
            this.imageElement.style.width = `${width}px`;
        }

        // Mettre à jour la taille quand le slider change
        let lastWidth: number | null = null;
        let debounceTimeout: NodeJS.Timeout | null = null;

        const updateSize = (value: string) => {
            if (this.imageElement) {
                const width = this.sizePixels[value as '1'|'2'|'3'|'4'|'5'];
                
                // Ne mettre à jour que si la taille a changé
                if (width !== lastWidth) {
                    lastWidth = width;
                    this.imageElement.style.width = `${width}px`;
                    
                    // Mettre à jour le lien markdown
                    const oldLink = this.mediaInfo.originalUrl;
                    const newLink = this.updateImageUrl(oldLink, width);
                    
                    if (newLink !== oldLink) {
                        if (debounceTimeout) {
                            clearTimeout(debounceTimeout);
                        }
                        debounceTimeout = setTimeout(() => {
                            requestAnimationFrame(() => {
                                this.updateLinkInEditor(oldLink, newLink);
                            });
                        }, 150);
                    }
                }
            }
        };

        // Gérer les événements du slider
        let isDragging = false;
        
        slider.addEventListener('mousedown', () => {
            isDragging = true;
            slider.focus();
        });

        slider.addEventListener('mouseup', () => {
            isDragging = false;
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }
            updateSize(slider.value);
        });

        slider.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                if (debounceTimeout) {
                    clearTimeout(debounceTimeout);
                }
                updateSize(slider.value);
            }
        });

        slider.addEventListener('input', (e) => {
            const target = e.target as HTMLInputElement;
            const width = this.sizePixels[target.value as '1'|'2'|'3'|'4'|'5'];
            // Mettre à jour uniquement l'affichage visuel immédiatement
            this.updateImageSize(width);
            
            // Mettre à jour le lien avec debounce pour tous les types d'images
            if (debounceTimeout) {
                clearTimeout(debounceTimeout);
            }
            debounceTimeout = setTimeout(() => {
                updateSize(target.value);
            }, 150);
        });

        sliderContainer.appendChild(slider);

        // Créer un conteneur pour les boutons d'action
        const actionButtonsGroup = document.createElement('div');
        actionButtonsGroup.className = 'mediaflowz-action-buttons';
        actionButtonsGroup.style.display = 'flex';
        actionButtonsGroup.style.gap = '8px'; // Ajouter un gap entre les boutons

        // Boutons d'action
        const actionButtons = [
            { 
                text: `Envoyer vers ${this.getServiceDisplayName()}`, 
                onClick: () => {
                    this.showInfoBar('Veuillez configurer un service cloud dans les settings Obsidian', 'error');
                },
                condition: () => {
                    const settings = SettingsService.getInstance().getSettings();
                    return this.handler.getType() === 'local' && settings.features.autoUpload;
                }
            },
            {
                text: 'Compresser',
                onClick: () => {
                    this.compressImage();
                },
                condition: () => true
            },
            {
                text: 'Télécharger',
                onClick: async () => {
                    await this.downloadImage();
                },
                condition: () => {
                    const settings = SettingsService.getInstance().getSettings();
                    return this.handler.getType() !== 'local' && settings.features.autoUpload;
                }
            },
            { 
                text: 'Déplacer', 
                onClick: async () => {
                    try {
                        await this.handler.move(this.url);
                        this.showInfoBar('Image déplacée avec succès', 'info', 2000);
                    } catch (error) {
                        this.showInfoBar('Erreur lors du déplacement de l\'image', 'error');
                        console.error('Erreur lors du déplacement:', error);
                    }
                },
                condition: () => this.handler.getType() === 'local'
            },
            { 
                text: 'Supprimer', 
                onClick: async () => {
                    let fileDeleted = false;
                    let linkRemoved = false;

                    try {
                        await this.handler.delete();
                        fileDeleted = true;
                    } catch (error) {
                        console.warn('⚠️ Erreur lors de la suppression du fichier:', error);
                        if (error instanceof Error && error.message.includes('n\'a pas été trouvé')) {
                            fileDeleted = true;
                        }
                    }

                    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view?.editor) {
                        const content = view.editor.getValue();
                        
                        let fileName = this.url;
                        if (this.url.startsWith('app://')) {
                            const url = new URL(this.url);
                            const fullPath = decodeURIComponent(url.pathname);
                            const parts = fullPath.split('/');
                            fileName = parts[parts.length - 1].split('?')[0];
                        }

                        const patterns = FileNameService.getImagePatterns(fileName);
                        
                        let bestMatch: { index: number, length: number } | null = null;
                        let minDistance = Infinity;

                        for (const pattern of Object.values(patterns)) {
                            const regex = new RegExp(pattern, 'g');
                            const matches = Array.from(content.matchAll(regex));
                            
                            for (const match of matches) {
                                if (match[0].includes(fileName)) {
                                    const distance = Math.abs(match.index! - this.startPosition);
                                    if (distance < minDistance) {
                                        minDistance = distance;
                                        bestMatch = { index: match.index!, length: match[0].length };
                                    }
                                }
                            }
                        }

                        if (bestMatch) {
                            const before = content.substring(0, bestMatch.index);
                            const after = content.substring(bestMatch.index + bestMatch.length);
                            view.editor.setValue(before + after);
                            linkRemoved = true;
                        }
                    }

                    if (linkRemoved) {
                        if (!fileDeleted) {
                            new Notice('Référence de l\'image supprimée du document');
                        } else {
                            if (this.handler.getType() === 'local') {
                                new Notice('Image supprimée du stockage local');
                            } else {
                                new Notice('Image externe supprimée du document');
                            }
                        }
                        new Notice('Lien supprimé du document', 2000);
                    } else {
                        const errorMessage = 'Impossible de supprimer la référence de l\'image du document';
                        this.showInfoBar(errorMessage, 'error');
                    }
                },
                condition: () => true
            }
        ];

        // Ne créer que les boutons qui satisfont leur condition
        actionButtons.filter(button => button.condition()).forEach(({ text, onClick }) => {
            actionButtonsGroup.appendChild(this.createButton(text, onClick));
        });

        // Ajouter le slider et les boutons au conteneur flex
        flexContainer.appendChild(sliderContainer);
        flexContainer.appendChild(actionButtonsGroup);

        // Ajouter le conteneur flex au conteneur principal
        controlsContainer.appendChild(flexContainer);

        return controlsContainer;
    }

    private createButton(text: string, onClick: () => void): HTMLButtonElement {
        const button = document.createElement('button');
        button.className = 'mediaflowz-image-button';
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

    private showInfoBar(message: string, type: 'error' | 'info' = 'info', duration?: number) {
        if (!this.containerElement) return;

        // Supprimer l'ancienne barre d'info si elle existe
        const oldInfoBar = this.containerElement.querySelector('.mediaflowz-info-bar');
        if (oldInfoBar) {
            oldInfoBar.remove();
        }

        // Créer la nouvelle barre d'info
        const infoBar = document.createElement('div');
        infoBar.className = `mediaflowz-info-bar ${type}`;
        
        // Appliquer les styles spécifiques au type de message
        if (type === 'info') {
            infoBar.style.backgroundColor = '#2c6e49'; // Vert plus foncé
            infoBar.style.color = '#ffffff'; // Texte blanc
        }
        
        // Message
        const messageEl = document.createElement('span');
        messageEl.textContent = message;
        infoBar.appendChild(messageEl);

        // Bouton de fermeture pour les erreurs
        if (type === 'error') {
            const closeButton = document.createElement('span');
            closeButton.className = 'mediaflowz-info-bar-close';
            closeButton.textContent = '×';
            closeButton.onclick = () => {
                infoBar.classList.add('fade-out');
                setTimeout(() => infoBar.remove(), 300);
            };
            infoBar.appendChild(closeButton);
        }

        this.containerElement.appendChild(infoBar);

        // Auto-suppression pour les messages d'info
        if (type === 'info' && duration) {
            setTimeout(() => {
                infoBar.classList.add('fade-out');
                setTimeout(() => infoBar.remove(), 300);
            }, duration);
        }
    }

    private updateImageSize(width: number): void {
        console.log('📏 updateImageSize - Début', {
            width,
            type: this.handler.getType()
        });

        if (this.imageElement) {
            this.imageElement.style.width = `${width}px`;
            this.imageElement.style.height = 'auto';
            
            const wrapper = this.imageElement.closest('.mediaflowz-image-preview-wrapper');
            if (wrapper instanceof HTMLElement) {
                wrapper.style.height = 'auto';
                wrapper.style.minHeight = 'auto';
                wrapper.style.maxHeight = 'none';
            }

            const sizeInfo = wrapper?.closest('.mediaflowz-image-buttons-wrapper')?.querySelector('.mediaflowz-size-info');
            if (sizeInfo && this.imageElement.naturalWidth && this.imageElement.naturalHeight) {
                const ratio = width / this.imageElement.naturalWidth;
                const newHeight = Math.round(this.imageElement.naturalHeight * ratio);
                
                console.log('📐 Dimensions', {
                    naturalWidth: this.imageElement.naturalWidth,
                    naturalHeight: this.imageElement.naturalHeight,
                    displayWidth: width,
                    displayHeight: newHeight
                });

                if (Math.abs(width - this.imageElement.naturalWidth) > 1) {
                    sizeInfo.textContent = `${this.imageElement.naturalWidth}x${this.imageElement.naturalHeight}px (${width}x${newHeight}px)`;
                } else {
                    sizeInfo.textContent = `${this.imageElement.naturalWidth}x${this.imageElement.naturalHeight}px`;
                }
            }
        }
    }

    private async getFileSize(): Promise<string> {
        const type = this.handler.getType();

        try {
            if (type === 'local') {
                const activeFile = this.plugin.app.workspace.getActiveFile();
                const sourcePath = activeFile ? activeFile.path : '';

                let relativePath = this.url;
                
                if (this.url.startsWith('http') || this.url.startsWith('app://')) {
                    const url = new URL(this.url);
                    const fullPath = decodeURIComponent(url.pathname);
                    const parts = fullPath.split('Dev - Plugin Obsidian/');
                    relativePath = parts[parts.length - 1].split('?')[0];
                }
                
                const file = this.plugin.app.vault.getAbstractFileByPath(relativePath);
                
                if (file instanceof TFile) {
                    const size = file.stat.size;
                    return this.formatFileSize(size);
                }
            } else {
                try {
                    const response = await requestUrl({
                        url: this.url,
                        method: 'HEAD'
                    });

                    const size = response.headers?.['content-length'];
                    if (size) {
                        return this.formatFileSize(parseInt(size));
                    }
                } catch (error) {
                    console.error('❌ Erreur lors de la requête HEAD:', error);
                }
            }
        } catch (error) {
            console.error('❌ Erreur lors de la récupération de la taille:', error);
        }
        return 'Non disponible';
    }

    private formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' o';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' Ko';
        return (bytes / (1024 * 1024)).toFixed(1) + ' Mo';
    }

    private async compressImage() {
        try {
            // Récupérer l'image
            let imageBlob: Blob;
            
            if (this.handler.getType() === 'local') {
                // Nettoyer l'URL pour obtenir le chemin relatif
                let relativePath = this.url;
                if (this.url.startsWith('app://')) {
                    const url = new URL(this.url);
                    const fullPath = decodeURIComponent(url.pathname);
                    const parts = fullPath.split('Dev - Plugin Obsidian/');
                    relativePath = parts[parts.length - 1].split('?')[0];
                }

                // Pour les images locales, utiliser ImagePathService pour obtenir le fichier
                const activeFile = this.plugin.app.workspace.getActiveFile();
                const sourcePath = activeFile ? activeFile.path : '';
                const file = ImagePathService.getInstance(this.plugin.app).getImageFile(relativePath, sourcePath);

                if (!file) {
                    throw new Error('Fichier non trouvé');
                }

                const arrayBuffer = await this.plugin.app.vault.readBinary(file);
                imageBlob = new Blob([arrayBuffer], { type: 'image/jpeg' });
            } else {
                // Pour les images externes, utiliser fetch
                const response = await fetch(this.url);
                imageBlob = await response.blob();
            }

            // Options de compression
            const options = {
                maxSizeMB: 1,             // Taille maximale en MB
                maxWidthOrHeight: 1920,    // Dimension maximale
                useWebWorker: false,       // Désactivé car peut causer des problèmes dans Electron
                initialQuality: 0.8        // Qualité initiale
            };

            // Afficher la barre de progression
            this.showInfoBar('Compression en cours...', 'info');

            // Convertir le Blob en File pour la compression
            const imageFile = new File([imageBlob], 'image.jpg', { type: imageBlob.type });

            // Compresser l'image
            const compressedBlob = await imageCompression(imageFile, options);
            
            // Créer un nom de fichier pour l'image compressée
            const originalName = this.url.split('/').pop()?.split('?')[0] || 'image';
            const extension = originalName.split('.').pop();
            const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
            const compressedName = `${baseName}-compressed.${extension}`;

            // Pour les images locales, sauvegarder dans le vault
            if (this.handler.getType() === 'local') {
                const arrayBuffer = await compressedBlob.arrayBuffer();
                const activeFile = this.plugin.app.workspace.getActiveFile();
                const currentFolder = activeFile ? activeFile.parent : null;
                const targetPath = currentFolder ? `${currentFolder.path}/${compressedName}` : compressedName;

                const normalizedPath = targetPath.replace(/\\/g, '/');
                await this.plugin.app.vault.adapter.writeBinary(normalizedPath, arrayBuffer);
                
                // Afficher les statistiques de compression
                const originalSize = (imageBlob.size / 1024).toFixed(1);
                const compressedSize = (compressedBlob.size / 1024).toFixed(1);
                const reduction = (100 - (compressedBlob.size / imageBlob.size) * 100).toFixed(1);
                
                this.showInfoBar(
                    `Image compressée sauvegardée : ${compressedName}\nTaille originale: ${originalSize}KB → Compressée: ${compressedSize}KB (${reduction}% de réduction)`,
                    'info',
                    5000
                );

                // Mettre à jour le lien dans l'éditeur pour pointer vers la nouvelle image
                const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                if (view?.editor) {
                    const content = view.editor.getValue();
                    const cursor = view.editor.getCursor();
                    
                    // Remplacer le lien de l'image originale par celui de l'image compressée
                    const newContent = content.replace(
                        new RegExp(`\\[\\[${this.escapeRegExp(this.url)}(\\|\\d+)?\\]\\]`),
                        `[[${targetPath}$1]]`
                    );
                    
                    view.editor.setValue(newContent);
                    view.editor.setCursor(cursor);
                }
            } else {
                // Pour les images externes, sauvegarder dans le vault
                const arrayBuffer = await compressedBlob.arrayBuffer();
                const activeFile = this.plugin.app.workspace.getActiveFile();
                const currentFolder = activeFile ? activeFile.parent : null;
                const targetPath = currentFolder ? `${currentFolder.path}/${compressedName}` : compressedName;

                const normalizedPath = targetPath.replace(/\\/g, '/');
                await this.plugin.app.vault.adapter.writeBinary(normalizedPath, arrayBuffer);
                
                // Afficher les statistiques de compression
                const originalSize = (imageBlob.size / 1024).toFixed(1);
                const compressedSize = (compressedBlob.size / 1024).toFixed(1);
                const reduction = (100 - (compressedBlob.size / imageBlob.size) * 100).toFixed(1);
                
                this.showInfoBar(
                    `Image externe compressée et sauvegardée localement : ${compressedName}\nTaille originale: ${originalSize}KB → Compressée: ${compressedSize}KB (${reduction}% de réduction)`,
                    'info',
                    5000
                );

                // Mettre à jour le lien dans l'éditeur pour pointer vers la nouvelle image locale
                const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                if (view?.editor) {
                    const content = view.editor.getValue();
                    const cursor = view.editor.getCursor();
                    
                    // Remplacer le lien externe par le lien local
                    const newContent = content.replace(
                        new RegExp(`\\[([^\\]]*)\\]\\(${this.escapeRegExp(this.url)}\\)`),
                        `[[${targetPath}]]`
                    );
                    
                    view.editor.setValue(newContent);
                    view.editor.setCursor(cursor);
                }
            }
        } catch (error) {
            console.error('Erreur lors de la compression:', error);
            this.showInfoBar('Erreur lors de la compression de l\'image', 'error');
        }
    }

    private getServiceDisplayName(): string {
        const settings = SettingsService.getInstance().getSettings();
        if (!settings.service) return 'Cloud';

        switch (settings.service) {
            case 'cloudinary':
                return 'Cloudinary';
            case 'twicpics':
                return 'TwicPics';
            case 'cloudflare':
                return 'Cloudflare';
            case 'bunny':
                return 'Bunny.net';
            default:
                return 'Cloud';
        }
    }

    private updateLinkInEditor(oldLink: string, newLink: string) {
        // @ts-ignore
        const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view?.editor) return;

        const isExternal = this.handler.getType() !== 'local';
        const width = newLink.split('|')[1]; // Extraire la nouvelle taille
        
        // Sauvegarder la position du viewport et l'état actuel
        const scrollInfo = view.editor.getScrollInfo();
        const content = view.editor.getValue();
        
        const imagePathService = ImagePathService.getInstance(this.plugin.app);
        
        // Préparer la mise à jour en une seule fois
        if (isExternal) {
            const baseUrl = imagePathService.cleanPath(this.url);
            
            // Créer une regex qui match le format exact sans essayer d'échapper l'URL
            const pattern = `\\[([^\\]|]*?)(?:\\|\\d+)?\\]\\([^)]*\\)`;
            const regex = new RegExp(pattern, 'g');
            
            console.log('🔍 Recherche avec pattern:', pattern);
            
            // Trouver toutes les occurrences dans le document
            let match;
            let lastMatch = null;
            let bestMatchDistance = Infinity;
            
            // Nettoyer l'URL de base pour la comparaison
            const cleanBaseUrl = this.normalizeUrl(baseUrl);
            console.log('🧹 URL de base nettoyée:', cleanBaseUrl);
            
            while ((match = regex.exec(content)) !== null) {
                // Extraire l'URL du match
                const urlMatch = match[0].match(/\]\((.*?)\)/);
                if (urlMatch) {
                    const matchedUrl = this.normalizeUrl(urlMatch[1]);
                    console.log('🔍 Comparaison URLs:', {
                        matched: matchedUrl,
                        base: cleanBaseUrl,
                        isEqual: matchedUrl === cleanBaseUrl
                    });
                    
                    if (matchedUrl === cleanBaseUrl) {
                        const distance = Math.abs(match.index - this.startPosition);
                        if (distance < bestMatchDistance) {
                            bestMatchDistance = distance;
                            lastMatch = match;
                        }
                    }
                }
            }
            
            if (lastMatch) {
                console.log('📝 Mise à jour du lien:', {
                    original: lastMatch[0],
                    baseUrl,
                    width
                });

                const start = view.editor.posToOffset({ 
                    line: content.substring(0, lastMatch.index).split('\n').length - 1,
                    ch: lastMatch.index - content.lastIndexOf('\n', lastMatch.index) - 1
                });
                const end = start + lastMatch[0].length;
                
                // Extraire l'URL complète du match original
                const urlMatch = lastMatch[0].match(/\]\((.*?)\)/);
                const originalUrl = urlMatch ? urlMatch[1] : baseUrl;
                
                const altText = lastMatch[1].split('|')[0] || ''; // Extraire le texte sans la taille
                const replacement = `[${altText}|${width}](${originalUrl})`;
                
                console.log('📝 Remplacement:', {
                    from: lastMatch[0],
                    to: replacement
                });

                // Première frame : faire les modifications
                requestAnimationFrame(() => {
                    // Mettre à jour le lien et l'image en même temps
                    if (this.imageElement) {
                        this.imageElement.style.width = `${width}px`;
                        this.imageElement.style.height = 'auto';
                    }
                    
                    view.editor.replaceRange(replacement, 
                        view.editor.offsetToPos(start),
                        view.editor.offsetToPos(end)
                    );

                    // Deuxième frame : restaurer la position après que le DOM soit mis à jour
                    requestAnimationFrame(() => {
                        view.editor.scrollTo(scrollInfo.left, scrollInfo.top);
                    });

                    EventBusService.getInstance().emit(EventName.IMAGE_RESIZED, {
                        oldSize: parseInt(oldLink.split('|')[1] || '0'),
                        newSize: parseInt(width),
                        markdown: replacement
                    });
                });
            } else {
                console.warn('⚠️ Aucune correspondance trouvée pour:', baseUrl);
            }
        } else {
            const basePath = imagePathService.cleanPath(oldLink);
            const escapedPath = this.escapeRegExp(basePath);
            const wikiPattern = `\\[\\[${escapedPath}\\|(\\d+)\\]\\]`;
            const wikiRegex = new RegExp(wikiPattern, 'g');
            
            // Trouver toutes les occurrences dans le document
            let match;
            let lastMatch = null;
            while ((match = wikiRegex.exec(content)) !== null) {
                lastMatch = match;
            }
            
            if (lastMatch) {
                const start = view.editor.posToOffset({ 
                    line: content.substring(0, lastMatch.index).split('\n').length - 1,
                    ch: lastMatch.index - content.lastIndexOf('\n', lastMatch.index) - 1
                });
                const end = start + lastMatch[0].length;
                const replacement = `[[${basePath}|${width}]]`;
                
                // Première frame : faire les modifications
                requestAnimationFrame(() => {
                    // Mettre à jour le lien et l'image en même temps
                    if (this.imageElement) {
                        this.imageElement.style.width = `${width}px`;
                        this.imageElement.style.height = 'auto';
                    }
                    
                    view.editor.replaceRange(replacement, 
                        view.editor.offsetToPos(start),
                        view.editor.offsetToPos(end)
                    );

                    // Deuxième frame : restaurer la position après que le DOM soit mis à jour
                    requestAnimationFrame(() => {
                        view.editor.scrollTo(scrollInfo.left, scrollInfo.top);
                    });

                    EventBusService.getInstance().emit(EventName.IMAGE_RESIZED, {
                        oldSize: parseInt(oldLink.split('|')[1] || '0'),
                        newSize: parseInt(width),
                        markdown: replacement
                    });
                });
            }
        }
    }

    private updateImageUrl(oldLink: string, width: number): string {
        const imagePathService = ImagePathService.getInstance(this.plugin.app);
        
        // Pour les images externes
        if (this.handler.getType() !== 'local') {
            const baseUrl = imagePathService.cleanPath(this.url);
            return `${baseUrl}|${width}`;
        }
        
        // Pour les images locales
        const basePath = imagePathService.cleanPath(oldLink);
        return `${basePath}|${width}`;
    }

    private loadSavedSize(): string {
        const originalUrl = this.mediaInfo.originalUrl;
        console.log('🔍 Chargement de la taille sauvegardée pour:', originalUrl);

        // Pour les images externes
        if (originalUrl.startsWith('http')) {
            // Chercher dans le contenu de l'éditeur
            // @ts-ignore
            const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (view?.editor) {
                const content = view.editor.getValue();
                const baseUrl = originalUrl.split('|')[0];
                const cleanBaseUrl = this.normalizeUrl(baseUrl);
                console.log('🧹 URL nettoyée pour la recherche:', cleanBaseUrl);
                
                // Chercher le pattern [texte|taille](url)
                const pattern = `\\[([^\\]|]*?)(?:\\|(\\d+))?\\]\\([^)]*\\)`;
                const regex = new RegExp(pattern, 'g');
                
                let bestMatch = null;
                let bestMatchDistance = Infinity;
                let match;
                
                while ((match = regex.exec(content)) !== null) {
                    const urlMatch = match[0].match(/\]\((.*?)\)/);
                    if (urlMatch) {
                        const matchedUrl = this.normalizeUrl(urlMatch[1]);
                        console.log('🔍 Comparaison:', {
                            matched: matchedUrl,
                            base: cleanBaseUrl,
                            isEqual: matchedUrl === cleanBaseUrl
                        });
                        
                        if (matchedUrl === cleanBaseUrl) {
                            const distance = Math.abs(match.index - this.startPosition);
                            if (distance < bestMatchDistance) {
                                bestMatchDistance = distance;
                                bestMatch = match;
                            }
                        }
                    }
                }
                
                if (bestMatch) {
                    // Extraire la taille du meilleur match
                    const sizeMatch = bestMatch[0].match(/\|(\d+)\]/);
                    if (sizeMatch) {
                        const width = parseInt(sizeMatch[1]);
                        console.log('📏 Taille trouvée:', width);
                        
                        // Convertir les pixels en position de slider
                        for (const [position, pixels] of Object.entries(this.sizePixels)) {
                            if (width <= pixels) {
                                return position;
                            }
                        }
                        return '5';
                    }
                }
            }
        } else {
            // Pour les images locales, chercher dans le contenu de l'éditeur
            // @ts-ignore
            const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (view?.editor) {
                const content = view.editor.getValue();
                const escapedUrl = this.escapeRegExp(originalUrl.split('|')[0]);
                const wikiPattern = new RegExp(`\\[\\[${escapedUrl}\\|(\\d+)\\]\\]`);
                const wikiMatch = content.match(wikiPattern);
                
                if (wikiMatch) {
                    const width = parseInt(wikiMatch[1]);
                    console.log('📏 Taille wiki trouvée:', width);
                    
                    // Convertir les pixels en position de slider
                    for (const [position, pixels] of Object.entries(this.sizePixels)) {
                        if (width <= pixels) {
                            return position;
                        }
                    }
                    return '5';
                }
            }
        }
        
        console.log('⚠️ Aucune taille trouvée, utilisation de la valeur par défaut');
        
        // Si pas de taille trouvée, utiliser la valeur par défaut des settings
        const defaultSizeMap: Record<string, string> = {
            'extra-small': '1',
            'small': '2',
            'medium': '3',
            'large': '4',
            'extra-large': '5'
        };
        
        // @ts-ignore
        const defaultPosition = defaultSizeMap[this.plugin.settings?.defaultImageWidth] || '3';
        return defaultPosition;
    }

    private escapeRegExp(string: string): string {
        // Échapper tous les caractères spéciaux de regex
        return string
            // Échapper d'abord les caractères spéciaux de regex
            .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            // Puis échapper les caractères spéciaux d'URL
            .replace(/[%?=&]/g, '\\$&')
            // Échapper les caractères unicode
            .replace(/[\u00A0-\u9999<>&]/g, (i) => '\\' + i);
    }

    private async downloadImage() {
        if (this.handler.getType() === 'local') {
            this.showInfoBar('L\'image est déjà en local', 'info', 2000);
            return;
        }

        try {
            const settings = SettingsService.getInstance().getSettings();
            const activeFile = this.plugin.app.workspace.getActiveFile();
            
            // Déterminer le dossier de destination
            let targetFolder = '';
            if (settings.features.autoUpload) {
                // Si autoUpload est activé, utiliser le dossier configuré
                targetFolder = settings.features.uploadFolder;
            } else {
                // Sinon, utiliser le dossier de la note active ou le dossier par défaut d'Obsidian
                targetFolder = activeFile?.parent?.path || 'assets';
            }

            // S'assurer que le dossier existe
            if (!await this.plugin.app.vault.adapter.exists(targetFolder)) {
                await this.plugin.app.vault.adapter.mkdir(targetFolder);
            }

            // Télécharger l'image
            const response = await fetch(this.url);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();

            // Générer un nom de fichier unique basé sur le nom original
            const originalName = this.url.split('/').pop()?.split('?')[0] || 'image';
            const extension = originalName.split('.').pop() || 'png';
            const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
            const timestamp = Date.now();
            const fileName = `${baseName}-${timestamp}.${extension}`;
            const filePath = `${targetFolder}/${fileName}`;

            // Sauvegarder le fichier dans le vault
            const normalizedPath = filePath.replace(/\\/g, '/');
            
            // @ts-ignore - Le typage d'Obsidian pour l'adapter n'est pas correct
            await this.plugin.app.vault.adapter.writeBinary(normalizedPath, arrayBuffer);
            
            // Forcer le rafraîchissement du vault pour que le fichier soit reconnu
            await this.plugin.app.vault.adapter.exists(normalizedPath);
            
            // Attendre un peu que le fichier soit indexé
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const savedFile = this.plugin.app.vault.getAbstractFileByPath(normalizedPath);
            
            if (!savedFile || !(savedFile instanceof TFile)) {
                throw new Error('Échec de la création du fichier');
            }

            // Si autoUpload est activé, envoyer vers le cloud
            if (settings.features.autoUpload) {
                try {
                    const service = MediaServiceFactory.getService(settings, false);
                    const cloudUrl = await service.upload(savedFile.path);

                    // Mettre à jour le lien dans l'éditeur
                    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view?.editor) {
                        const content = view.editor.getValue();
                        const cursor = view.editor.getCursor();

                        // Remplacer le lien externe par le lien cloud
                        const newContent = content.replace(
                            new RegExp(`\\[([^\\]]*)\\]\\(${this.escapeRegExp(this.url)}\\)`),
                            `[${this.altText}](${cloudUrl})`
                        );

                        view.editor.setValue(newContent);
                        view.editor.setCursor(cursor);

                        // Si on ne garde pas de copie locale, supprimer le fichier
                        if (!settings.features.keepLocalCopy && savedFile instanceof TFile) {
                            await this.plugin.app.vault.delete(savedFile);
                        }

                        this.showInfoBar('Image téléchargée et envoyée vers le cloud', 'info', 2000);
                    }
                } catch (error) {
                    console.error('Erreur lors de l\'upload vers le cloud:', error);
                    this.showInfoBar('L\'image a été téléchargée localement mais n\'a pas pu être envoyée vers le cloud', 'error');
                }
            } else {
                // Mettre à jour le lien dans l'éditeur avec le chemin local
                const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                if (view?.editor) {
                    const content = view.editor.getValue();
                    const cursor = view.editor.getCursor();

                    // Remplacer le lien externe par le lien local
                    const newContent = content.replace(
                        new RegExp(`\\[([^\\]]*)\\]\\(${this.escapeRegExp(this.url)}\\)`),
                        `[[${savedFile.path}]]`
                    );

                    view.editor.setValue(newContent);
                    view.editor.setCursor(cursor);

                    this.showInfoBar('Image téléchargée localement', 'info', 2000);
                }
            }

            // Émettre un événement pour informer d'autres parties du plugin
            EventBusService.getInstance().emit(EventName.MEDIA_DOWNLOADED, {
                url: this.url,
                type: 'image',
                size: arrayBuffer.byteLength
            });

        } catch (error) {
            console.error('Erreur lors du téléchargement:', error);
            this.showInfoBar('Erreur lors du téléchargement de l\'image', 'error');
        }
    }

    private normalizeUrl(url: string): string {
        try {
            // Supprimer les caractères invisibles et les espaces
            let cleaned = url.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
            
            // Décoder l'URL si elle est encodée
            try {
                cleaned = decodeURIComponent(cleaned);
            } catch (e) {
                // Ignorer les erreurs de décodage
            }
            
            // Normaliser les paramètres de requête
            const urlObj = new URL(cleaned);
            const searchParams = new URLSearchParams(urlObj.search);
            const sortedParams = Array.from(searchParams.entries())
                .sort(([a], [b]) => a.localeCompare(b));
            
            // Reconstruire l'URL avec les paramètres triés
            urlObj.search = new URLSearchParams(sortedParams).toString();
            
            return urlObj.toString();
        } catch (e) {
            // En cas d'erreur, retourner l'URL originale nettoyée
            console.warn('⚠️ Erreur lors de la normalisation de l\'URL:', e);
            return url.trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
        }
    }
}

export { ImageWidget }; 