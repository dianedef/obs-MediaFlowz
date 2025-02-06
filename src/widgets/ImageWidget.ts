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

        // Créer un conteneur pour les boutons restants
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'mediaflowz-button-group';
        buttonGroup.style.marginLeft = 'auto'; // Pour pousser les boutons à droite

        // Boutons restants
        const buttons = [
            { 
                text: `Envoyer vers ${this.getServiceDisplayName()}`, 
                onClick: () => {
                    this.showInfoBar('Veuillez configurer un service cloud dans les settings Obsidian', 'error');
                }
            },
            {
                text: 'Compresser',
                onClick: () => {
                    this.compressImage();
                }
            },
            {
                text: 'Télécharger',
                onClick: async () => {
                    if (this.handler.getType() !== 'local') {
                        try {
                            const response = await fetch(this.url);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = this.url.split('/').pop() || 'image';
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                            this.showInfoBar('Image téléchargée avec succès', 'info', 2000);
                        } catch (error) {
                            console.error('Erreur lors du téléchargement:', error);
                            this.showInfoBar('Erreur lors du téléchargement de l\'image', 'error');
                        }
                    } else {
                        this.showInfoBar('L\'image est déjà en local', 'info', 2000);
                    }
                }
            }
        ];

        buttons.forEach(({ text, onClick }) => {
            buttonGroup.appendChild(this.createButton(text, onClick));
        });

        infoButtonsGroup.appendChild(buttonGroup);
        container.appendChild(infoButtonsGroup);

        // Prévisualisation de l'image
        container.appendChild(preview);
        
        // Boutons principaux
        container.appendChild(this.createButtons());

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

    private loadSavedSize(): string {
        const originalUrl = this.mediaInfo.originalUrl;

        // Pour les images externes
        if (originalUrl.startsWith('http')) {
            // Chercher dans le contenu de l'éditeur
            // @ts-ignore
            const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
            if (view?.editor) {
                const content = view.editor.getValue();
                const escapedUrl = this.escapeRegExp(originalUrl.split('|')[0]);
                
                // Chercher le pattern [texte|taille](url)
                const externalPattern = new RegExp(`\\[([^\\]]*?)(?:\\|(\\d+))?\\]\\(${escapedUrl}\\)`);
                const match = content.match(externalPattern);
                
                if (match) {
                    const width = match[2] ? parseInt(match[2]) : null;
                    if (width !== null) {
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
        
        // Si pas de taille trouvée, utiliser la valeur par défaut des settings
        const defaultSizeMap: Record<string, string> = {
            'extra-small': '1',
            'small': '2',
            'medium': '3',
            'large': '4',
            'extra-large': '5'
        };
        
        // @ts-ignore
        const defaultPosition = defaultSizeMap[this.plugin.settings.defaultImageWidth] || '3';
        return defaultPosition;
    }

    private escapeRegExp(string: string): string {
        // Échapper tous les caractères spéciaux de regex
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            // Échapper les caractères spéciaux d'URL
            .replace(/[%?=&]/g, '\\$&');
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
            const escapedUrl = this.escapeRegExp(baseUrl);
            // Utiliser une regex plus permissive pour les URLs
            const externalPattern = `\\[([^\\]]*?)(?:\\|\\d+)?\\]\\(${escapedUrl}(?:\\?[^)]*)?\\)`;
            const externalRegex = new RegExp(externalPattern, 'g');
            
            console.log('🔍 Recherche avec pattern:', externalPattern);
            
            // Trouver toutes les occurrences dans le document
            let match;
            let lastMatch = null;
            while ((match = externalRegex.exec(content)) !== null) {
                console.log('✅ Match trouvé:', match[0]);
                lastMatch = match;
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
                const altText = lastMatch[1] || '';
                const replacement = `[${altText}|${width}](${baseUrl})`;
                
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
            const wikiPattern = `\\[\\[${escapedPath}(?:\\|\\d+)?\\]\\]`;
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

    private createButtons(): HTMLElement {
        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'mediaflowz-buttons-container';

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

        // Créer un conteneur pour les boutons uniquement
        const buttonGroup = document.createElement('div');
        buttonGroup.className = 'mediaflowz-button-group';

        // Boutons existants
        const buttons = [
            { 
                text: 'Copier', 
                onClick: async () => {
                    await navigator.clipboard.writeText(this.url);
                    this.showInfoBar('Lien copié dans le presse-papier', 'info', 2000);
                }
            },
            { 
                text: 'Ouvrir', 
                onClick: () => {
                    if (this.handler.getType() === 'local') {
                        try {
                            // Extraire le nom du fichier de l'URL de la même manière que pour la suppression
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

                            // Ouvrir l'image dans un nouvel onglet d'Obsidian
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
                        // Pour les images externes, ouvrir dans un nouvel onglet du navigateur
                        window.open(this.url, '_blank');
                        this.showInfoBar('Image ouverte dans un nouvel onglet', 'info', 2000);
                    }
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
                }
            },
            { 
                text: 'Voir dans l\'explorateur', 
                onClick: () => {
                    if (this.handler.getType() === 'local') {
                        try {
                            // Extraire le nom du fichier de l'URL comme pour la suppression
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

                            // Ouvrir l'explorateur et sélectionner le fichier
                            // @ts-ignore
                            this.plugin.app.vault.adapter.exists(file.path).then(exists => {
                                if (exists) {
                                    // @ts-ignore - La méthode existe dans Obsidian mais n'est pas typée
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
                    } else {
                        this.showInfoBar('Non disponible pour les images externes', 'error');
                    }
                }
            },
            { 
                text: 'Supprimer', 
                onClick: async () => {
                    let fileDeleted = false;
                    let linkRemoved = false;

                    // 1. Essayer de supprimer le fichier physique
                    try {
                        await this.handler.delete();
                        fileDeleted = true;
                    } catch (error) {
                        console.warn('⚠️ Erreur lors de la suppression du fichier:', error);
                        // Si l'erreur indique que le fichier n'existe pas, on considère que c'est ok
                        if (error instanceof Error && error.message.includes('n\'a pas été trouvé')) {
                            fileDeleted = true;
                        }
                        // On continue même si le fichier n'a pas pu être supprimé
                    }

                    // 2. Supprimer la référence dans le document (toujours tenter)
                    const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
                    if (view?.editor) {
                        const content = view.editor.getValue();
                        
                        // Extraire le nom du fichier de l'URL
                        let fileName = this.url;
                        if (this.url.startsWith('app://')) {
                            const url = new URL(this.url);
                            const fullPath = decodeURIComponent(url.pathname);
                            const parts = fullPath.split('/');
                            fileName = parts[parts.length - 1].split('?')[0];
                        }

                        // Obtenir les patterns pour cette image via FileNameService
                        const patterns = FileNameService.getImagePatterns(fileName);
                        console.log('🔍 Patterns de suppression:', patterns);
                        console.log('📄 URL à supprimer:', fileName);
                        console.log('📝 Contenu avant:', content);
                        
                        // Chercher la correspondance la plus proche de la position du widget
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
                            console.log('✅ Match le plus proche trouvé à la position:', bestMatch.index);
                            const before = content.substring(0, bestMatch.index);
                            const after = content.substring(bestMatch.index + bestMatch.length);
                            view.editor.setValue(before + after);
                            linkRemoved = true;
                        }
                        
                        console.log('📝 Contenu après:', view.editor.getValue());
                    }

                    // 3. Afficher le message approprié
                    if (linkRemoved) {
                        if (!fileDeleted) {
                            // Si seulement le lien a été supprimé
                            new Notice('Référence de l\'image supprimée du document');
                        } else {
                            // Si tout a été supprimé ou si le fichier n'existait pas
                            if (this.handler.getType() === 'local') {
                                new Notice('Image supprimée du stockage local');
                            } else {
                                new Notice('Image externe supprimée du document');
                            }
                        }
                        // Confirmer la suppression du lien
                        new Notice('Lien supprimé du document', 2000);
                    } else {
                        // Si rien n'a pu être supprimé
                        const errorMessage = 'Impossible de supprimer la référence de l\'image du document';
                        this.showInfoBar(errorMessage, 'error');
                    }
                }
            }
        ];

        buttons.forEach(({ text, onClick }) => {
            buttonGroup.appendChild(this.createButton(text, onClick));
        });

        // Ajouter le slider et les boutons au conteneur flex
        flexContainer.appendChild(sliderContainer);
        flexContainer.appendChild(buttonGroup);

        // Ajouter le conteneur flex au conteneur principal
        buttonsContainer.appendChild(flexContainer);

        return buttonsContainer;
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

                await this.plugin.app.vault.createBinary(targetPath, arrayBuffer);
                
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

                await this.plugin.app.vault.createBinary(targetPath, arrayBuffer);
                
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
}

export { ImageWidget }; 