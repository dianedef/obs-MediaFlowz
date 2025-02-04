import { App, Plugin } from 'obsidian';
import { MediaLinkInfo, MediaLinkType } from '@/types/media';
import { EventBusService } from './EventBusService';
import { EventName } from '@/types/events';

/**
 * Service de gestion des informations des médias
 */
export class MediaInfoService {
    private static instance: MediaInfoService | null = null;
    private mediaCache: Map<string, MediaLinkInfo>;
    private eventBus: EventBusService;
    private plugin: Plugin | null = null;

    private constructor(private app: App) {
        this.mediaCache = new Map();
        this.eventBus = EventBusService.getInstance();
        
        // Écouter les événements pertinents
        this.eventBus.on(EventName.MEDIA_UPLOADED, this.handleMediaUploaded.bind(this));
        this.eventBus.on(EventName.MEDIA_DELETED, this.handleMediaDeleted.bind(this));
    }

    public static getInstance(app: App): MediaInfoService {
        if (!MediaInfoService.instance) {
            MediaInfoService.instance = new MediaInfoService(app);
        }
        return MediaInfoService.instance;
    }

    public setPlugin(plugin: Plugin): void {
        this.plugin = plugin;
    }

    public getPlugin(): Plugin | null {
        return this.plugin;
    }

    /**
     * Ajoute ou met à jour les informations d'un média
     */
    public setMediaInfo(mediaInfo: MediaLinkInfo): void {
        this.mediaCache.set(mediaInfo.originalUrl, mediaInfo);
        this.saveCache();
    }

    /**
     * Récupère les informations d'un média
     */
    public getMediaInfo(url: string): MediaLinkInfo | undefined {
        return this.mediaCache.get(url);
    }

    /**
     * Supprime les informations d'un média
     */
    public removeMediaInfo(url: string): void {
        this.mediaCache.delete(url);
        this.saveCache();
    }

    /**
     * Vérifie si un média est dans le cache
     */
    public hasMediaInfo(url: string): boolean {
        return this.mediaCache.has(url);
    }

    /**
     * Charge le cache depuis le stockage
     */
    public async loadCache(): Promise<void> {
        try {
            if (!this.plugin) {
                console.warn('Plugin non initialisé, impossible de charger le cache');
                return;
            }
            const data = await this.plugin.loadData();
            if (data?.mediaCache) {
                this.mediaCache = new Map(Object.entries(data.mediaCache));
                console.log('📦 Cache chargé:', this.mediaCache.size, 'entrées');
            }
        } catch (error) {
            console.error('❌ Erreur lors du chargement du cache:', error);
        }
    }

    /**
     * Sauvegarde le cache dans le stockage
     */
    private async saveCache(): Promise<void> {
        try {
            if (!this.plugin) {
                console.warn('Plugin non initialisé, impossible de sauvegarder le cache');
                return;
            }
            const data = {
                mediaCache: Object.fromEntries(this.mediaCache)
            };
            await this.plugin.saveData(data);
            console.log('💾 Cache sauvegardé:', this.mediaCache.size, 'entrées');
        } catch (error) {
            console.error('❌ Erreur lors de la sauvegarde du cache:', error);
        }
    }

    /**
     * Gère l'événement d'upload de média
     */
    private handleMediaUploaded(data: { url: string, fileName: string, metadata?: any }): void {
        const mediaInfo: MediaLinkInfo = {
            originalUrl: data.url,
            resolvedUrl: data.url,
            type: this.detectMediaType(data.url),
            altText: data.fileName,
            serviceMetadata: data.metadata
        };
        this.setMediaInfo(mediaInfo);
        console.log('📤 Média uploadé:', mediaInfo);
    }

    /**
     * Gère l'événement de suppression de média
     */
    private handleMediaDeleted(data: { publicId: string }): void {
        this.removeMediaInfo(data.publicId);
        console.log('🗑️ Média supprimé:', data.publicId);
    }

    /**
     * Détecte le type de média à partir de l'URL
     */
    private detectMediaType(url: string): MediaLinkType {
        if (url.startsWith('http')) {
            if (url.includes('cloudinary.com')) return MediaLinkType.CLOUDINARY;
            if (url.includes('bunny.net') || url.includes('b-cdn.net')) return MediaLinkType.BUNNY;
            if (url.includes('cloudflare')) return MediaLinkType.CLOUDFLARE;
            if (url.includes('twicpics.com')) return MediaLinkType.TWICPICS;
            return MediaLinkType.EXTERNAL;
        }
        if (url.startsWith('[[') || url.endsWith(']]')) return MediaLinkType.WIKI;
        return MediaLinkType.LOCAL;
    }

    /**
     * Nettoie le service
     */
    public static cleanup(): void {
        if (MediaInfoService.instance) {
            const eventBus = EventBusService.getInstance();
            eventBus.off(EventName.MEDIA_UPLOADED, MediaInfoService.instance.handleMediaUploaded);
            eventBus.off(EventName.MEDIA_DELETED, MediaInfoService.instance.handleMediaDeleted);
            MediaInfoService.instance = null;
        }
    }
} 