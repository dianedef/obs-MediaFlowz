import { Editor, App } from 'obsidian';
import { EventBusService } from './EventBusService';
import { EventName } from '../types/events';

/**
 * Service de gestion de l'édition dans Obsidian.
 * Gère l'insertion de médias dans l'éditeur et le formatage Markdown.
 * Implémente le pattern Singleton.
 * 
 * @example
 * const editorService = EditorService.getInstance();
 */
export class EditorService {
    private static instance: EditorService;
    private eventBus: EventBusService;
    private app: App;

    private constructor() {
        this.eventBus = EventBusService.getInstance();
        this.app = (window as any).app;
    }

    /**
     * Retourne l'instance unique du service.
     * Crée l'instance si elle n'existe pas encore.
     * 
     * @returns {EditorService} L'instance unique du service
     */
    static getInstance(): EditorService {
        if (!EditorService.instance) {
            EditorService.instance = new EditorService();
        }
        return EditorService.instance;
    }

    /**
     * Configure les écouteurs d'événements pour le service.
     * Réagit aux uploads de médias pour les insérer dans l'éditeur.
     * 
     * @private
     */
    private setupEventListeners(): void {
        // Écouter les uploads réussis pour insérer le média
        this.eventBus.on(EventName.MEDIA_UPLOADED, ({ url, fileName }) => {
            // Récupérer l'éditeur actif
            const activeLeaf = this.app.workspace.activeLeaf;
            if (!activeLeaf?.view?.editor) return;

            const editor = activeLeaf.view.editor;
            this.eventBus.emit(EventName.EDITOR_INSERT_MEDIA, {
                editor,
                url,
                fileName
            });
        });

        // Gérer l'insertion du média
        this.eventBus.on(EventName.EDITOR_INSERT_MEDIA, ({ editor, url, fileName }) => {
            this.insertMedia(editor, url, fileName);
            this.eventBus.emit(EventName.EDITOR_MEDIA_INSERTED, {
                editor,
                fileName
            });
        });
    }

    /**
     * Insère un média dans l'éditeur à la position du curseur.
     * Gère intelligemment les espaces autour du média selon la position.
     * 
     * @param {Editor} editor - L'éditeur Obsidian
     * @param {string} url - L'URL du média à insérer
     * @param {string} fileName - Le nom du fichier pour l'alt text
     * @fires EventName.EDITOR_MEDIA_INSERTED
     */
    public insertMedia(editor: Editor, url: string, fileName: string): void {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        
        // Déterminer si nous sommes au début d'une ligne
        const isStartOfLine = cursor.ch === 0;
        // Déterminer si nous sommes à la fin d'une ligne
        const isEndOfLine = cursor.ch === line.length;
        
        // Construire le markdown
        const markdownLink = this.createMarkdownLink(url, fileName);
        
        // Ajouter des espaces si nécessaire
        let textToInsert = markdownLink;
        if (!isStartOfLine && !isEndOfLine) {
            textToInsert = ` ${markdownLink} `;
        } else if (!isStartOfLine) {
            textToInsert = ` ${markdownLink}`;
        } else if (!isEndOfLine) {
            textToInsert = `${markdownLink} `;
        }

        // Insérer le texte
        editor.replaceRange(textToInsert, cursor);
        
        // Mettre à jour la position du curseur
        const newPosition = {
            line: cursor.line,
            ch: cursor.ch + textToInsert.length
        };
        editor.setCursor(newPosition);
    }

    /**
     * Crée le lien Markdown approprié selon le type de média.
     * Utilise la syntaxe image pour les images et HTML pour les vidéos.
     * 
     * @param {string} url - L'URL du média
     * @param {string} fileName - Le nom du fichier pour l'alt text
     * @returns {string} Le lien Markdown formaté
     * @private
     */
    private createMarkdownLink(url: string, fileName: string): string {
        // Déterminer si c'est une image ou une vidéo
        const isVideo = url.match(/\.(mp4|webm|ogg)$/i);
        
        if (isVideo) {
            return `<video src="${url}" controls title="${fileName}"></video>`;
        } else {
            return `![${fileName}](${url})`;
        }
    }

    /**
     * Nettoie l'instance du service.
     * 
     * @private
     */
    public static cleanup(): void {
        if (EditorService.instance) {
            EditorService.instance = null as unknown as EditorService;
        }
    }
} 