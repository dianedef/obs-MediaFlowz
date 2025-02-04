import { describe, it, expect, vi, beforeEach } from 'vitest';
import { App, Notice, Plugin } from 'obsidian';
import MediaFlowz from '../src/main';
import { DEFAULT_SETTINGS } from '../src/types/settings';
import { getTranslation } from '../src/core/Translations';
import { EventBusService } from '../src/services/EventBusService';
import { EventName } from '../src/types/events';
import manifest from '../manifest.json';

// Mock CloudinarySettingTab
vi.mock('@/ui/SettingsTab', () => ({
    CloudinarySettingTab: vi.fn().mockImplementation(function(app, plugin) {
        this.app = app;
        this.plugin = plugin;
        this.display = vi.fn();
        return this;
    })
}));

// Mock Plugin
vi.mock('obsidian', () => {
    const mockApp = {
        workspace: {
            on: vi.fn(),
            trigger: vi.fn(),
            activeLeaf: null,
            leftSplit: null,
            rightSplit: null,
            rootSplit: null,
            floatingSplit: null,
            containerEl: document.createElement('div')
        }
    };

    return {
        App: vi.fn(() => mockApp),
        Plugin: vi.fn().mockImplementation(function(app, manifest) {
            this.app = app;
            this.manifest = manifest;
            this.loadData = vi.fn().mockResolvedValue({});
            this.saveData = vi.fn().mockResolvedValue(undefined);
            this.addSettingTab = vi.fn();
            this.registerEvent = vi.fn();
        }),
        Notice: vi.fn(),
        PluginSettingTab: vi.fn(),
        moment: {
            locale: () => 'fr'
        }
    };
});

describe('MediaFlowz Plugin', () => {
    let app: App;
    let plugin: MediaFlowz;
    let eventBus: ReturnType<typeof EventBusService.getInstance>;

    beforeEach(async () => {
        vi.clearAllMocks();
        app = new App();
        plugin = new MediaFlowz(app, manifest);
        eventBus = EventBusService.getInstance();
        await plugin.onload();
    });

    describe('Settings Management', () => {
        it('should load default settings', async () => {
            expect(plugin.settings).toEqual(DEFAULT_SETTINGS);
        });

        it('should save settings', async () => {
            const newSettings = { ...DEFAULT_SETTINGS, cloudName: 'test-cloud' };
            plugin.settings = newSettings;
            await plugin.saveSettings();
            expect(plugin.saveData).toHaveBeenCalledWith(newSettings);
        });
    });

    describe('Translation System', () => {
        it('should return correct translation for existing key', () => {
            const translation = getTranslation('notices.mediaPasted');
            expect(translation).not.toBe('notices.mediaPasted');
            expect(typeof translation).toBe('string');
        });

        it('should handle nested translation keys correctly', () => {
            const translation = getTranslation('notices.mediaPasted');
            expect(translation).not.toBe('notices.mediaPasted');
            expect(typeof translation).toBe('string');
        });
    });

    describe('Event Handling', () => {
        let pasteCallback: (evt: ClipboardEvent) => void;

        beforeEach(() => {
            const mockWorkspace = app.workspace as any;
            mockWorkspace.on = vi.fn((event: string, callback: any) => {
                if (event === 'editor-paste') {
                    pasteCallback = callback;
                }
                return callback;
            });
        });

        it('should handle media paste events', async () => {
            const mockFile = new File([''], 'test.jpg', { type: 'image/jpeg' });
            const mockClipboardEvent = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer()
            });
            
            Object.defineProperty(mockClipboardEvent.clipboardData, 'files', {
                value: [mockFile],
                configurable: true
            });

            await pasteCallback(mockClipboardEvent);

            expect(eventBus.emit).toHaveBeenCalledWith(
                EventName.MEDIA_PASTED,
                expect.objectContaining({
                    files: expect.any(Object)
                })
            );
        });

        it('should handle video paste events', async () => {
            const mockFile = new File([''], 'test.mp4', { type: 'video/mp4' });
            const mockClipboardEvent = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer()
            });
            
            Object.defineProperty(mockClipboardEvent.clipboardData, 'files', {
                value: [mockFile],
                configurable: true
            });

            await pasteCallback(mockClipboardEvent);

            expect(eventBus.emit).toHaveBeenCalledWith(
                EventName.MEDIA_PASTED,
                expect.objectContaining({
                    files: expect.any(Object)
                })
            );
        });

        it('should not handle non-media paste events', async () => {
            const mockFile = new File([''], 'test.txt', { type: 'text/plain' });
            const mockClipboardEvent = new ClipboardEvent('paste', {
                clipboardData: new DataTransfer()
            });
            
            Object.defineProperty(mockClipboardEvent.clipboardData, 'files', {
                value: [mockFile],
                configurable: true
            });

            await pasteCallback(mockClipboardEvent);

            expect(eventBus.emit).not.toHaveBeenCalled();
        });
    });
}); 