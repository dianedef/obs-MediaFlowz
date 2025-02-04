import { MediaServiceFactory } from './MediaServiceFactory';
import { IMediaUploadService, IUploadResponse, IUploadOptions } from '../types/IMediaUploadService';
import { EventBusService } from './EventBusService';
import { EventName, EventCallback } from '../types/events';
import { IPluginSettings } from '../types/settings';
import { SettingsService } from '../core/SettingsService';
import { PicGoService } from './PicGoService';
import { requestUrl, RequestUrlParam } from "obsidian";

interface ICloudflareSettings {
    accountId: string;
    imagesToken: string;
    customDomain?: string;
    defaultVariant?: string;
    deliveryHash?: string;
}

/**
 * Service gérant les interactions avec l'API Cloudflare Images et Stream.
 * Permet l'upload et la gestion des médias via le CDN Cloudflare.
 */
export class CloudflareMediaService implements IMediaUploadService {
    private static instance: CloudflareMediaService | null = null;
    private settings: ICloudflareSettings | undefined;
    private boundHandleSettingsUpdate: (data: { settings: IPluginSettings }) => void;
    private picgo?: PicGoService;
    private isProcessingSettings = false;
    private isProcessingUpload = false;
    private lastUploadTime = 0;
    private readonly UPLOAD_COOLDOWN = 100; // ms
    private eventBus: EventBusService;
    private settingsService: SettingsService;

    private constructor() {
        this.boundHandleSettingsUpdate = this.handleSettingsUpdate.bind(this);
        this.eventBus = EventBusService.getInstance();
        this.settingsService = SettingsService.getInstance();
        this.eventBus.on(EventName.SETTINGS_UPDATED, this.boundHandleSettingsUpdate);
        
        // Initialiser les paramètres au démarrage
        const currentSettings = this.settingsService.getSettings();
        if (currentSettings.cloudflare) {
            this.settings = currentSettings.cloudflare;
        }
    }

    /**
     * Retourne l'instance unique du service (Singleton)
     * @returns {CloudflareMediaService} L'instance du service
     */
    public static getInstance(): CloudflareMediaService {
        if (!CloudflareMediaService.instance) {
            CloudflareMediaService.instance = new CloudflareMediaService();
        }
        return CloudflareMediaService.instance;
    }

    /**
     * Gère la mise à jour des paramètres du service
     * @param {Object} data - Les données de mise à jour
     * @param {IPluginSettings} data.settings - Les nouveaux paramètres
     * @private
     */
    private handleSettingsUpdate({ settings }: { settings: IPluginSettings }): void {
        if (settings.cloudflare) {
            this.settings = settings.cloudflare;
            console.log('[CloudflareMediaService] Paramètres mis à jour:', {
                hasAccountId: !!this.settings.accountId,
                hasToken: !!this.settings.imagesToken
            });
        }
    }

    /**
     * Configure le service PicGo avec les paramètres actuels
     * @private
     */
    private setupPicGo(): void {
        if (!this.settings) return;

        this.picgo = new PicGoService({
            accountId: this.settings.accountId,
            token: this.settings.imagesToken,
            customDomain: this.settings.customDomain
        });
    }

    /**
     * Upload un fichier vers Cloudflare Images ou Stream
     * @param {File} file - Le fichier à uploader
     * @param {IUploadOptions} [options] - Options d'upload optionnelles
     * @returns {Promise<IUploadResponse>} Réponse de l'upload
     */
    public async upload(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudflare manquante');
        }

        const isVideo = this.isVideoFile(file);

        if (isVideo && !this.settings?.imagesToken) {
            throw new Error('Configuration Cloudflare Stream manquante pour les vidéos');
        }

        if (!isVideo && !this.settings?.imagesToken) {
            throw new Error('Configuration Cloudflare Images manquante pour les images');
        }

        try {
            if (isVideo) {
                return await this.uploadVideo(file, options);
            } else {
                return await this.uploadImage(file, options);
            }
        } catch (error) {
            console.error('❌ Erreur pendant l\'upload:', error);
            if (error instanceof Error) {
                throw new Error(`Erreur d'upload: ${error.message}`);
            }
            throw error;
        }
    }

    /**
     * Formate l'URL d'une image avec les paramètres de variant
     * @param {string} baseUrl - URL de base de l'image
     * @param {string} [variant] - Variant de l'image (ex: public, thumbnail)
     * @returns {string} URL formatée
     * @private
     */
    private formatImageUrl(baseUrl: string, variant?: string): string {
        if (!this.settings?.accountId || !this.settings?.deliveryHash) {
            throw new Error('Configuration Cloudflare incomplète : le hash de livraison est manquant');
        }

        const imageId = baseUrl.split('/').pop() || '';
        const selectedVariant = variant || this.settings?.defaultVariant || 'public';
        
        if (this.settings?.customDomain) {
            return `https://${this.settings.customDomain}/${imageId}/${selectedVariant}`;
        }

        return `https://imagedelivery.net/${this.settings.deliveryHash}/${imageId}/${selectedVariant}`;
    }

    /**
     * Vérifie si un fichier est une vidéo
     * @param {File} file - Le fichier à vérifier
     * @returns {boolean} true si c'est une vidéo
     * @private
     */
    private isVideoFile(file: File): boolean {
        return file.type.startsWith('video/');
    }

    /**
     * Effectue une requête vers l'API Cloudflare
     * @param {RequestUrlParam} options - Options de la requête
     * @returns {Promise<any>} Réponse de l'API
     * @private
     */
    private async makeRequest(options: RequestUrlParam): Promise<any> {
        try {
            const response = await requestUrl(options);
            return response.json;
        } catch (error) {
            if (error.response) {
                console.error('❌ Erreur de réponse API:', await error.response.json());
            }
            throw error;
        }
    }

    /**
     * Upload une image vers Cloudflare Images
     * @param {File} file - L'image à uploader
     * @param {IUploadOptions} [options] - Options d'upload
     * @returns {Promise<IUploadResponse>} Réponse de l'upload
     * @private
     */
    private async uploadImage(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        if (!this.settings?.accountId || !this.settings?.imagesToken) {
            throw new Error('Configuration Cloudflare manquante');
        }

        try {
            const boundary = '----CloudflareFormBoundary' + Math.random().toString(36).substring(2);
            const arrayBuffer = await file.arrayBuffer();
            const encoder = new TextEncoder();
            const start = encoder.encode(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="file"; filename="${file.name}"\r\n` +
                `Content-Type: ${file.type}\r\n\r\n`
            );
            const end = encoder.encode(`\r\n--${boundary}--\r\n`);
            const body = new Uint8Array(start.length + arrayBuffer.byteLength + end.length);
            body.set(start, 0);
            body.set(new Uint8Array(arrayBuffer), start.length);
            body.set(end, start.length + arrayBuffer.byteLength);

            const response = await this.makeRequest({
                url: `https://api.cloudflare.com/client/v4/accounts/${this.settings.accountId}/images/v1`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.settings.imagesToken}`,
                    'Content-Type': `multipart/form-data; boundary=${boundary}`
                },
                body: body.buffer
            });

            if (!response?.success || !response?.result?.id) {
                throw new Error(`Réponse invalide de Cloudflare Images: ${JSON.stringify(response)}`);
            }

            const imageId = response.result.id;
            const imageUrl = this.formatImageUrl(`https://imagedelivery.net/${this.settings.accountId}/${imageId}`);

            return {
                url: imageUrl,
                publicId: imageId,
                metadata: {
                    id: imageId,
                    type: 'image'
                }
            };
        } catch (error) {
            console.error('❌ Erreur détaillée:', error);
            throw error;
        }
    }

    /**
     * Upload une vidéo vers Cloudflare Stream
     * @param {File} file - La vidéo à uploader
     * @param {IUploadOptions} [options] - Options d'upload
     * @returns {Promise<IUploadResponse>} Réponse de l'upload
     * @private
     */
    private async uploadVideo(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        if (!this.settings?.accountId || !this.settings?.imagesToken) {
            throw new Error('Configuration Cloudflare manquante');
        }

        try {
            const arrayBuffer = await file.arrayBuffer();

            const response = await this.makeRequest({
                url: `https://api.cloudflare.com/client/v4/accounts/${this.settings.accountId}/stream`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.settings.imagesToken}`
                },
                body: arrayBuffer
            });

            if (!response?.success || !response?.result?.uid) {
                throw new Error('Réponse invalide de Cloudflare Stream');
            }

            const videoId = response.result.uid;
            const videoUrl = `https://customer-${this.settings.accountId}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;

            return {
                url: videoUrl,
                publicId: videoId,
                metadata: {
                    id: videoId,
                    type: 'video',
                    playback: response.result.playback
                }
            };
        } catch (error) {
            console.error('❌ Erreur détaillée:', error);
            throw error;
        }
    }

    /**
     * Supprime un média de Cloudflare
     * @param {string} publicId - L'identifiant public du média
     * @returns {Promise<void>}
     */
    async delete(publicId: string): Promise<void> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudflare manquante');
        }

        const isVideo = publicId.includes('stream-');
        const url = isVideo 
            ? `https://api.cloudflare.com/client/v4/accounts/${this.settings!.accountId}/stream/${publicId}`
            : `https://api.cloudflare.com/client/v4/accounts/${this.settings!.accountId}/images/v1/${publicId}`;

        try {
            const response = await this.makeRequest({
                url,
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.settings!.imagesToken}`,
                    'Accept': 'application/json'
                }
            });

            if (!response?.success) {
                throw new Error(`Erreur de suppression: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Erreur de suppression: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
        }
    }

    /**
     * Récupère l'URL d'un média
     * @param {string} publicId - L'identifiant public du média
     * @param {string} [variant] - Le variant pour les images
     * @returns {string} L'URL du média
     */
    getUrl(publicId: string, variant?: string): string {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudflare manquante');
        }

        const isVideo = publicId.includes('stream-');

        if (isVideo) {
            return `https://customer-${this.settings!.accountId}.cloudflarestream.com/${publicId}/manifest/video.m3u8`;
        } else {
            const baseUrl = `https://imagedelivery.net/${this.settings!.accountId}/${publicId}`;
            return this.formatImageUrl(baseUrl, variant);
        }
    }

    /**
     * Vérifie si le service est correctement configuré
     * @returns {boolean} true si le service est configuré
     */
    public isConfigured(): boolean {
        return !!(this.settings?.accountId && this.settings?.imagesToken);
    }

    /**
     * Nettoie les ressources du service
     */
    public static cleanup(): void {
        if (CloudflareMediaService.instance) {
            const eventBus = EventBusService.getInstance();
            eventBus.off(EventName.SETTINGS_UPDATED, CloudflareMediaService.instance.boundHandleSettingsUpdate);
            CloudflareMediaService.instance = null as unknown as CloudflareMediaService;
        }
    }
} 