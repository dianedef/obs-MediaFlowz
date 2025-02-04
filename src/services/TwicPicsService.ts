import { ITwicPicsSettings } from '@/types/settings';
import { EventBusService } from '@/services/EventBusService';
import { EventName, EventMap } from '@/types/events';
import { createFetch, $Fetch, CreateFetchOptions } from 'ofetch';
import { IMediaUploadService, IUploadResponse, IUploadOptions, RequestError, ResponseError } from '@/types/IMediaUploadService';

export class TwicPicsService implements IMediaUploadService {
    private static instance: TwicPicsService | null = null;
    private settings?: ITwicPicsSettings;
    private twicFetch?: $Fetch;
    private boundHandleSettingsUpdate: (settings: any) => void;
    private boundHandleMediaUpload: (data: EventMap[EventName.MEDIA_PASTED]) => void;

    private constructor() {
        this.boundHandleSettingsUpdate = this.handleSettingsUpdate.bind(this);
        this.boundHandleMediaUpload = this.handleMediaUpload.bind(this);
        this.initializeEventListeners();
    }

    static getInstance(): TwicPicsService {
        if (!TwicPicsService.instance) {
            TwicPicsService.instance = new TwicPicsService();
        }
        return TwicPicsService.instance;
    }

    private initializeEventListeners(): void {
        const eventBus = EventBusService.getInstance();
        eventBus.on(EventName.SETTINGS_UPDATED, this.boundHandleSettingsUpdate);
        eventBus.on(EventName.MEDIA_PASTED, this.boundHandleMediaUpload);
    }

    private handleSettingsUpdate(settings: any): void {
        this.settings = settings.twicpics;
        this.setupTwicFetch();
    }

    private async handleMediaUpload({ files }: EventMap[EventName.MEDIA_PASTED]): Promise<void> {
        if (!files.length) return;
        
        try {
            const file = files[0];
            const response = await this.upload(file);
            EventBusService.getInstance().emit(EventName.MEDIA_UPLOADED, {
                url: response.url,
                fileName: file.name
            });
        } catch (error) {
            EventBusService.getInstance().emit(EventName.MEDIA_UPLOAD_ERROR, {
                error: error instanceof Error ? error : new Error('Unknown error'),
                fileName: files[0].name
            });
        }
    }

    private setupTwicFetch(): void {
        if (!this.settings) return;

        const options = {
            baseUrl: `https://${this.settings.domain}/v1`,
            retry: 2,
            retryDelay: 1000,
            timeout: 30000,
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.settings.apiKey}`
            }
        };

        this.twicFetch = createFetch(options);
    }

    private isVideoFile(file: File): boolean {
        return file.type.startsWith('video/');
    }

    async upload(file: File, options?: IUploadOptions): Promise<IUploadResponse> {
        if (!this.isConfigured() || !this.twicFetch) {
            this.setupTwicFetch();
            if (!this.twicFetch) {
                throw new Error('TwicPics n\'est pas configuré');
            }
        }

        const isVideo = this.isVideoFile(file);

        try {
            const formData = new FormData();
            formData.append('media', file);
            
            if (options?.folder) {
                formData.append('path', options.folder);
            }

            const response = await this.twicFetch<{
                path: string;
                metadata?: {
                    width?: number;
                    height?: number;
                    format?: string;
                    duration?: number;
                };
            }>('/upload', {
                method: 'POST',
                body: formData
            });
            
            return {
                url: `https://${this.settings!.domain}/${response.path}`,
                publicId: response.path,
                width: response.metadata?.width,
                height: response.metadata?.height,
                format: response.metadata?.format,
                metadata: {
                    ...response.metadata,
                    type: isVideo ? 'video' : 'image'
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
        if (!this.isConfigured() || !this.twicFetch) {
            this.setupTwicFetch();
            if (!this.twicFetch) {
                throw new Error('TwicPics n\'est pas configuré');
            }
        }

        try {
            await this.twicFetch(`/remove/${publicId}`, {
                method: 'DELETE'
            });
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Erreur de suppression: ${error.message}`);
            }
            throw error;
        }
    }

    getUrl(publicId: string, transformation?: string): string {
        if (!this.settings?.domain) {
            throw new Error('Domaine TwicPics non configuré');
        }
        
        const baseUrl = `https://${this.settings.domain}`;
        if (!transformation) {
            return `${baseUrl}/${publicId}`;
        }
        
        return `${baseUrl}/${transformation}/${publicId}`;
    }

    isConfigured(): boolean {
        return !!(this.settings?.domain && this.settings?.apiKey);
    }

    public static cleanup(): void {
        if (TwicPicsService.instance) {
            const eventBus = EventBusService.getInstance();
            eventBus.off(EventName.SETTINGS_UPDATED, TwicPicsService.instance.boundHandleSettingsUpdate);
            eventBus.off(EventName.MEDIA_PASTED, TwicPicsService.instance.boundHandleMediaUpload);
            TwicPicsService.instance = null;
        }
    }
} 