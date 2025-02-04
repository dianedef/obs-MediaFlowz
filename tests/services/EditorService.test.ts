import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EditorService } from '../../src/services/EditorService';
import { EventBusService } from '../../src/services/EventBusService';
import { ErrorService } from '../../src/services/ErrorService';
import { EventName } from '../../src/types/events';
import { Editor } from 'obsidian';

// Mock des services
vi.mock('../../src/services/EventBusService', () => ({
    EventBusService: {
        getInstance: vi.fn().mockReturnValue({
            on: vi.fn(),
            emit: vi.fn(),
            off: vi.fn()
        })
    }
}));

describe('EditorService', () => {
    let editorService: EditorService;
    let eventBus: ReturnType<typeof EventBusService.getInstance>;
    let mockEditor: Partial<Editor>;
    let mockWorkspace: any;

    beforeEach(() => {
        // Reset les singletons
        // @ts-ignore - Accès aux propriétés privées pour les tests
        EditorService.instance = undefined;

        // Setup du mock editor
        mockEditor = {
            getCursor: vi.fn(() => ({ line: 0, ch: 0 })),
            getLine: vi.fn(() => ''),
            replaceRange: vi.fn(),
            setCursor: vi.fn()
        };

        // Setup du mock workspace
        mockWorkspace = {
            activeLeaf: {
                view: {
                    editor: mockEditor
                }
            }
        };

        // Mock global app
        (global as any).app = {
            workspace: mockWorkspace
        };

        // Setup des services
        eventBus = EventBusService.getInstance();
        editorService = EditorService.getInstance();

        // Réinitialiser les mocks
        vi.clearAllMocks();
    });

    it('should be a singleton', () => {
        const instance1 = EditorService.getInstance();
        const instance2 = EditorService.getInstance();
        expect(instance1).toBe(instance2);
    });

    it('should handle image upload and insert markdown', () => {
        editorService.insertMedia(
            mockEditor as Editor,
            'https://example.com/image.jpg',
            'image.jpg'
        );

        expect(mockEditor.replaceRange).toHaveBeenCalledWith(
            '![image.jpg](https://example.com/image.jpg)',
            expect.any(Object)
        );
    });

    it('should handle video upload and insert HTML', () => {
        editorService.insertMedia(
            mockEditor as Editor,
            'https://example.com/video.mp4',
            'video.mp4'
        );

        expect(mockEditor.replaceRange).toHaveBeenCalledWith(
            '<video src="https://example.com/video.mp4" controls title="video.mp4"></video>',
            expect.any(Object)
        );
    });

    it('should handle cursor position correctly', () => {
        // Test milieu de ligne
        mockEditor.getCursor = vi.fn(() => ({ line: 0, ch: 5 }));
        mockEditor.getLine = vi.fn(() => 'Hello world');

        editorService.insertMedia(
            mockEditor as Editor,
            'https://example.com/image.jpg',
            'image.jpg'
        );

        expect(mockEditor.replaceRange).toHaveBeenCalledWith(
            ' ![image.jpg](https://example.com/image.jpg) ',
            expect.any(Object)
        );

        // Test début de ligne
        mockEditor.getCursor = vi.fn(() => ({ line: 0, ch: 0 }));
        mockEditor.getLine = vi.fn(() => 'Hello');

        editorService.insertMedia(
            mockEditor as Editor,
            'https://example.com/image.jpg',
            'image.jpg'
        );

        expect(mockEditor.replaceRange).toHaveBeenCalledWith(
            '![image.jpg](https://example.com/image.jpg) ',
            expect.any(Object)
        );

        // Test fin de ligne
        mockEditor.getCursor = vi.fn(() => ({ line: 0, ch: 5 }));
        mockEditor.getLine = vi.fn(() => 'Hello');

        editorService.insertMedia(
            mockEditor as Editor,
            'https://example.com/image.jpg',
            'image.jpg'
        );

        expect(mockEditor.replaceRange).toHaveBeenCalledWith(
            ' ![image.jpg](https://example.com/image.jpg)',
            expect.any(Object)
        );
    });

    it('should not insert when no active editor', () => {
        // Simuler pas d'éditeur actif
        (global as any).app.workspace.activeLeaf = null;

        // Émettre l'événement MEDIA_UPLOADED
        eventBus.emit(EventName.MEDIA_UPLOADED, {
            url: 'https://example.com/image.jpg',
            fileName: 'image.jpg'
        });

        expect(mockEditor.replaceRange).not.toHaveBeenCalled();
    });
}); 