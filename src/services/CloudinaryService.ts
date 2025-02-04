import { IPluginSettings } from '@/types/settings';
import { EventBusService } from '@/services/EventBusService';
import { EventName } from '@/types/events';
import { IMediaUploadService, IUploadResponse, IUploadOptions } from '@/types/IMediaUploadService';
import { SettingsService } from '@/core/SettingsService';
import { createFetch, $Fetch, CreateFetchOptions } from 'ofetch';

interface ICloudinarySettings {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
    uploadPreset?: string;
    folder?: string;
}

export class CloudinaryService implements IMediaUploadService {
    private static instance: CloudinaryService | null = null;
    private settings?: ICloudinarySettings;
    private cloudinaryFetch?: $Fetch;
    private boundHandleSettingsUpdate: (data: { settings: IPluginSettings }) => void;
    private boundHandleMediaUpload: (data: { files: FileList | File[] }) => void;
    private eventBus: EventBusService;
    private settingsService: SettingsService;

    private constructor() {
        this.boundHandleSettingsUpdate = this.handleSettingsUpdate.bind(this);
        this.boundHandleMediaUpload = this.handleMediaUpload.bind(this);
        this.eventBus = EventBusService.getInstance();
        this.settingsService = SettingsService.getInstance();
        
        // Initialiser les paramètres au démarrage
        const currentSettings = this.settingsService.getSettings();
        if (currentSettings.cloudinary) {
            this.settings = currentSettings.cloudinary;
            this.setupCloudinaryFetch();
        }
        
        this.initializeEventListeners();
    }

    public static getInstance(): CloudinaryService {
        if (!CloudinaryService.instance) {
            CloudinaryService.instance = new CloudinaryService();
        }
        return CloudinaryService.instance;
    }

    private initializeEventListeners(): void {
        const eventBus = EventBusService.getInstance();
        eventBus.on(EventName.SETTINGS_UPDATED, this.boundHandleSettingsUpdate);
        eventBus.on(EventName.MEDIA_PASTED, this.boundHandleMediaUpload);
    }

    private handleSettingsUpdate(data: { settings: IPluginSettings }): void {
        this.settings = data.settings.cloudinary;
        this.setupCloudinaryFetch();
    }

    private async handleMediaUpload(data: { files: FileList | File[] }): void {
        try {
            const response = await this.upload(data.files[0]);
            EventBusService.getInstance().emit(EventName.MEDIA_UPLOADED, {
                url: response.url,
                fileName: data.files[0].name
            });
        } catch (error) {
            EventBusService.getInstance().emit(EventName.MEDIA_UPLOAD_ERROR, {
                error: error instanceof Error ? error : new Error('Unknown error'),
                fileName: data.files[0].name
            });
        }
    }

    private setupCloudinaryFetch(): void {
        if (!this.settings) return;

        const options: CreateFetchOptions = {
            baseURL: `https://api.cloudinary.com/v1_1/${this.settings.cloudName}`,
            retry: 2,
            retryDelay: 1000,
            timeout: 30000,
            headers: {
                'Accept': 'application/json',
            },
            async onRequest({ options }) {
                const opts = options as { body?: FormData };
                if (opts.body instanceof FormData) {
                    opts.body.append('timestamp', String(Math.round(Date.now() / 1000)));
                    opts.body.append('api_key', this.settings!.apiKey);
                }
            },
            async onRequestError({ error }) {
                const err = error as Error;
                throw new Error(`Erreur réseau: ${err.message}`);
            },
            async onResponse({ response }) {
                const data = response._data as { secure_url?: string, resource_type?: string };
                if (!data.secure_url) {
                    throw new Error('Format de réponse invalide');
                }
            },
            async onResponseError({ response }) {
                const data = response._data as { error?: { message: string } };
                throw new Error(`Upload échoué: ${data.error?.message || 'Erreur inconnue'}`);
            }
        };

        this.cloudinaryFetch = createFetch(options);
    }

    private isVideoFile(file: File): boolean {
        return file.type.startsWith('video/');
    }

    async upload(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudinary manquante');
        }

        if (!this.cloudinaryFetch) {
            this.setupCloudinaryFetch();
        }

        const isVideo = this.isVideoFile(file);
        const resourceType = isVideo ? 'video' : 'image';

        try {
            const formData = new FormData();
            formData.append('file', file);
            
            if (this.settings!.uploadPreset) {
                formData.append('upload_preset', this.settings!.uploadPreset);
            } else {
                const signature = await this.generateSignature(formData, this.settings!.apiSecret);
                formData.append('signature', signature);
            }

            // Ajouter les options de transformation si présentes
            if (options?.transformation) {
                formData.append('transformation', options.transformation);
            }

            if (options?.folder) {
                formData.append('folder', options.folder);
            }

            if (options?.tags) {
                formData.append('tags', options.tags.join(','));
            }

            const response = await this.cloudinaryFetch<{
                secure_url: string;
                public_id: string;
                resource_type: string;
                width?: number;
                height?: number;
                format?: string;
                duration?: number;
            }>(`/${resourceType}/upload`, {
                method: 'POST',
                body: formData
            });

            return {
                url: response.secure_url,
                publicId: response.public_id,
                width: response.width,
                height: response.height,
                format: response.format,
                metadata: {
                    type: resourceType,
                    duration: response.duration
                }
            };
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Erreur d\'upload inconnue');
        }
    }

    async delete(publicId: string): Promise<void> {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudinary manquante');
        }

        if (!this.cloudinaryFetch) {
            this.setupCloudinaryFetch();
        }

        try {
            // Déterminer le type de ressource (image ou vidéo) à partir du publicId
            const resourceType = publicId.startsWith('video/') ? 'video' : 'image';

            const formData = new FormData();
            formData.append('public_id', publicId);
            
            if (this.settings!.uploadPreset) {
                formData.append('upload_preset', this.settings!.uploadPreset);
            } else {
                const signature = await this.generateSignature(formData, this.settings!.apiSecret);
                formData.append('signature', signature);
            }

            const response = await this.cloudinaryFetch<{
                result: string;
            }>(`/${resourceType}/destroy`, {
                method: 'POST',
                body: formData
            });

            if (response.result !== 'ok') {
                throw new Error(`Erreur lors de la suppression: ${response.result}`);
            }
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Erreur de suppression: ${error.message}`);
            }
            throw new Error('Erreur de suppression inconnue');
        }
    }

    getUrl(publicId: string, transformation?: string): string {
        if (!this.isConfigured()) {
            throw new Error('Configuration Cloudinary manquante');
        }

        const baseUrl = `https://res.cloudinary.com/${this.settings!.cloudName}`;
        if (!transformation) {
            return `${baseUrl}/image/upload/${publicId}`;
        }

        return `${baseUrl}/image/upload/${transformation}/${publicId}`;
    }

    private async generateSignature(formData: FormData, apiSecret: string): Promise<string> {
        const params = new Map<string, string>();
        formData.forEach((value, key) => {
            if (typeof value === 'string') {
                params.set(key, value);
            }
        });

        const sortedParams = Array.from(params.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('&');

        const encoder = new TextEncoder();
        const data = encoder.encode(sortedParams + apiSecret);
        const hashBuffer = await crypto.subtle.digest('SHA-1', data);
        
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    isConfigured(): boolean {
        return !!(
            this.settings?.cloudName && 
            this.settings?.apiKey && 
            (this.settings?.apiSecret || this.settings?.uploadPreset)
        );
    }

    public static cleanup(): void {
        if (CloudinaryService.instance) {
            const eventBus = EventBusService.getInstance();
            eventBus.off(EventName.SETTINGS_UPDATED, CloudinaryService.instance.boundHandleSettingsUpdate);
            eventBus.off(EventName.MEDIA_PASTED, CloudinaryService.instance.boundHandleMediaUpload);
            CloudinaryService.instance = undefined;
        }
    }
} 