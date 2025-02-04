import { Plugin, Menu, Editor, TFile, TAbstractFile, TFolder, MarkdownPostProcessorContext, Notice, App, PluginManifest, EmbedCache, View } from 'obsidian';
import { DEFAULT_SETTINGS, type IPluginSettings } from './types/settings';
import { getTranslation } from './core/Translations';
import { MediaFlowzSettingsTab } from './core/SettingsTab';
import { EventBusService } from './services/EventBusService';
import { EditorService } from './services/EditorService';
import { EventName } from './types/events';
import { TViewMode } from './types';
import { EditorView, ViewPlugin } from '@codemirror/view';
import { registerStyles, unregisterStyles } from './core/styles';
import { showNotice, NOTICE_DURATIONS } from './utils/notifications';
import { MediaServiceFactory } from './services/MediaServiceFactory';
import { IMediaUploadService } from './types/IMediaUploadService';
import { ViewMode } from './core/ViewMode';
import { FileNameService } from './utils/fileNameService';
import { MediaToolbarDecorator } from './widgets/MediaToolbarDecorator';
import { ImageWidget } from './widgets/ImageWidget';
import { MediaInfoService } from './services/MediaInfoService';
import { ImagePathService } from './utils/ImagePathService';
import { MediaLinkInfo, MediaLinkType } from './types/media';
import { ImageResizer } from './utils/ImageResizer';

interface EmbedCacheWithPath extends EmbedCache {
    path?: string;
    source?: string;
}

interface MarkdownView extends View {
    editor?: Editor;
}

export default class MediaFlowzPlugin extends Plugin {
    settings!: IPluginSettings;
    private eventBus!: EventBusService;
    private editorService!: EditorService;
    private fileNameService!: FileNameService;
    private mediaUploadService!: IMediaUploadService;
    private viewMode!: ViewMode;
    private originalContents: Map<string, string> = new Map();
    private uploadLock = new Set<string>();
    private processingLock = {
        paste: false,
        upload: false
    };
    private timeouts = {
        paste: null as NodeJS.Timeout | null
    };
    private readonly TIMEOUTS = {
        PASTE: 1000
    };

    constructor(app: App, manifest: PluginManifest) {
        super(app, manifest);
        this.eventBus = EventBusService.getInstance();
        this.editorService = EditorService.getInstance();
        this.fileNameService = FileNameService.getInstance(this.app);
        this.viewMode = new ViewMode(this);
        MediaServiceFactory.initialize(this.app);
    }

    async onload() {
        this.eventBus = EventBusService.getInstance();
        this.editorService = EditorService.getInstance();
        this.fileNameService = FileNameService.getInstance(this.app);
        
        await this.loadSettings();
        
        // Initialiser les services
        const mediaInfoService = MediaInfoService.getInstance(this.app);
        mediaInfoService.setPlugin(this);
        await mediaInfoService.loadCache();
        
        this.mediaUploadService = MediaServiceFactory.getService(this.settings);
        
        this.setupEventListeners();
        
        // Initialiser et activer l'ImageResizer si nécessaire
        const imageResizer = ImageResizer.getInstance(this.app);
        if (this.settings.features.imageResize) {
            imageResizer.enable();
        }

        // Ajouter l'extension pour la barre d'outils des images
        const plugin = this as Plugin;

        this.registerEditorExtension([
            ViewPlugin.fromClass(
                class {
                    private decorator: MediaToolbarDecorator;
                    
                    constructor(view: EditorView) {
                        this.decorator = new MediaToolbarDecorator(view, plugin);
                    }
                    
                    update(update: any) {
                        this.decorator.update(update);
                    }
                    
                    destroy() {
                        this.decorator.destroy();
                    }
                },
                {
                    decorations: v => (v as any).decorator.decorations,
                    eventHandlers: {}
                }
            )
        ]);

        // Ajouter l'onglet des paramètres
        this.addSettingTab(new MediaFlowzSettingsTab(this.app, this));

        // Ajouter le support du mode lecture
        this.registerMarkdownPostProcessor((element: HTMLElement, context: MarkdownPostProcessorContext) => {
            const imageLinks = element.querySelectorAll('a');
            const imagePathService = ImagePathService.getInstance(this.app);

            imageLinks.forEach(link => {
                if (link.href.match(/\.(jpg|jpeg|png|gif|svg|webp)/i)) {
                    const mediaInfo: MediaLinkInfo = {
                        originalUrl: link.href,
                        resolvedUrl: imagePathService.getFullPath(
                            link.getAttribute('href') || link.href,
                            context.sourcePath
                        ),
                        type: imagePathService.isUrl(link.href) ? MediaLinkType.EXTERNAL : MediaLinkType.LOCAL,
                        altText: link.textContent || ''
                    };
                    const widget = new ImageWidget(this, mediaInfo, 0);
                    // @ts-ignore
                    const container = widget.createWidget(false);
                    if (link.parentNode) {
                        link.parentNode.insertBefore(container, link.nextSibling);
                        link.style.display = 'none';
                    }
                }
            });
        });

        // Ajouter l'icône dans la barre latérale
        const ribbonIconEl = this.addRibbonIcon('layout', 'MediaFlowz', async () => {
            try {
                await this.viewMode.setView('popup');
                new Notice(getTranslation('notices.success'));
            } catch (error) {
                new Notice(getTranslation('notices.error'));
            }
        });

        // Menu hover
        ribbonIconEl.addEventListener('mouseenter', () => {
            const menu = new Menu();

            const createMenuItem = (title: string, icon: string, mode: TViewMode) => {
                menu.addItem((item) => {
                    item.setTitle(title)
                        .setIcon(icon)
                        .onClick(async () => {
                            try {
                                await this.viewMode.setView(mode);
                                new Notice(getTranslation('notices.success'));
                            } catch (error) {
                                new Notice(getTranslation('notices.error'));
                            }
                        });
                });
            };

            createMenuItem(getTranslation('dashboard.viewModeTab'), "tab", "tab");
            createMenuItem(getTranslation('dashboard.viewModeSidebar'), "layout-sidebar-right", "sidebar");
            createMenuItem(getTranslation('dashboard.viewModePopup'), "layout-top", "popup");

            const rect = ribbonIconEl.getBoundingClientRect();
            menu.showAtPosition({ x: rect.left, y: rect.top - 10 });

            // Fermer le menu quand la souris quitte l'icône
            const handleMouseLeave = (e: MouseEvent) => {
                const target = e.relatedTarget as HTMLElement;
                if (!target?.closest('.menu')) {
                    menu.hide();
                    ribbonIconEl.removeEventListener('mouseleave', handleMouseLeave);
                }
            };
            ribbonIconEl.addEventListener('mouseleave', handleMouseLeave);
        });

        this.eventBus.emit(EventName.SETTINGS_UPDATED, { settings: this.settings });
        
        // Enregistrer les styles
        registerStyles();

        // Gestionnaire pour transformer les liens à l'ouverture du fichier
        this.registerEvent(
            this.app.workspace.on('file-open', async (file) => {
                if (!file) return;
                
                const view = this.app.workspace.activeLeaf?.view as MarkdownView;
                if (view?.getViewType() !== 'markdown') return;
                if (!view.editor) return;

                try {
                    const content = await this.app.vault.read(file);
                    
                    // Sauvegarder le contenu original
                    if (!this.originalContents.has(file.path)) {
                        this.originalContents.set(file.path, content);
                    }

                    // Transformer les liens d'images en supprimant le !
                    const newContent = content.replace(
                        /(!?\[\[([^\]]+\.(jpg|jpeg|png|gif|svg|webp)[^\]]*)\]\])|(!?\[([^\]]*)\]\(([^)]+\.(jpg|jpeg|png|gif|svg|webp)[^)]*)\))/gi,
                        (match) => {
                            if (match.startsWith('!')) {
                                return match.substring(1);
                            }
                            return match;
                        }
                    );

                    if (content !== newContent) {
                        view.editor.setValue(newContent);
                    }
                } catch (error) {
                    console.error('Error processing file:', error);
                }
            })
        );

        // Écouter les changements de paramètres pour l'ImageResizer
        this.registerEvent(
            this.app.workspace.on('layout-change', () => {
                if (this.settings.features.imageResize) {
                    imageResizer.enable();
                } else {
                    imageResizer.disable();
                }
            })
        );
    }

    private setupEventListeners(): void {
        this.eventBus.on(EventName.SETTINGS_UPDATED, ({ settings }) => {
            this.settings = settings;
            if (this.mediaUploadService) {
                this.mediaUploadService = MediaServiceFactory.getService(settings);
            }
        });

        // Utiliser editorService pour l'insertion des médias
        this.eventBus.on(EventName.MEDIA_UPLOADED, ({ url, fileName }) => {
            const activeLeaf = this.app.workspace.activeLeaf;
            const view = activeLeaf?.view as MarkdownView;
            if (!view?.editor) return;
            this.editorService.insertMedia(view.editor, url, fileName);
        });

        this.registerEvent(
            this.app.workspace.on('editor-paste', async (evt: ClipboardEvent, editor: Editor) => {
                const files = evt.clipboardData?.files;
                if (!files?.length) return;

                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) return;

                // Vérifier si le fichier actif est dans un dossier ignoré
                const isIgnored = this.settings.ignoredFolders.some(folder => {
                    const normalizedFolder = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
                    const normalizedPath = activeFile.path.replace(/\\/g, '/');
                    return normalizedPath.startsWith(normalizedFolder + '/') || normalizedPath === normalizedFolder;
                });

                if (isIgnored) {
                    // Si l'option est activée, créer un dossier pour la note
                    if (this.settings.ignoredFoldersSettings.useNoteFolders) {
                        evt.preventDefault();
                        evt.stopPropagation();

                        const notePath = activeFile.path;
                        const noteBasename = activeFile.basename;
                        const noteDirPath = notePath.substring(0, notePath.lastIndexOf('/'));
                        const assetsFolderPath = `${noteDirPath}/${noteBasename}`;

                        try {
                            const folder = this.app.vault.getAbstractFileByPath(assetsFolderPath);
                            if (!folder) {
                                await this.app.vault.createFolder(assetsFolderPath);
                                showNotice(
                                    getTranslation('settings.ignoredFolders.useNoteFolders.created')
                                        .replace('{noteName}', noteBasename),
                                    NOTICE_DURATIONS.MEDIUM
                                );
                            }

                            for (const file of Array.from(files)) {
                                const fileName = this.fileNameService.generateFileName(file);
                                const filePath = `${assetsFolderPath}/${fileName}`;
                                
                                try {
                                    const buffer = await file.arrayBuffer();
                                    await this.app.vault.createBinary(filePath, buffer);
                                    
                                    const cursor = editor.getCursor();
                                    const relativePath = this.app.metadataCache.getFirstLinkpathDest(fileName, activeFile.path)?.path || fileName;
                                    const markdownLink = `![[${relativePath}]]`;
                                    editor.replaceRange(markdownLink + '\n', cursor);
                                    
                                    showNotice(
                                        getTranslation('settings.ignoredFolders.fileCreated')
                                            .replace('{fileName}', fileName),
                                        NOTICE_DURATIONS.MEDIUM
                                    );
                                } catch (error) {
                                    showNotice(
                                        getTranslation('errors.fileCreationError')
                                            .replace('{fileName}', fileName)
                                            .replace('{error}', error instanceof Error ? error.message : 'Unknown error'),
                                        NOTICE_DURATIONS.ERROR
                                    );
                                }
                            }
                        } catch (error) {
                            showNotice(
                                getTranslation('errors.unexpectedError'),
                                NOTICE_DURATIONS.ERROR
                            );
                        }
                        return;
                    }
                    return;
                }

                try {
                    this.processingLock.paste = true;
                    if (this.timeouts.paste) {
                        clearTimeout(this.timeouts.paste);
                    }

                    // Empêcher le comportement par défaut d'Obsidian
                    evt.preventDefault();
                    evt.stopPropagation();

                    const prefix = await this.fileNameService.getFilePrefix(activeFile);
                    
                    const mediaFiles = Array.from(files).filter(file => {
                        const isMedia = file.type.startsWith('image/') || 
                            file.type.startsWith('video/') ||
                            file.type.startsWith('audio/');
                        return isMedia;
                    });

                    if (mediaFiles.length) {
                        // Insérer un placeholder unique à la position du curseur
                        const cursor = editor.getCursor();
                        const placeholderId = `upload-${Date.now()}`;
                        const placeholder = `![Uploading...${placeholderId}](...)\n`;
                        editor.replaceRange(placeholder, cursor);

                        // Upload immédiat sans passer par l'événement MEDIA_PASTED
                        for (const file of mediaFiles) {
                            const fileId = `${file.name}-${file.size}-${file.lastModified}`;
                            if (this.uploadLock.has(fileId)) {
                                continue;
                            }

                            try {
                                this.uploadLock.add(fileId);
                                
                                const newName = this.fileNameService.generateFileName(file, prefix);
                                const newFile = this.fileNameService.createFileWithNewName(file, newName);
                                
                                const response = await this.mediaUploadService.upload(newFile);
                                
                                // Remplacer le placeholder directement
                                const content = editor.getValue();
                                const placeholderPattern = new RegExp(`!\\[Uploading\\.\\.\\.${placeholderId}\\]\\(\\.\\.\\.\\)\\n`);
                                const newContent = content.replace(placeholderPattern, `[](${response.url})\n`);
                                
                                if (content !== newContent) {
                                    editor.setValue(newContent);
                                    
                                    showNotice(
                                        getTranslation('notices.mediaUploaded').replace('{fileName}', newFile.name),
                                        NOTICE_DURATIONS.UPLOAD
                                    );
                                }
                            } catch (error) {
                                showNotice(
                                    getTranslation('notices.mediaUploadError')
                                        .replace('{fileName}', file.name)
                                        .replace('{error}', error instanceof Error ? error.message : 'Unknown error'),
                                    NOTICE_DURATIONS.ERROR
                                );
                            } finally {
                                this.uploadLock.delete(fileId);
                            }
                        }
                    }
                } finally {
                    // Réinitialiser le verrou après un délai
                    this.timeouts.paste = setTimeout(() => {
                        this.processingLock.paste = false;
                        this.timeouts.paste = null;
                    }, this.TIMEOUTS.PASTE);
                }
            })
        );

        this.registerEditorExtension(EditorView.domEventHandlers({
            paste: (event: ClipboardEvent, view) => {
                const metadata = event.clipboardData?.getData('application/obsidian-media');
                if (metadata) {
                    event.preventDefault();
                    return;
                }
            }
        }));

        // Ajouter l'écouteur pour le renommage des fichiers
        this.registerEvent(
            this.app.vault.on('rename', async (file: TAbstractFile, oldPath: string) => {
                if (!this.settings.ignoredFoldersSettings.useNoteFolders) return;
                
                // Vérifier si c'est une note markdown
                if (!(file instanceof TFile) || file.extension !== 'md') return;

                // Vérifier si la note est dans un dossier ignoré
                const isIgnored = this.settings.ignoredFolders.some(folder => {
                    const normalizedFolder = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
                    const normalizedPath = file.path.replace(/\\/g, '/');
                    return normalizedPath.startsWith(normalizedFolder + '/') || normalizedPath === normalizedFolder;
                });

                if (!isIgnored) return;

                try {
                    // Construire les anciens et nouveaux chemins des dossiers
                    const oldDirPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
                    const oldBasename = oldPath.substring(oldPath.lastIndexOf('/') + 1).replace('.md', '');
                    const oldFolderPath = `${oldDirPath}/${oldBasename}`;

                    const newDirPath = file.path.substring(0, file.path.lastIndexOf('/'));
                    const newBasename = file.basename;
                    const newFolderPath = `${newDirPath}/${newBasename}`;

                    // Vérifier si l'ancien dossier existe
                    const oldFolder = this.app.vault.getAbstractFileByPath(oldFolderPath);
                    if (!oldFolder || !(oldFolder instanceof TFolder)) return;

                    // Renommer le dossier
                    await this.app.vault.rename(oldFolder, newFolderPath);

                    // Attendre un peu pour s'assurer que le système de fichiers est à jour
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Mettre à jour les liens dans toutes les notes
                    const files = this.app.vault.getMarkdownFiles();

                    const newFolder = this.app.vault.getAbstractFileByPath(newFolderPath);
                    if (!newFolder || !(newFolder instanceof TFolder)) {
                        console.error('❌ Nouveau dossier non trouvé:', newFolderPath);
                        return;
                    }

                    // Créer une map des fichiers dans le nouveau dossier
                    const fileMap = new Map();
                    newFolder.children.forEach(file => {
                        if (file instanceof TFile) {
                            fileMap.set(file.name, file);
                            fileMap.set(file.basename, file); // Ajouter aussi sans extension
                        }
                    });

                    for (const noteFile of files) {
                        const cache = this.app.metadataCache.getFileCache(noteFile);
                        const embeds = cache?.embeds || [];
                        let hasChanges = false;
                        let content = await this.app.vault.read(noteFile);

                        for (const embed of embeds) {
                            // Construire le chemin complet pour la comparaison
                            const embedPath = embed.link;

                            // Vérifier si le lien est dans l'ancien dossier (plusieurs cas possibles)
                            const isInOldFolder = 
                                // Cas 1: Chemin complet (ex: RSS/ll/tb/image.png)
                                embedPath.includes(oldFolderPath) || 
                                embedPath.includes(`/${oldBasename}/`) ||
                                // Cas 2: Nom de fichier seul, mais le fichier est dans le dossier
                                fileMap.has(embedPath);

                            if (isInOldFolder) {
                                let targetFile: TFile | null = null;

                                if (fileMap.has(embedPath)) {
                                    // Cas où on a juste le nom du fichier
                                    targetFile = fileMap.get(embedPath);
                                } else {
                                    // Cas où on a le chemin complet
                                    const newPath = embedPath.replace(
                                        new RegExp(`(^|/)${oldBasename}/`),
                                        `$1${newBasename}/`
                                    );
                                    const file = this.app.vault.getAbstractFileByPath(newPath);
                                    if (file instanceof TFile) {
                                        targetFile = file;
                                    }
                                }

                                if (targetFile) {
                                    const newLink = this.app.metadataCache.fileToLinktext(targetFile, noteFile.path, true);
                                    const oldPattern = `![[${embed.link}]]`;
                                    const newPattern = `![[${newLink}]]`;

                                    if (content.includes(oldPattern)) {
                                        content = content.replace(oldPattern, newPattern);
                                        hasChanges = true;
                                    }
                                }
                            }
                        }

                        if (hasChanges) {
                            await this.app.vault.modify(noteFile, content);
                        }
                    }

                    showNotice(
                        getTranslation('notices.folderRenamed')
                            .replace('{oldName}', oldBasename)
                            .replace('{newName}', newBasename),
                        NOTICE_DURATIONS.MEDIUM
                    );
                } catch (error) {
                    showNotice(
                        getTranslation('errors.folderRenameError')
                            .replace('{error}', error instanceof Error ? error.message : 'Unknown error'),
                        NOTICE_DURATIONS.ERROR
                    );
                }
            })
        );
    }

    onunload() {
        // Restaurer le ! devant les liens d'images pour tous les fichiers modifiés
        for (const [filePath, _] of this.originalContents) {
            const file = this.app.vault.getAbstractFileByPath(filePath);
            if (file instanceof TFile) {
                this.app.vault.read(file).then(content => {
                    const newContent = content.replace(
                        /(\[\[([^\]]+\.(jpg|jpeg|png|gif|svg|webp)[^\]]*)\]\])|(\[([^\]]*)\]\(([^)]+\.(jpg|jpeg|png|gif|svg|webp)[^)]*)\))/gi,
                        (match: string) => !match.startsWith('!') ? '!' + match : match
                    );
                    
                    if (content !== newContent) {
                        this.app.vault.modify(file, newContent);
                    }
                });
            }
        }

        // Nettoyage des styles et services
        unregisterStyles();
        EventBusService.cleanup();
        FileNameService.cleanup();
        ImagePathService.cleanup();

        // Nettoyage des timeouts
        Object.values(this.timeouts).forEach(timeout => {
            if (timeout) clearTimeout(timeout);
        });

        // Réinitialisation des verrous
        this.processingLock.paste = false;
        this.processingLock.upload = false;
        this.uploadLock.clear();
    }

    async loadSettings() {
        const savedData = await this.loadData();
        this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData);
        
        if (!this.settings.service) {
            this.settings.service = DEFAULT_SETTINGS.service;
        }

        if (this.settings.service === 'cloudflare' && !this.settings.cloudflare) {
            this.settings.cloudflare = DEFAULT_SETTINGS.cloudflare;
        }

        console.log('[MediaFlowz] Paramètres chargés:', {
            service: this.settings.service,
            hasCloudflareConfig: !!this.settings.cloudflare,
            cloudflareAccountId: this.settings.cloudflare?.accountId,
            hasCloudflareToken: !!this.settings.cloudflare?.imagesToken
        });

        this.eventBus.emit(EventName.SETTINGS_UPDATED, { settings: this.settings });
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.eventBus.emit(EventName.SETTINGS_UPDATED, { settings: this.settings });
    }
} 