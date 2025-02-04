import { IMediaUploadService, IUploadResponse, IUploadOptions } from '../types/IMediaUploadService';
import { EventBusService } from './EventBusService';
import { EventName } from '../types/events';
import { IPluginSettings, IBunnyStorageZone } from '../types/settings';
import { requestUrl, RequestUrlParam } from "obsidian";
import { SettingsService } from '../core/SettingsService';

/**
 * Service gérant les interactions avec l'API Bunny.net
 * Permet l'upload et la gestion des médias via le CDN Bunny.net
 */
export class BunnyService implements IMediaUploadService {
    private static instance: BunnyService | null = null;
    private settings: IPluginSettings['bunny'] | undefined;
    private boundHandleSettingsUpdate: (data: { settings: IPluginSettings }) => void;
    private readonly API_BASE_URL = 'https://storage.bunnycdn.com';
    private eventBus: EventBusService;
    private settingsService: SettingsService;

    private constructor() {
        this.boundHandleSettingsUpdate = this.handleSettingsUpdate.bind(this);
        this.eventBus = EventBusService.getInstance();
        this.settingsService = SettingsService.getInstance();
        this.eventBus.on(EventName.SETTINGS_UPDATED, this.boundHandleSettingsUpdate);
        
        const currentSettings = this.settingsService.getSettings();
        if (currentSettings.bunny) {
            this.settings = {
                storageZones: currentSettings.bunny.storageZones || [],
                defaultStorageZone: currentSettings.bunny.defaultStorageZone || '',
                useFolderMapping: currentSettings.bunny.useFolderMapping ?? true
            };
        } else {
            this.settings = {
                storageZones: [],
                defaultStorageZone: '',
                useFolderMapping: true
            };
        }
    }

    public static getInstance(): BunnyService {
        if (!BunnyService.instance) {
            BunnyService.instance = new BunnyService();
        }
        return BunnyService.instance;
    }

    private handleSettingsUpdate({ settings }: { settings: IPluginSettings }): void {
        if (settings.bunny) {
            this.settings = {
                storageZones: settings.bunny.storageZones || [],
                defaultStorageZone: settings.bunny.defaultStorageZone || '',
                useFolderMapping: settings.bunny.useFolderMapping ?? true
            };
            console.log('[BunnyService] Paramètres mis à jour:', {
                hasApiKey: !!this.settings.apiKey,
                storageZonesCount: this.settings.storageZones.length
            });
        }
    }

    /**
     * Détermine la zone de stockage à utiliser en fonction du chemin du fichier
     * @param filePath Chemin du fichier
     * @returns Zone de stockage à utiliser
     */
    private getStorageZoneForPath(filePath: string): IBunnyStorageZone {
        if (!this.settings?.useFolderMapping || !this.settings?.storageZones?.length) {
            return this.getDefaultStorageZone();
        }

        const normalizedPath = filePath.replace(/\\/g, '/');
        
        for (const zone of this.settings.storageZones) {
            if (!zone.folders) continue;
            for (const folder of zone.folders) {
                const normalizedFolder = folder.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
                if (normalizedPath.startsWith(normalizedFolder + '/') || normalizedPath === normalizedFolder) {
                    return zone;
                }
            }
        }

        return this.getDefaultStorageZone();
    }

    /**
     * Retourne la zone de stockage par défaut
     * @returns Zone de stockage par défaut
     * @throws Error si aucune zone de stockage n'est configurée
     */
    private getDefaultStorageZone(): IBunnyStorageZone {
        if (!this.settings?.storageZones?.length) {
            throw new Error('Aucune zone de stockage configurée');
        }

        if (this.settings.defaultStorageZone) {
            const defaultZone = this.settings.storageZones.find(zone => zone.name === this.settings.defaultStorageZone);
            if (defaultZone) {
                return defaultZone;
            }
        }

        return this.settings.storageZones[0];
    }

    private getCDNUrl(path: string, storageZone: IBunnyStorageZone): string {
        // Si un CDN personnalisé est défini pour cette zone, l'utiliser
        if (storageZone.customCDN) {
            console.log('✅ Utilisation du CDN personnalisé:', storageZone.customCDN);
            // Supprimer le slash final du CDN s'il existe
            return storageZone.customCDN.replace(/\/$/, '');
        }
        // Sinon, utiliser l'URL de pull zone par défaut
        console.log('✅ Utilisation du CDN par défaut:', storageZone.pullZoneUrl);
        return storageZone.pullZoneUrl.replace(/\/$/, '');
    }

    public async upload(file: File, options?: IUploadOptions & { path?: string }): Promise<IUploadResponse> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Bunny.net manquante');
        }

        try {
            const storageZone = options?.path 
                ? this.getStorageZoneForPath(options.path)
                : this.getDefaultStorageZone();

            console.log('🗂️ Zone de stockage sélectionnée:', {
                name: storageZone.name,
                pullZoneUrl: storageZone.pullZoneUrl
            });

            const isVideo = this.isVideoFile(file);
            if (isVideo) {
                return await this.uploadVideo(file, storageZone, options);
            } else {
                return await this.uploadImage(file, storageZone, options);
            }
        } catch (error) {
            console.error('❌ Erreur pendant l\'upload:', error);
            throw error;
        }
    }

    private async uploadImage(file: File, storageZone: IBunnyStorageZone, options?: IUploadOptions & { path?: string }): Promise<IUploadResponse> {
        const path = options?.path || `${Date.now()}-${file.name}`;
        const arrayBuffer = await file.arrayBuffer();

        // Upload vers le storage
        const response = await this.makeRequest({
            url: `${this.API_BASE_URL}/${storageZone.name}/${path}`,
            method: 'PUT',
            headers: {
                'AccessKey': storageZone.accessKey,
                'Content-Type': file.type
            },
            body: arrayBuffer
        });

        // Obtenir l'URL CDN appropriée
        const cdnUrl = `${this.getCDNUrl(path, storageZone)}/${path}`;

        return {
            url: cdnUrl,  // Utilise l'URL CDN au lieu de l'URL de storage
            publicId: path,
            metadata: {
                id: path,
                type: 'image',
                path: path,
                storageZone: storageZone.name
            }
        };
    }

    private async uploadVideo(file: File, storageZone: IBunnyStorageZone, options?: IUploadOptions & { path?: string }): Promise<IUploadResponse> {
        const path = options?.path || `videos/${Date.now()}-${file.name}`;
        const arrayBuffer = await file.arrayBuffer();

        const response = await this.makeRequest({
            url: `${this.API_BASE_URL}/${storageZone.name}/${path}`,
            method: 'PUT',
            headers: {
                'AccessKey': storageZone.accessKey,
                'Content-Type': file.type
            },
            body: arrayBuffer
        });

        const cdnUrl = `${this.getCDNUrl(path, storageZone)}/${path}`;

        return {
            url: cdnUrl,
            publicId: path,
            metadata: {
                id: path,
                type: 'video',
                path: path,
                storageZone: storageZone.name
            }
        };
    }

    async delete(publicId: string): Promise<void> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Bunny manquante');
        }

        const zone = this.getCurrentStorageZone();
        if (!zone) {
            throw new Error('Aucune zone de stockage configurée');
        }

        try {
            const response = await fetch(`https://storage.bunnycdn.com/${zone.name}/${publicId}`, {
                method: 'DELETE',
                headers: {
                    'AccessKey': zone.accessKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Erreur ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            throw new Error(`Erreur de suppression Bunny: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
    }

    getUrl(publicId: string): string {
        if (!this.isConfigured()) {
            throw new Error('Configuration Bunny.net manquante');
        }

        // Vérifier d'abord s'il y a un CDN personnalisé pour ce chemin
        const customCDN = this.getCustomCDNForPath(publicId);
        if (customCDN) {
            return `${customCDN}/${publicId}`;
        }

        // Sinon, utiliser la zone de stockage
        const storageZone = this.settings!.storageZones.find(zone => 
            publicId.includes(zone.pullZoneUrl.replace(/^https?:\/\//, ''))
        ) || this.getDefaultStorageZone();

        return `${storageZone.pullZoneUrl}/${publicId}`;
    }

    private async makeRequest(options: RequestUrlParam): Promise<any> {
        try {
            const response = await requestUrl(options);
            return response.json;
        } catch (error) {
            console.error('❌ Erreur de réponse API:', error);
            throw error;
        }
    }

    private isVideoFile(file: File): boolean {
        return file.type.startsWith('video/');
    }

    public isConfigured(): boolean {
        return !!(this.settings?.storageZones?.length > 0 && 
                 this.settings.storageZones.every(zone => zone.accessKey && zone.name));
    }

    public static cleanup(): void {
        if (BunnyService.instance) {
            const eventBus = EventBusService.getInstance();
            eventBus.off(EventName.SETTINGS_UPDATED, BunnyService.instance.boundHandleSettingsUpdate);
            BunnyService.instance = null as unknown as BunnyService;
        }
    }
}
