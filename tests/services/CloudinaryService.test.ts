import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudinaryService } from '@/services/CloudinaryService';
import { EventName } from '@/types/events';
import { ErrorType } from '../mocks/services/ErrorService.mock';
import { http, HttpResponse } from 'msw';
import { server } from '../setup';

// Mock des services
vi.mock('@/services/ErrorService', () => ({
    ErrorService: {
        getInstance: vi.fn().mockReturnValue({
            handleError: vi.fn(),
            isNetworkError: vi.fn()
        })
    },
    ErrorType
}));

vi.mock('@/services/EventBusService', () => ({
    EventBusService: {
        getInstance: vi.fn().mockReturnValue({
            emit: vi.fn(),
            on: vi.fn()
        })
    }
}));

describe('CloudinaryService', () => {
    let cloudinaryService: CloudinaryService;
    let eventBus: any;
    let errorService: any;

    const mockSettings = {
        service: 'cloudinary',
        currentMode: 'tab',
        cloudinary: {
            cloudName: 'test-cloud',
            apiKey: 'test-key',
            apiSecret: 'test-secret',
            uploadPreset: '',
            folder: ''
        },
        bunnycdn: {
            storageZoneName: '',
            apiKey: '',
            region: '',
            pullZone: ''
        },
        ignoredFolders: [],
        ignoredFoldersSettings: {
            useNoteFolders: false
        },
        showImageToolbar: true,
        toolbarButtons: {
            copyImage: true,
            copyLink: true,
            fullscreen: true,
            openInDefaultApp: true,
            showInExplorer: true,
            revealInNavigation: true,
            renameImage: true,
            addCaption: true,
            resizeImage: true
        },
        enabledMediaTypes: {
            images: true,
            videos: true,
            gifs: true
        },
        defaultImageWidth: 'medium',
        enableAltScroll: true,
        mouseActions: {
            middleClick: {
                enabled: true,
                action: 'none'
            },
            rightClick: {
                enabled: true,
                action: 'none'
            }
        },
        imageOptimization: {
            mode: 'smart',
            smartMode: {
                maxSizeKb: 500,
                minQuality: 80,
                targetDPI: 72
            },
            manualMode: {
                quality: 80
            }
        },
        features: {
            imageResize: true
        }
    };

    beforeEach(() => {
        // Reset les mocks
        vi.clearAllMocks();

        // @ts-ignore - Accès à la propriété privée pour les tests
        CloudinaryService.instance = undefined;

        // Créer les mocks
        eventBus = {
            emit: vi.fn(),
            on: vi.fn()
        };

        errorService = {
            handleError: vi.fn(),
            isNetworkError: vi.fn()
        };

        // Setup du service
        cloudinaryService = CloudinaryService.getInstance();
    });

    it('should be a singleton', () => {
        const instance1 = CloudinaryService.getInstance();
        const instance2 = CloudinaryService.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should update settings when receiving SETTINGS_UPDATED event', () => {
        eventBus.emit(EventName.SETTINGS_UPDATED, { settings: mockSettings });
        
        // @ts-ignore - Accès aux propriétés privées pour les tests
        expect(cloudinaryService.settings).toEqual(mockSettings.cloudinary);
    });

    it('should handle configuration error when uploading without settings', async () => {
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const files = {
            0: file,
            length: 1,
            item: (index: number) => file
        } as unknown as FileList;

        eventBus.emit(EventName.MEDIA_PASTED, { files });
        
        // Attendre que les promesses soient résolues
        await new Promise(resolve => setTimeout(resolve, 0));

        // Vérifier que handleError a été appelé
        expect(errorService.handleError).toHaveBeenCalledWith(
            expect.objectContaining({
                type: ErrorType.CONFIG,
                message: 'errors.notConfigured'
            })
        );

        // Vérifier que l'événement d'erreur a été émis
        expect(eventBus.emit).toHaveBeenCalledWith(
            EventName.MEDIA_UPLOAD_ERROR,
            expect.objectContaining({
                error: expect.objectContaining({
                    type: ErrorType.CONFIG,
                    message: 'errors.notConfigured'
                }),
                fileName: 'test.jpg'
            })
        );
    });

    it('should handle successful file upload', async () => {
        // Setup du service avec les settings
        eventBus.emit(EventName.SETTINGS_UPDATED, { settings: mockSettings });

        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const files = {
            0: file,
            length: 1,
            item: (index: number) => file
        } as unknown as FileList;

        eventBus.emit(EventName.MEDIA_PASTED, { files });
        
        // Attendre que les promesses soient résolues
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(eventBus.emit).toHaveBeenCalledWith(
            EventName.MEDIA_UPLOADED,
            expect.objectContaining({
                url: expect.stringContaining('cloudinary.com'),
                fileName: 'test.jpg'
            })
        );
    });

    it('should handle upload errors', async () => {
        // Setup du mock pour simuler une erreur d'upload
        server.use(
            http.post('*/auto/upload', () => {
                return new HttpResponse(null, {
                    status: 400,
                    statusText: 'Invalid upload parameters'
                });
            })
        );

        // Setup du service avec les settings
        eventBus.emit(EventName.SETTINGS_UPDATED, { settings: mockSettings });

        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const files = {
            0: file,
            length: 1,
            item: (index: number) => file
        } as unknown as FileList;

        eventBus.emit(EventName.MEDIA_PASTED, { files });
        
        // Attendre que les promesses soient résolues
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(errorService.handleError).toHaveBeenCalledWith(
            expect.objectContaining({
                type: ErrorType.UPLOAD,
                message: expect.any(String),
                originalError: expect.any(Error)
            })
        );
    });

    it('should handle network errors', async () => {
        // Setup du mock pour simuler une erreur réseau
        server.use(networkErrorHandler);

        // Mock isNetworkError pour retourner true pour les erreurs réseau
        vi.mocked(errorService.isNetworkError).mockReturnValue(true);

        // Setup du service avec les settings
        eventBus.emit(EventName.SETTINGS_UPDATED, { settings: mockSettings });

        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        const files = {
            0: file,
            length: 1,
            item: (index: number) => file
        } as unknown as FileList;

        eventBus.emit(EventName.MEDIA_PASTED, { files });
        
        // Attendre que les promesses soient résolues
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(errorService.handleError).toHaveBeenCalledWith(
            expect.objectContaining({
                type: ErrorType.NETWORK,
                message: expect.any(String),
                originalError: expect.any(Error)
            })
        );
    });
}); 