import { App } from 'obsidian';
import { IPluginSettings } from '@/types/settings';
import { IMediaUploadService } from '@/types/IMediaUploadService';
import { CloudflareMediaService } from '@/services/CloudflareMediaService';
import { LocalMediaService } from '@/services/LocalMediaService';
import { BunnyService } from '@/services/BunnyService';
import { CloudinaryService } from '@/services/CloudinaryService';

export class MediaServiceFactory {
    private static app: App | null = null;

    public static initialize(app: App): void {
        MediaServiceFactory.app = app;
    }

    public static getService(settings: IPluginSettings, forceLocal: boolean = false): IMediaUploadService {
        if (!MediaServiceFactory.app) {
            throw new Error('MediaServiceFactory non initialisé');
        }

        if (forceLocal || settings.service === 'local') {
            return LocalMediaService.getInstance(MediaServiceFactory.app);
        }

        switch (settings.service) {
            case 'cloudinary':
                if (!settings.cloudinary?.cloudName || !settings.cloudinary?.apiKey || 
                    (!settings.cloudinary?.apiSecret && !settings.cloudinary?.uploadPreset)) {
                    console.warn('⚠️ Configuration Cloudinary incomplète, utilisation du service local');
                    return LocalMediaService.getInstance(MediaServiceFactory.app);
                }
                return CloudinaryService.getInstance();

            case 'cloudflare':
                if (!settings.cloudflare?.accountId || !settings.cloudflare?.imagesToken) {
                    console.warn('⚠️ Configuration Cloudflare incomplète, utilisation du service local');
                    return LocalMediaService.getInstance(MediaServiceFactory.app);
                }
                return CloudflareMediaService.getInstance();
            
            case 'bunny':
                if (!settings.bunny?.storageZones?.length || !settings.bunny.storageZones.every(zone => zone.accessKey && zone.name)) {
                    console.warn('⚠️ Configuration Bunny incomplète, utilisation du service local');
                    return LocalMediaService.getInstance(MediaServiceFactory.app);
                }
                return BunnyService.getInstance();
            
            default:
                console.warn(`⚠️ Service inconnu: ${settings.service}, utilisation du service local`);
                return LocalMediaService.getInstance(MediaServiceFactory.app);
        }
    }

    public static cleanup(): void {
        MediaServiceFactory.app = null;
        LocalMediaService.cleanup();
        CloudflareMediaService.cleanup();
        BunnyService.cleanup();
        CloudinaryService.cleanup();
    }
} 