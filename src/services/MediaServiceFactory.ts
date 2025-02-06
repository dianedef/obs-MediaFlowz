import { App } from 'obsidian';
import { IPluginSettings, SupportedService } from '@/types/settings';
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

        const isServiceConfigured = (): boolean => {
            switch (settings.service) {
                case 'cloudinary':
                    return !!(settings.cloudinary?.cloudName && settings.cloudinary?.apiKey && 
                        (settings.cloudinary?.apiSecret || settings.cloudinary?.uploadPreset));
                case 'cloudflare':
                    return !!(settings.cloudflare?.accountId && settings.cloudflare?.imagesToken);
                case 'bunny':
                    return !!(settings.bunny?.storageZones?.length && 
                        settings.bunny.storageZones.every(zone => zone.accessKey && zone.name));
                default:
                    return false;
            }
        };

        if (!isServiceConfigured()) {
            if (settings.service in SupportedService) {
                console.warn(`⚠️ Configuration ${settings.service} incomplète, utilisation du service local`);
            } else {
                console.warn(`⚠️ Service non reconnu (${settings.service}), utilisation du service local`);
            }
            return LocalMediaService.getInstance(MediaServiceFactory.app);
        }

        switch (settings.service) {
            case 'cloudinary':
                return CloudinaryService.getInstance();
            case 'cloudflare':
                return CloudflareMediaService.getInstance();
            case 'bunny':
                return BunnyService.getInstance();
            default:
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