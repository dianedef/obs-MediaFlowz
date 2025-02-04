import { DEFAULT_SETTINGS, type IPluginSettings } from '../types/settings';
import { EventBusService } from '../services/EventBusService';
import { EventName } from '../types/events';

export class SettingsService {
    private static instance: SettingsService;
    private settings: IPluginSettings;
    private eventBus: EventBusService;

    private constructor() {
        this.settings = { ...DEFAULT_SETTINGS };
        this.eventBus = EventBusService.getInstance();
    }

    static getInstance(): SettingsService {
        if (!SettingsService.instance) {
            SettingsService.instance = new SettingsService();
        }
        return SettingsService.instance;
    }

    getSettings(): IPluginSettings {
        return this.settings;
    }

    updateSettings(newSettings: Partial<IPluginSettings>): void {
        this.settings = {
            ...this.settings,
            ...newSettings,
            // Préserver les sous-objets de configuration
            cloudflare: {
                ...this.settings.cloudflare,
                ...newSettings.cloudflare
            },
            cloudinary: {
                ...this.settings.cloudinary,
                ...newSettings.cloudinary
            },
            twicpics: {
                ...this.settings.twicpics,
                ...newSettings.twicpics
            }
        };

        console.log('[SettingsService] Paramètres mis à jour:', {
            service: this.settings.service,
            hasCloudflareConfig: !!this.settings.cloudflare,
            cloudflareAccountId: this.settings.cloudflare?.accountId,
            hasCloudflareToken: !!this.settings.cloudflare?.imagesToken
        });

        this.eventBus.emit(EventName.SETTINGS_UPDATED, { settings: this.settings });
    }

    public static cleanup(): void {
        if (SettingsService.instance) {
            SettingsService.instance = null as unknown as SettingsService;
        }
    }
} 